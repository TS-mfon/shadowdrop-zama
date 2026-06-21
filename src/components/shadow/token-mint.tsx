"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ArrowRight } from "lucide-react";
import { getAddress, parseUnits } from "viem";
import { shadowTokenAbi } from "@/lib/shadow-abis";
import { humanError, normalizeAddress } from "@/lib/shadow-config";

export function TokenMint() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [token, setToken] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("1000000");
  const [status, setStatus] = useState("Mint encrypted token supply to the issuer wallet before creating an airdrop.");
  const [busy, setBusy] = useState(false);

  async function mint() {
    if (!address || !walletClient || !publicClient) return setStatus("Connect the token minter wallet.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      return;
    }
    setBusy(true);
    try {
      const tokenAddress = normalizeAddress(token, "token");
      const recipient = to.trim() ? normalizeAddress(to, "recipient") : getAddress(address);
      const raw = parseUnits(amount, 6);
      if (raw <= 0n || raw > 2n ** 64n - 1n) throw new Error("Mint amount must fit euint64 with 6 decimals.");
      setStatus("Submitting encrypted supply mint…");
      const hash = await walletClient.writeContract({ address: tokenAddress, abi: shadowTokenAbi, functionName: "mint", args: [recipient, BigInt(raw)], account: address, chain: sepolia });
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus(`Mint confirmed: ${amount} tokens to ${recipient}. Tx ${hash.slice(0, 10)}…`);
    } catch (error) {
      setStatus(humanError(error));
    } finally {
      setBusy(false);
    }
  }

  return <section className="panelGrid">
    <div className="cardForm">
      <div className="eyebrow">STEP 2 / MINT</div>
      <h2>Mint issuer supply</h2>
      <p>Mint enough confidential token supply to the authorized issuer wallet. The airdrop creation step then locks/funds those tokens into TokenOps.</p>
      <label>Token address<input value={token} onChange={(e) => setToken(e.target.value)} placeholder="0x…" /></label>
      <label>Recipient wallet<input value={to} onChange={(e) => setTo(e.target.value)} placeholder="defaults to connected wallet" /></label>
      <label>Amount<input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      <button className="primary" disabled={!address || busy} onClick={mint}>{busy ? "Minting…" : "Mint encrypted supply"} <ArrowRight size={16}/></button>
    </div>
    <div className="infoCard"><h3>Minting rules</h3><p>Only the token admin/minter can mint. Amounts use 6 decimals and must fit the FHE euint64 range.</p><div className="statusBox"><small>Status</small><b>{status}</b></div></div>
  </section>;
}

