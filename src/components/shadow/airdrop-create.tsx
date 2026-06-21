"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ArrowRight, FileSpreadsheet, Upload } from "lucide-react";
import { createSepoliaEncryptorWeb, setOperator } from "@tokenops/sdk/fhe";
import { createConfidentialAirdropFactoryClient, encryptUint64, signClaimAuthorization } from "@tokenops/sdk/fhe-airdrop";
import { getAddress, keccak256, stringToHex } from "viem";
import { humanError, parseAllocationCsv, shadowContracts, type AllocationRow, formatUnits6, normalizeAddress } from "@/lib/shadow-config";
import { shadowRegistryAbi } from "@/lib/shadow-abis";

export function AirdropCreate() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [campaignName, setCampaignName] = useState("Genesis encrypted airdrop");
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("Upload a CSV to validate allocations.");
  const [busy, setBusy] = useState(false);

  async function readCsv(file?: File) {
    if (!file) return;
    const parsed = parseAllocationCsv(await file.text());
    setRows(parsed.rows);
    setErrors(parsed.errors);
    setStatus(parsed.errors.length ? `CSV loaded with ${parsed.errors.length} issue(s). Fix before deploying.` : `CSV valid: ${parsed.rows.length} recipients.`);
  }

  async function createAirdrop() {
    if (!address || !publicClient || !walletClient) return setStatus("Connect the issuer wallet.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      return;
    }
    if (!rows.length || errors.length) return setStatus("Upload a valid CSV before creating the airdrop.");
    let encryptor: Awaited<ReturnType<typeof createSepoliaEncryptorWeb>> | undefined;
    setBusy(true);
    try {
      const tokenAddress = normalizeAddress(token, "token");
      const code = await publicClient.getBytecode({ address: tokenAddress });
      if (!code) throw new Error("Token address has no Sepolia bytecode.");
      const now = Math.floor(Date.now() / 1000);
      const totalRaw = rows.reduce((total, row) => total + row.rawAmount, 0n);
      const salt = keccak256(stringToHex(`${campaignName}:${address}:${Date.now()}`));
      setStatus("Authorizing TokenOps airdrop factory to lock/fund tokens…");
      await setOperator({ publicClient, walletClient, token: tokenAddress, spender: shadowContracts.tokenOpsAirdropFactory, account: address, deadline: BigInt(now + 45 * 86400) });
      setStatus("Initializing Zama encryptor in this browser…");
      encryptor = await createSepoliaEncryptorWeb({ publicClient, walletClient });
      const factory = createConfidentialAirdropFactoryClient({ publicClient, walletClient, encryptor });
      setStatus("Creating and funding TokenOps confidential airdrop…");
      const result = await factory.createAndFundConfidentialAirdrop({
        params: { token: tokenAddress, startTimestamp: now, endTimestamp: now + 30 * 86400, canExtendClaimWindow: true, admin: getAddress(address) },
        userSalt: salt,
        amount: totalRaw,
        account: address,
      });
      setStatus("Generating recipient-bound encrypted claim authorizations…");
      const claims = [];
      for (const row of rows) {
        const encryptedInput = await encryptUint64({ encryptor, contractAddress: result.airdrop, userAddress: row.address, value: row.rawAmount });
        const signature = await signClaimAuthorization({ walletClient, airdropAddress: result.airdrop, recipient: row.address, encryptedAmountHandle: encryptedInput.handle });
        claims.push({ airdrop: result.airdrop, recipient: row.address, amountLabel: row.amount, ...encryptedInput, signature });
      }
      setStatus("Registering campaign in ShadowDrop registry…");
      await walletClient.writeContract({
        address: shadowContracts.registry,
        abi: shadowRegistryAbi,
        functionName: "registerCampaign",
        args: [result.airdrop, tokenAddress, 0, BigInt(now), BigInt(now + 30 * 86400), keccak256(stringToHex(campaignName))],
        account: address,
        chain: sepolia,
      });
      const payload = { version: 1, campaign: campaignName, token: tokenAddress, chainId: sepolia.id, total: formatUnits6(totalRaw), claims };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${campaignName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-claim-authorizations.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus(`Airdrop live and funded at ${result.airdrop}. Claim authorization file downloaded.`);
    } catch (error) {
      setStatus(humanError(error));
    } finally {
      encryptor?.terminate();
      setBusy(false);
    }
  }

  const totalRaw = rows.reduce((total, row) => total + row.rawAmount, 0n);
  return <section className="panelGrid wide">
    <div className="cardForm">
      <div className="eyebrow">STEP 3 / AIRDROP</div>
      <h2>Create, fund, and lock an encrypted airdrop</h2>
      <p>ShadowDrop uses TokenOps to deploy/fund the airdrop contract. Allocations are encrypted locally and recipient claim authorizations are exported.</p>
      <label>Campaign name<input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} /></label>
      <label>Confidential token address<input value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" /></label>
      <div className="drop"><FileSpreadsheet /><strong>Upload allocation CSV</strong><p>Columns: address,amount. Duplicates, malformed addresses, and invalid amounts are rejected.</p><label className="upload"><Upload size={15}/> Select CSV<input type="file" accept=".csv,text/csv" onChange={(e) => readCsv(e.target.files?.[0])}/></label></div>
      <button className="primary" disabled={!address || busy || !rows.length || Boolean(errors.length)} onClick={createAirdrop}>{busy ? "Encrypting and funding…" : "Create funded airdrop"} <ArrowRight size={16}/></button>
    </div>
    <div className="infoCard">
      <h3>Preflight</h3>
      <div className="summary compact"><div><small>Recipients</small><strong>{rows.length}</strong></div><div><small>Total</small><strong>{formatUnits6(totalRaw)}</strong></div><div><small>CSV errors</small><strong>{errors.length}</strong></div></div>
      {errors.length > 0 && <ul className="errorList">{errors.slice(0, 6).map((error) => <li key={error}>{error}</li>)}</ul>}
      <div className="preview">{rows.slice(0, 5).map((row, index) => <div key={row.address}><span>{index + 1}</span><code>{row.address.slice(0, 10)}…{row.address.slice(-6)}</code><b>{row.amount}</b></div>)}</div>
      <div className="statusBox"><small>Status</small><b>{status}</b></div>
    </div>
  </section>;
}

