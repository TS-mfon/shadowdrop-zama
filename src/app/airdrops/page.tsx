import { AirdropList } from "@/components/shadow/airdrop-list";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="RECIPIENTS" title="Available airdrops" copy="Open a campaign or import your private authorization file to check eligibility."/><AirdropList /></ShadowShell>;
}
