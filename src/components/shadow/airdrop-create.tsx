"use client";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { createSepoliaEncryptorWeb, setOperator } from "@tokenops/sdk/fhe";
import { createConfidentialAirdropFactoryClient, encryptUint64, signClaimAuthorization } from "@tokenops/sdk/fhe-airdrop";
import { getAddress, keccak256, stringToHex, type Address, type Hex } from "viem";
import { humanError, shadowContracts, type AllocationRow, formatUnits6, normalizeAddress, parseTokenAmount } from "@/lib/shadow-config";
import { shadowRegistryAbi } from "@/lib/shadow-abis";

type DraftRow = { id: string; address: string; amount: string };
type TokenRecord = { address: string; name: string; symbol: string; maxSupply: string; owner: string; createdAt: number };
type ClaimsApiResponse = { ok?: boolean; error?: string; data?: unknown };

export function AirdropCreate() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [campaignName, setCampaignName] = useState("Genesis encrypted airdrop");
  const [token, setToken] = useState("");
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [lockAmount, setLockAmount] = useState("");
  const [deadlineDays, setDeadlineDays] = useState("30");
  const [draftRows, setDraftRows] = useState<DraftRow[]>([{ id: crypto.randomUUID(), address: "", amount: "" }]);
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("Enter eligible wallets and token amounts. The funded airdrop will be published to shared Vercel Blob storage.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!address) {
        if (!ignore) setTokens([]);
        return;
      }
      try {
        const response = await fetch(`/api/tokens?owner=${address}&chainId=${sepolia.id}`, { cache: "no-store" });
        const body = await response.json() as { ok?: boolean; data?: TokenRecord[]; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error || "Could not load issuer tokens.");
        if (ignore) return;
        const mine = body.data ?? [];
        setTokens(mine);
        if (!token && mine[0]) setToken(mine[0].address);
      } catch (error) {
        if (!ignore) setStatus(humanError(error));
      }
    };
    void load();
    return () => { ignore = true; };
  }, [address, token]);

  const selectedToken = tokens.find((item) => item.address.toLowerCase() === token.toLowerCase());

  function updateRow(id: string, key: keyof Omit<DraftRow, "id">, value: string) {
    setDraftRows((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  }

  function addRow() {
    setDraftRows((items) => [...items, { id: crypto.randomUUID(), address: "", amount: "" }]);
  }

  function removeRow(id: string) {
    setDraftRows((items) => items.length === 1 ? items : items.filter((item) => item.id !== id));
  }

  function validateRows() {
    const parsedRows: AllocationRow[] = [];
    const validationErrors: string[] = [];
    const seen = new Set<string>();
    draftRows.forEach((row, index) => {
      const rowNumber = index + 1;
      if (!row.address.trim() && !row.amount.trim()) return;
      try {
        const recipient = normalizeAddress(row.address, `row ${rowNumber} wallet`);
        const key = recipient.toLowerCase();
        if (seen.has(key)) throw new Error(`row ${rowNumber} duplicates ${recipient}.`);
        seen.add(key);
        parsedRows.push({ address: recipient, amount: row.amount.trim(), rawAmount: parseTokenAmount(row.amount, `row ${rowNumber} amount`) });
      } catch (error) {
        validationErrors.push(error instanceof Error ? error.message : `row ${rowNumber} is invalid.`);
      }
    });
    setRows(parsedRows);
    setErrors(validationErrors);
    const totalRaw = parsedRows.reduce((total, row) => total + row.rawAmount, 0n);
    if (!lockAmount && totalRaw > 0n) setLockAmount(formatUnits6(totalRaw));
    setStatus(validationErrors.length ? `Fix ${validationErrors.length} row issue(s) before creating the airdrop.` : `Validated ${parsedRows.length} eligible wallet(s), total ${formatUnits6(totalRaw)}.`);
    return { parsedRows, validationErrors };
  }

  async function createAirdrop() {
    if (!address || !publicClient || !walletClient) return setStatus("Connect the issuer wallet.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      setStatus("Switched to Sepolia. Click create again after the wallet finishes switching.");
      return;
    }
    const { parsedRows, validationErrors } = validateRows();
    if (!parsedRows.length || validationErrors.length) return;
    let encryptor: Awaited<ReturnType<typeof createSepoliaEncryptorWeb>> | undefined;
    setBusy(true);
    try {
      const tokenAddress = normalizeAddress(token, "token");
      const code = await publicClient.getBytecode({ address: tokenAddress });
      if (!code) throw new Error("Token address has no Sepolia bytecode.");
      const now = Math.floor(Date.now() / 1000);
      const days = Number(deadlineDays);
      if (!Number.isFinite(days) || days < 1 || days > 365) throw new Error("Claim window must be between 1 and 365 days.");
      const endAt = now + Math.floor(days * 86400);
      const totalRaw = parsedRows.reduce((total, row) => total + row.rawAmount, 0n);
      const lockRaw = parseTokenAmount(lockAmount || "0", "lock amount");
      if (lockRaw !== totalRaw) throw new Error(`Lock amount must exactly equal recipient total. Lock ${formatUnits6(totalRaw)} tokens for this airdrop.`);
      const salt = keccak256(stringToHex(`${campaignName}:${address}:${Date.now()}`));
      setStatus("Authorizing TokenOps airdrop factory to lock/fund tokens…");
      await setOperator({ publicClient, walletClient, token: tokenAddress, spender: shadowContracts.tokenOpsAirdropFactory, account: address, deadline: BigInt(now + 45 * 86400) });
      setStatus("Initializing Zama encryptor in this browser…");
      encryptor = await createSepoliaEncryptorWeb({ publicClient, walletClient });
      const factory = createConfidentialAirdropFactoryClient({ publicClient, walletClient, encryptor });
      setStatus("Creating and funding TokenOps confidential airdrop…");
      const result = await factory.createAndFundConfidentialAirdrop({
        params: { token: tokenAddress, startTimestamp: now, endTimestamp: endAt, canExtendClaimWindow: true, admin: getAddress(address) },
        userSalt: salt,
        amount: totalRaw,
        account: address,
      });
      setStatus("Generating recipient-bound encrypted claim authorizations…");
      const claims = [];
      for (const row of parsedRows) {
        const encryptedInput = await encryptUint64({ encryptor, contractAddress: result.airdrop, userAddress: row.address, value: row.rawAmount });
        const signature = await signClaimAuthorization({ walletClient, airdropAddress: result.airdrop, recipient: row.address, encryptedAmountHandle: encryptedInput.handle });
        claims.push({ airdrop: result.airdrop, recipient: row.address, amountLabel: row.amount, ...encryptedInput, signature });
      }
      setStatus("Registering campaign in ShadowDrop registry…");
      const registryTx = await walletClient.writeContract({
        address: shadowContracts.registry,
        abi: shadowRegistryAbi,
        functionName: "registerCampaign",
        args: [result.airdrop, tokenAddress, 0, BigInt(now), BigInt(endAt), keccak256(stringToHex(campaignName))],
        account: address,
        chain: sepolia,
      });
      await publicClient.waitForTransactionReceipt({ hash: registryTx });
      setStatus("Publishing airdrop metadata to shared storage…");
      const payload = {
        version: 1,
        campaign: campaignName,
        token: tokenAddress,
        airdrop: result.airdrop,
        issuer: getAddress(address),
        chainId: sepolia.id,
        startAt: now,
        endAt,
        total: formatUnits6(totalRaw),
        recipients: claims.length,
        createdAt: Date.now(),
        registryTx,
        claims: claims.map((claim) => ({
          airdrop: claim.airdrop as Address,
          recipient: claim.recipient as Address,
          handle: claim.handle as Hex,
          inputProof: claim.inputProof as Hex,
          signature: claim.signature as Hex,
        })),
      };
      const response = await fetch("/api/airdrops", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null) as ClaimsApiResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.error || "Airdrop was funded, but shared metadata could not be saved.");
      setStatus(`Airdrop live, funded, and globally available at ${result.airdrop}. Eligible wallets can claim from the airdrops page on any device.`);
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
      <p>ShadowDrop uses TokenOps to deploy/fund the airdrop contract. You enter eligible wallets here; claim authorizations are encrypted with Zama and published through shared Vercel Blob storage for global access.</p>
      <label>Campaign name<input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} /></label>
      {tokens.length > 0 && <label>Pick one of your deployed tokens<select value={token} onChange={(e) => setToken(e.target.value)}>{tokens.map((item) => <option key={item.address} value={item.address}>{item.symbol} · max supply {formatUnits6(BigInt(item.maxSupply))}</option>)}</select></label>}
      <label>Confidential token address<input value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" /></label>
      <label>Amount to lock in airdrop contract<input inputMode="decimal" value={lockAmount} onChange={(e) => setLockAmount(e.target.value)} placeholder="must equal recipient total" /></label>
      <label>Claim window in days<input inputMode="numeric" value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} /></label>
      <div className="allocator">
        <div className="allocatorHead"><strong>Eligible wallets</strong><button type="button" onClick={addRow}><Plus size={15}/> Add wallet</button></div>
        {draftRows.map((row, index) => <div className="allocRow" key={row.id}>
          <span>{index + 1}</span>
          <input placeholder="Wallet address 0x…" value={row.address} onChange={(e) => updateRow(row.id, "address", e.target.value)} />
          <input placeholder="Amount" inputMode="decimal" value={row.amount} onChange={(e) => updateRow(row.id, "amount", e.target.value)} />
          <button type="button" onClick={() => removeRow(row.id)}><Trash2 size={14}/></button>
        </div>)}
      </div>
      <div className="ctaRow"><button type="button" className="secondaryLink" onClick={validateRows}>Validate wallets</button><button className="primary" disabled={busy} onClick={createAirdrop}>{busy ? "Encrypting and funding…" : "Create funded airdrop"} <ArrowRight size={16}/></button></div>
    </div>
    <div className="infoCard">
      <h3>Preflight</h3>
      <div className="summary compact"><div><small>Recipients</small><strong>{rows.length}</strong></div><div><small>Total</small><strong>{formatUnits6(totalRaw)}</strong></div><div><small>Row errors</small><strong>{errors.length}</strong></div></div>
      {selectedToken && <div className="statusBox"><small>Selected token</small><b>{selectedToken.symbol} · configured supply {formatUnits6(BigInt(selectedToken.maxSupply))}</b></div>}
      {errors.length > 0 && <ul className="errorList">{errors.slice(0, 6).map((error) => <li key={error}>{error}</li>)}</ul>}
      <div className="preview">{rows.slice(0, 5).map((row, index) => <div key={row.address}><span>{index + 1}</span><code>{row.address.slice(0, 10)}…{row.address.slice(-6)}</code><b>{row.amount}</b></div>)}</div>
      <div className="statusBox"><small>Status</small><b>{status}</b></div>
      <p className="fineprint">No SQL database is used. Public airdrop metadata and recipient-bound encrypted claim authorizations are stored in Vercel Blob so users can access the campaign from any browser.</p>
    </div>
  </section>;
}
