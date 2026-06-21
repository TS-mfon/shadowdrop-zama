import { TokenMint } from "@/components/shadow/token-mint";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="SUPPLY" title="Mint encrypted token supply" copy="Mint issuer-held supply before funding an airdrop contract."/><TokenMint /></ShadowShell>;
}
