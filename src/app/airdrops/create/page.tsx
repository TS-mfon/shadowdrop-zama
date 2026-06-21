import { AirdropCreate } from "@/components/shadow/airdrop-create";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="AIRDROP CREATION" title="Create a funded encrypted airdrop" copy="Upload allocations, encrypt locally with Zama, fund TokenOps, and export recipient claim authorizations."/><AirdropCreate /></ShadowShell>;
}
