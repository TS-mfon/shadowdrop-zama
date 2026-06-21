import { ClaimCenter } from "@/components/shadow/claim-center";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="CLAIM CENTER" title="Check eligibility and claim" copy="Recipients use this page to validate a private authorization and submit an encrypted TokenOps claim."/><ClaimCenter /></ShadowShell>;
}
