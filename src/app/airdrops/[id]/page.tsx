import { ClaimCenter } from "@/components/shadow/claim-center";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ShadowShell><PageHeader eyebrow="CAMPAIGN CLAIM" title="Claim encrypted airdrop" copy={`Campaign ${id}. Connect your wallet to check eligibility and claim privately.`}/><ClaimCenter airdropHint={id.startsWith("0x") ? id : undefined}/></ShadowShell>;
}
