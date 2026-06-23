import { AirdropCreate } from "@/components/shadow/airdrop-create";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="AIRDROP CREATION" title="Create a funded encrypted airdrop" copy="Enter eligible wallets and token amounts, encrypt with Zama in the browser, and lock the required tokens into TokenOps."/><AirdropCreate /></ShadowShell>;
}
