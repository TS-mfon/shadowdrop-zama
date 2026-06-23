"use client";
import Link from "next/link";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type StoredAirdrop = { campaign: string; airdrop: string; token: string; endAt: number; total: string; claims: { recipient: string }[] };

export function AirdropList() {
  const [airdrops, setAirdrops] = useState<StoredAirdrop[]>([]);
  const [status, setStatus] = useState("Loading global airdrops…");
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const response = await fetch("/api/airdrops", { cache: "no-store" });
        const body = await response.json() as { ok?: boolean; data?: StoredAirdrop[]; error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error || "Could not load airdrops.");
        if (!ignore) {
          setAirdrops(body.data ?? []);
          setStatus((body.data ?? []).length ? "Global airdrops loaded." : "No global airdrops published yet.");
        }
      } catch (error) {
        if (!ignore) setStatus(error instanceof Error ? error.message : "Could not load airdrops.");
      }
    }
    void load();
    return () => { ignore = true; };
  }, []);
  return <section className="dashboardGrid">
    <div className="infoCard large">
      <h2>Available airdrops</h2>
      <p>These airdrops are loaded from shared Vercel Blob storage. Open one to connect your wallet, check eligibility, and claim privately.</p>
      <Link className="primaryLink" href="/airdrops/create">Create a new airdrop</Link>
    </div>
    <div className="infoCard large">
      <h3>Claimable campaigns</h3>
      <p className="fineprint">{status}</p>
      <div className="list">
        {airdrops.length === 0 && <div className="emptyMini"><ShieldCheck/><b>No published airdrops yet</b><span>Create and fund an airdrop and it will appear here for everyone.</span></div>}
        {airdrops.map((drop) => <Link key={drop.airdrop} href={`/airdrops/${drop.airdrop}`}>
          <span><Clock size={14}/> {new Date(drop.endAt * 1000).toLocaleDateString()}</span>
          <code>{drop.campaign}<br/>{drop.airdrop}</code>
          <ArrowRight size={14}/>
        </Link>)}
      </div>
    </div>
  </section>;
}
