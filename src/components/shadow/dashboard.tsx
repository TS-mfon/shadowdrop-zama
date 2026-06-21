"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { Plus, ShieldCheck } from "lucide-react";
import { shadowRegistryAbi } from "@/lib/shadow-abis";
import { shadowContracts } from "@/lib/shadow-config";

export function ShadowDashboard() {
  const { address } = useAccount();
  const { data: count } = useReadContract({ address: shadowContracts.registry, abi: shadowRegistryAbi, functionName: "campaignCount", args: address ? [address] : undefined, query: { enabled: Boolean(address) } });
  const indexes = Array.from({ length: Number(count ?? 0n) }, (_, index) => BigInt(index));
  const { data: ids } = useReadContracts({ contracts: indexes.map((index) => ({ address: shadowContracts.registry, abi: shadowRegistryAbi, functionName: "campaignAt", args: [address!, index] })), query: { enabled: Boolean(address && indexes.length) } });

  return <section className="dashboardGrid">
    <div className="infoCard large"><ShieldCheck/><h2>Issuer dashboard</h2><p>Create a token, mint supply, create/fund TokenOps airdrops, and give recipients a dedicated claim page.</p><div className="ctaRow"><Link className="primaryLink" href="/token/create"><Plus size={15}/> Create token</Link><Link className="primaryLink" href="/airdrops/create">Create airdrop</Link></div></div>
    <div className="infoCard large"><h3>Your registered airdrops</h3>{!address && <p>Connect issuer wallet to load registered campaigns.</p>}{address && indexes.length === 0 && <p>No campaigns registered for this wallet yet.</p>}<div className="list">{ids?.map((item, index) => <Link key={String(item.result)} href={`/airdrops/${String(item.result)}`}><span>Campaign {index + 1}</span><code>{String(item.result)}</code></Link>)}</div></div>
  </section>;
}

