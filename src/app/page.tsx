import Link from "next/link";
import { ArrowRight, ShieldCheck, WalletCards, Users } from "lucide-react";
import { ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell>
    <section className="hero"><div><div className="eyebrow">CONFIDENTIAL TOKEN DISTRIBUTION OS</div><h1>Launch tokens.<br/><em>Drop privately.</em></h1><p>Create a confidential token, mint issuer supply, fund a TokenOps encrypted airdrop, and let recipients claim without exposing allocation amounts.</p><div className="proof"><span><ShieldCheck/> Zama FHE encryption</span><span><WalletCards/> ERC-7984-style token</span><span><Users/> Recipient-bound claims</span></div><div className="ctaRow"><Link className="primaryLink" href="/dashboard">Open dashboard <ArrowRight size={16}/></Link><Link className="secondaryLink" href="/docs">Read docs</Link></div></div><div className="heroCard"><div className="pulse"/><small>FLOW</small><strong>Create → Mint → Lock → Claim</strong><p>TokenOps handles the confidential airdrop execution. ShadowDrop gives issuers the missing product workflow.</p></div></section>
    <section className="steps"><article><span>01</span><h3>Create token</h3><p>Deploy a Sepolia confidential token compatible with TokenOps operator flows.</p></article><article><span>02</span><h3>Mint supply</h3><p>Mint encrypted token supply to the authorized issuer wallet.</p></article><article><span>03</span><h3>Fund airdrop</h3><p>Upload CSV allocations, encrypt locally, and lock/fund tokens in the TokenOps airdrop contract.</p></article><article><span>04</span><h3>Claim</h3><p>Recipients import authorization and claim without revealing the amount publicly.</p></article></section>
  </ShadowShell>;
}
