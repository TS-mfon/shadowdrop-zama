"use client";
import { useState } from "react";
import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { encodeDeployData, encodeFunctionData, getAddress, getContractAddress, parseUnits } from "viem";
import { shadowTokenAbi, shadowTokenBytecode } from "@/lib/shadow-abis";
import { formatUnits6, humanError } from "@/lib/shadow-config";

export function TokenCreate() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();
  const [name, setName] = useState("Shadow Token");
  const [symbol, setSymbol] = useState("SHADOW");
  const [supply, setSupply] = useState("100000000");
  const [status, setStatus] = useState("Ready to deploy a Zama confidential token.");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function deployToken() {
    if (!address || !publicClient) return setStatus("Connect wallet from the top-right button first, then deploy.");
    const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) return setStatus("No injected wallet found. Open in a browser with MetaMask/Rabby.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      setStatus("Switched to Sepolia. Click deploy again after the wallet finishes switching.");
      return;
    }
    setBusy(true);
    try {
      const activeAddress = getAddress(address);
      setStatus("Preparing confidential token deployment…");
      const maxSupply = parseUnits(supply, 6);
      if (maxSupply <= 0n || maxSupply > 2n ** 64n - 1n) throw new Error("Max supply must fit euint64 with 6 decimals.");
      const nonce = await publicClient.getTransactionCount({ address: activeAddress });
      const predicted = getContractAddress({ from: activeAddress, nonce: BigInt(nonce) });
      const data = encodeDeployData({ abi: shadowTokenAbi, bytecode: shadowTokenBytecode, args: [name.trim(), symbol.trim().toUpperCase(), BigInt(maxSupply), activeAddress] });
      const hash = await ethereum.request({ method: "eth_sendTransaction", params: [{ from: activeAddress, data }] }) as `0x${string}`;
      setStatus("Waiting for token deployment confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      setToken(predicted);
      try {
        localStorage.setItem("shadowdrop:lastToken", predicted);
        localStorage.setItem("shadowdrop:lastTokenSymbol", symbol.trim().toUpperCase());
      } catch {}
      setStatus("Token deployed. Minting encrypted issuer supply in the same setup flow…");
      try {
        const mintData = encodeFunctionData({ abi: shadowTokenAbi, functionName: "mint", args: [activeAddress, BigInt(maxSupply)] });
        const mintHash = await ethereum.request({ method: "eth_sendTransaction", params: [{ from: activeAddress, to: predicted, data: mintData }] }) as `0x${string}`;
        await publicClient.waitForTransactionReceipt({ hash: mintHash });
        const inventory = JSON.parse(localStorage.getItem("shadowdrop:tokens") || "[]");
        const record = { address: predicted, name: name.trim(), symbol: symbol.trim().toUpperCase(), maxSupply: maxSupply.toString(), available: maxSupply.toString(), locked: "0", owner: activeAddress, createdAt: Date.now() };
        localStorage.setItem("shadowdrop:tokens", JSON.stringify([record, ...inventory.filter((item: { address?: string }) => item.address?.toLowerCase() !== predicted.toLowerCase())]));
        window.dispatchEvent(new Event("shadowdrop:tokens-updated"));
        setStatus(`Token deployed at ${predicted}. Full configured supply was minted privately to your issuer wallet. Use it to create a funded airdrop.`);
      } catch (mintError) {
        setStatus(`Token deployed at ${predicted}, but issuer-supply mint failed: ${humanError(mintError)}. The token address was saved; retry token creation only if you want a fresh token.`);
      }
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
      <p>The deployed token exposes ERC-7984-style operator permissions used by TokenOps airdrop contracts. This page deploys the token and then mints the full configured supply privately to your issuer wallet.</p>
      <label>Token name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Symbol<input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label>
      <label>Max supply<input inputMode="decimal" value={supply} onChange={(e) => setSupply(e.target.value)} /></label>
      <small className="fineprint">Supply preview: {(() => { try { return formatUnits6(parseUnits(supply || "0", 6)); } catch { return "invalid"; } })()} {symbol || "tokens"}</small>
      <button className="primary" disabled={busy} onClick={deployToken}>{busy ? "Deploying…" : address ? "Deploy confidential token" : "Connect & deploy confidential token"} <ArrowRight size={16}/></button>
    </div>
    <div className="infoCard">
      <ShieldCheck />
      <h3>What this creates</h3>
      <p>A Sepolia confidential token controlled by your wallet. You authorize TokenOps and lock/fund the required amount when creating the airdrop; no separate database or mint page is needed.</p>
      <div className="statusBox"><small>Status</small><b>{status}</b></div>
      {token && <a className="textLink" target="_blank" href={`https://sepolia.etherscan.io/address/${token}`}>{token}</a>}
    </div>
  </section>;
}
