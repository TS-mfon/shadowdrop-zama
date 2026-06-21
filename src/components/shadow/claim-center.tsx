"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ArrowRight, Upload } from "lucide-react";
import { createConfidentialAirdropClient } from "@tokenops/sdk/fhe-airdrop";
import { getAddress, type Address, type Hex } from "viem";
import { humanError, normalizeAddress } from "@/lib/shadow-config";

type ClaimPayload = { airdrop: Address; recipient: Address; handle: Hex; inputProof: Hex; signature: Hex; amountLabel?: string };

export function ClaimCenter({ airdropHint }: { airdropHint?: string }) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [claim, setClaim] = useState<ClaimPayload | null>(null);
  const [status, setStatus] = useState("Import your authorization file to check eligibility.");
  const [busy, setBusy] = useState(false);

  async function readClaim(file?: File) {
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const claims = Array.isArray(json.claims) ? json.claims : [json];
      const found = claims.find((item: { recipient?: string; airdrop?: string }) => {
        const walletMatches = address ? item.recipient?.toLowerCase() === address.toLowerCase() : true;
        const airdropMatches = airdropHint ? item.airdrop?.toLowerCase() === airdropHint.toLowerCase() : true;
        return walletMatches && airdropMatches;
      });
      if (!found) throw new Error(address ? "No authorization found for the connected wallet." : "Connect wallet to select the matching authorization.");
      const parsed = {
        airdrop: normalizeAddress(found.airdrop, "airdrop"),
        recipient: normalizeAddress(found.recipient, "recipient"),
        handle: found.handle,
        inputProof: found.inputProof,
        signature: found.signature,
        amountLabel: found.amountLabel,
      };
      setClaim(parsed);
      setStatus(`Eligible authorization loaded for ${parsed.recipient}. Public amount remains hidden.`);
    } catch (error) {
      setStatus(humanError(error));
    }
  }

  async function claimAllocation() {
    if (!claim || !address || !publicClient || !walletClient) return setStatus("Connect wallet and load a claim file first.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      return;
    }
    if (getAddress(address) !== claim.recipient) return setStatus("Connected wallet does not match this private authorization.");
    setBusy(true);
    try {
      const code = await publicClient.getBytecode({ address: claim.airdrop });
      if (!code) throw new Error("Airdrop contract has no Sepolia bytecode.");
      const client = createConfidentialAirdropClient({ publicClient, walletClient, address: claim.airdrop });
      setStatus("Validating TokenOps signature without revealing amount…");
      const valid = await client.isSignatureValid({ encryptedAmountHandle: claim.handle, signature: claim.signature, caller: address });
      if (!valid) throw new Error("Claim authorization is invalid or already used.");
      setStatus("Submitting encrypted claim…");
      const hash = await client.claim({ encryptedInput: { handle: claim.handle, inputProof: claim.inputProof }, signature: claim.signature, account: address });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(`Claim confirmed. Tx ${hash.slice(0, 10)}…`);
    } catch (error) {
      setStatus(humanError(error));
    } finally {
      setBusy(false);
    }
  }

  return <section className="panelGrid">
    <div className="cardForm">
      <div className="eyebrow">RECIPIENT FLOW</div>
      <h2>Check eligibility and claim privately</h2>
      <p>Eligibility is proven with a recipient-bound authorization. The encrypted amount handle/proof is submitted to TokenOps; observers do not see the amount.</p>
      <label className="upload block"><Upload size={15}/> Import authorization JSON<input type="file" accept="application/json" onChange={(e) => readClaim(e.target.files?.[0])}/></label>
      <button className="primary" disabled={!claim || !address || busy} onClick={claimAllocation}>{busy ? "Claiming…" : "Validate & claim"} <ArrowRight size={16}/></button>
    </div>
    <div className="infoCard">
      <h3>Eligibility</h3>
      <div className="statusBox"><small>Status</small><b>{status}</b></div>
      {claim && <div className="kv"><span>Airdrop</span><code>{claim.airdrop}</code><span>Recipient</span><code>{claim.recipient}</code><span>Encrypted amount</span><b>{claim.amountLabel ? "loaded privately" : "hidden"}</b></div>}
    </div>
  </section>;
}

