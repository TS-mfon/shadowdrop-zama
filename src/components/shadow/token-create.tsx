"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { encodeDeployData, getContractAddress, parseUnits } from "viem";
import { shadowTokenAbi, shadowTokenBytecode } from "@/lib/shadow-abis";
import { humanError } from "@/lib/shadow-config";

export function TokenCreate() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [name, setName] = useState("Shadow Token");
  const [symbol, setSymbol] = useState("SHADOW");
  const [supply, setSupply] = useState("100000000");
  const [status, setStatus] = useState("Ready to deploy a Zama confidential token.");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function deployToken() {
    if (!address || !walletClient || !publicClient) return setStatus("Connect an issuer wallet first.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      return;
    }
    setBusy(true);
    try {
      setStatus("Preparing confidential token deployment…");
      const maxSupply = parseUnits(supply, 6);
      if (maxSupply <= 0n || maxSupply > 2n ** 64n - 1n) throw new Error("Max supply must fit euint64 with 6 decimals.");
      const nonce = await publicClient.getTransactionCount({ address });
      const predicted = getContractAddress({ from: address, nonce: BigInt(nonce) });
      const data = encodeDeployData({ abi: shadowTokenAbi, bytecode: shadowTokenBytecode, args: [name, symbol, BigInt(maxSupply), address] });
      const hash = await walletClient.sendTransaction({ account: address, chain: sepolia, data });
      setStatus("Waiting for token deployment confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      setToken(predicted);
      setStatus(`Token deployed at ${predicted}. Save this address, then mint supply.`);
    } catch (error) {
      setStatus(humanError(error));
    } finally {
      setBusy(false);
    }
  }

  return <section className="panelGrid">
    <div className="cardForm">
      <div className="eyebrow">STEP 1 / TOKEN</div>
      <h2>Create encrypted distribution token</h2>
      <p>The deployed token exposes ERC-7984-style operator permissions used by TokenOps airdrop contracts, while balances and transfers stay FHE encrypted.</p>
      <label>Token name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Symbol<input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label>
      <label>Max supply<input inputMode="decimal" value={supply} onChange={(e) => setSupply(e.target.value)} /></label>
      <button className="primary" disabled={!address || busy} onClick={deployToken}>{busy ? "Deploying…" : "Deploy confidential token"} <ArrowRight size={16}/></button>
    </div>
    <div className="infoCard">
      <ShieldCheck />
      <h3>What this creates</h3>
      <p>A Sepolia confidential token controlled by your wallet. You mint supply, authorize TokenOps, and lock/fund the airdrop contract before recipients claim.</p>
      <div className="statusBox"><small>Status</small><b>{status}</b></div>
      {token && <a className="textLink" target="_blank" href={`https://sepolia.etherscan.io/address/${token}`}>{token}</a>}
    </div>
  </section>;
}
