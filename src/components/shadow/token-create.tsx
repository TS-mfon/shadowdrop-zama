"use client";
import { useState } from "react";
import { useAccount, useConnect, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
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
  const { connectAsync, connectors } = useConnect();
  const [name, setName] = useState("Shadow Token");
  const [symbol, setSymbol] = useState("SHADOW");
  const [supply, setSupply] = useState("100000000");
  const [status, setStatus] = useState("Ready to deploy a Zama confidential token.");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  async function deployToken() {
    let activeAddress = address;
    let activeWalletClient = walletClient;
    if (!activeAddress || !activeWalletClient) {
      try {
        setStatus("Opening wallet connection…");
        const result = await connectAsync({ connector: connectors[0] });
        activeAddress = result.accounts[0];
        setStatus("Wallet connected. Click deploy again once the wallet signer is ready.");
        return;
      } catch (error) {
        return setStatus(humanError(error));
      }
    }
    if (!activeAddress || !publicClient) return setStatus("Wallet connected, but the app could not read the account. Refresh and reconnect.");
    if (chainId !== sepolia.id) {
      await switchChain({ chainId: sepolia.id });
      setStatus("Switched to Sepolia. Click deploy again after the wallet finishes switching.");
      return;
    }
    setBusy(true);
    try {
      activeWalletClient = activeWalletClient ?? walletClient;
      if (!activeWalletClient) throw new Error("Wallet signer is not ready yet. Wait a second and click deploy again.");
      setStatus("Preparing confidential token deployment…");
      const maxSupply = parseUnits(supply, 6);
      if (maxSupply <= 0n || maxSupply > 2n ** 64n - 1n) throw new Error("Max supply must fit euint64 with 6 decimals.");
      const nonce = await publicClient.getTransactionCount({ address: activeAddress });
      const predicted = getContractAddress({ from: activeAddress, nonce: BigInt(nonce) });
      const data = encodeDeployData({ abi: shadowTokenAbi, bytecode: shadowTokenBytecode, args: [name.trim(), symbol.trim().toUpperCase(), BigInt(maxSupply), activeAddress] });
      const hash = await activeWalletClient.sendTransaction({ account: activeAddress, chain: sepolia, data });
      setStatus("Waiting for token deployment confirmation…");
      await publicClient.waitForTransactionReceipt({ hash });
      setToken(predicted);
      try {
        localStorage.setItem("shadowdrop:lastToken", predicted);
        localStorage.setItem("shadowdrop:lastTokenSymbol", symbol.trim().toUpperCase());
      } catch {}
      setStatus("Token deployed. Minting encrypted issuer supply in the same setup flow…");
      try {
        const mintHash = await activeWalletClient.writeContract({ address: predicted, abi: shadowTokenAbi, functionName: "mint", args: [activeAddress, BigInt(maxSupply)], account: activeAddress, chain: sepolia });
        await publicClient.waitForTransactionReceipt({ hash: mintHash });
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
