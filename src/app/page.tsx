import Link from "next/link";
import { ArrowRight, ShieldCheck, WalletCards, Users } from "lucide-react";
import { ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell>
    <section className="hero"><div><div className="eyebrow">CONFIDENTIAL TOKEN DISTRIBUTION OS</div><h1>Launch tokens.<br/><em>Drop privately.</em></h1><p>Create a confidential token, define eligible wallets in the browser, lock the required amount into a TokenOps encrypted airdrop, and let users claim without exposing allocation amounts.</p><div className="proof"><span><ShieldCheck/> Zama FHE encryption</span><span><WalletCards/> ERC-7984-style token</span><span><Users/> Recipient-bound claims</span></div><div className="ctaRow"><Link className="primaryLink" href="/dashboard">Open dashboard <ArrowRight size={16}/></Link><Link className="secondaryLink" href="/docs">Read docs</Link></div></div><div className="heroCard"><div className="pulse"/><small>FLOW</small><strong>Create → Lock → Claim</strong><p>The issuer is also the user: create token, create airdrop, and eligible wallets claim from available airdrop pages.</p></div></section>
    <section className="steps"><article><span>01</span><h3>Create token</h3><p>Deploy a Sepolia confidential token. Full configured supply is minted privately to the issuer at deployment.</p></article><article><span>02</span><h3>Create airdrop</h3><p>Enter eligible wallets and amounts directly. No upload and no database.</p></article><article><span>03</span><h3>Lock tokens</h3><p>Authorize TokenOps and fund the required amount into the airdrop contract.</p></article><article><span>04</span><h3>Claim</h3><p>Users open the airdrop page, check eligibility, and claim encrypted tokens.</p></article></section>
  </ShadowShell>;
}
