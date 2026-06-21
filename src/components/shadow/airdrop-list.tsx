import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { shadowContracts } from "@/lib/shadow-config";

export function AirdropList() {
  return <section className="dashboardGrid">
    <div className="infoCard large"><h2>Available airdrops</h2><p>ShadowDrop does not expose a global plaintext allocation index. Open a campaign link or import your authorization file to check eligibility.</p><Link className="primaryLink" href="/claims">Open claim center</Link></div>
    <div className="infoCard large"><h3>Live infrastructure</h3><div className="list">
      <a target="_blank" href={`https://sepolia.etherscan.io/address/${shadowContracts.tokenOpsAirdropFactory}`}><span>TokenOps airdrop factory</span><code>{shadowContracts.tokenOpsAirdropFactory}</code><ExternalLink size={14}/></a>
      <a target="_blank" href={`https://sepolia.etherscan.io/address/${shadowContracts.registry}`}><span>Shadow registry</span><code>{shadowContracts.registry}</code><ExternalLink size={14}/></a>
    </div></div>
  </section>;
}

