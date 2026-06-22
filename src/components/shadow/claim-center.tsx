"use client";
import { useMemo, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ArrowRight, ShieldCheck, XCircle } from "lucide-react";
import { createConfidentialAirdropClient } from "@tokenops/sdk/fhe-airdrop";
import { getAddress, type Address, type Hex } from "viem";
import { humanError, normalizeAddress } from "@/lib/shadow-config";

type ClaimPayload = { airdrop: Address; recipient: Address; handle: Hex; inputProof: Hex; signature: Hex; amountLabel?: string };
type StoredAirdrop = { campaign: string; airdrop: Address; token: Address; endAt: number; claims: ClaimPayload[] };

export function ClaimCenter({ airdropHint }: { airdropHint?: string }) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [claim, setClaim] = useState<ClaimPayload | null>(null);
  const drop = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored: StoredAirdrop[] = JSON.parse(localStorage.getItem("shadowdrop:airdrops") || "[]");
      return airdropHint ? stored.find((item) => item.airdrop.toLowerCase() === airdropHint.toLowerCase()) ?? null : stored[0] ?? null;
    } catch {
      return null;
    }
  }, [airdropHint]);
  const [status, setStatus] = useState("Connect your wallet to check this airdrop.");
  const [busy, setBusy] = useState(false);

  function checkEligibility() {
    if (!address) return setStatus("Connect wallet first.");
    if (!drop) return setStatus("No local airdrop metadata found for this campaign.");
    const found = drop.claims.find((item) => item.recipient.toLowerCase() === address.toLowerCase());
    if (!found) {
      setClaim(null);
      return setStatus("Ineligible: this connected wallet is not in the encrypted authorization set.");
    }
    const parsed = { ...found, airdrop: normalizeAddress(found.airdrop, "airdrop"), recipient: normalizeAddress(found.recipient, "recipient") };
    setClaim(parsed);
    setStatus("Eligible. Your encrypted claim authorization is ready; the allocation amount stays private.");
  }

  async function claimAllocation() {
    if (!claim || !address || !publicClient || !walletClient) return setStatus("Connect wallet and check eligibility first.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      setStatus("Switched to Sepolia. Click claim again after the wallet finishes switching.");
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
      <p>Select an airdrop from the airdrops page, connect your wallet, and check eligibility. No upload or database is used; this browser reads the locally saved encrypted authorization package.</p>
      {drop && <div className="campaignTile"><small>AIRDROP</small><b>{drop.campaign}</b><code>{drop.airdrop}</code><span>Claim deadline: {new Date(drop.endAt * 1000).toLocaleString()}</span></div>}
      <div className="ctaRow"><button type="button" className="secondaryLink" onClick={checkEligibility}>Check eligibility</button><button className="primary" disabled={!claim || !address || busy} onClick={claimAllocation}>{busy ? "Claiming…" : "Claim encrypted tokens"} <ArrowRight size={16}/></button></div>
    </div>
    <div className="infoCard">
      <h3>Eligibility</h3>
      <div className="statusBox"><small>Status</small><b>{status}</b></div>
      {claim ? <div className="eligibility ok"><ShieldCheck/><b>Eligible</b><span>Amount encrypted with Zama/TokenOps</span></div> : <div className="eligibility"><XCircle/><b>Not checked or ineligible</b><span>Connect the wallet that was added by the issuer.</span></div>}
      {claim && <div className="kv"><span>Airdrop</span><code>{claim.airdrop}</code><span>Recipient</span><code>{claim.recipient}</code><span>Encrypted amount</span><b>{claim.amountLabel ? "available only to claim flow" : "hidden"}</b></div>}
    </div>
  </section>;
}
