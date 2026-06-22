import { AirdropList } from "@/components/shadow/airdrop-list";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="RECIPIENTS" title="Available airdrops" copy="Open an available airdrop, connect your wallet, check eligibility, and claim before the deadline."/><AirdropList /></ShadowShell>;
}
