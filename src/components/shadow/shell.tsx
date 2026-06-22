import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { WalletButton } from "./wallet-button";

const links = [
  ["Dashboard", "/dashboard"],
  ["Create token", "/token/create"],
  ["Airdrops", "/airdrops"],
  ["Create airdrop", "/airdrops/create"],
  ["Docs", "/docs"],
] as const;

export function ShadowShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <nav className="topnav">
        <Link className="brand" href="/"><span className="mark"><LockKeyhole size={18}/></span>SHADOWDROP</Link>
        <div className="navlinks">{links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
        <div className="navmeta"><span className="network">● SEPOLIA</span><WalletButton /></div>
      </nav>
      {children}
      <footer><Link className="brand" href="/">SHADOWDROP</Link><p>TokenOps-powered confidential token distribution on Zama.</p><span>Ethereum Sepolia</span></footer>
    </main>
  );
}

export function PageHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="pageHero"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></section>;
}
