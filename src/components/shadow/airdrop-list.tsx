"use client";
import Link from "next/link";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type StoredAirdrop = { campaign: string; airdrop: string; token: string; endAt: number; total: string; claims: { recipient: string }[] };

export function AirdropList() {
  const [airdrops, setAirdrops] = useState<StoredAirdrop[]>([]);
  useEffect(() => {
    const load = () => setAirdrops(JSON.parse(localStorage.getItem("shadowdrop:airdrops") || "[]"));
    load();
    window.addEventListener("shadowdrop:airdrops-updated", load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener("shadowdrop:airdrops-updated", load); window.removeEventListener("storage", load); };
  }, []);
  return <section className="dashboardGrid">
    <div className="infoCard large">
      <h2>Available airdrops</h2>
      <p>These airdrops are saved locally in this browser after creation. No database is used. Open one to connect your wallet, check eligibility, and claim privately.</p>
      <Link className="primaryLink" href="/airdrops/create">Create a new airdrop</Link>
    </div>
    <div className="infoCard large">
      <h3>Claimable campaigns</h3>
      <div className="list">
        {airdrops.length === 0 && <div className="emptyMini"><ShieldCheck/><b>No local airdrops yet</b><span>Create an airdrop from this browser and it will appear here.</span></div>}
        {airdrops.map((drop) => <Link key={drop.airdrop} href={`/airdrops/${drop.airdrop}`}>
          <span><Clock size={14}/> {new Date(drop.endAt * 1000).toLocaleDateString()}</span>
          <code>{drop.campaign}<br/>{drop.airdrop}</code>
          <ArrowRight size={14}/>
        </Link>)}
      </div>
    </div>
  </section>;
}
