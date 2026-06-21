import { TokenCreate } from "@/components/shadow/token-create";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="TOKEN CREATION" title="Create a confidential token" copy="Deploy the token you will mint and lock into TokenOps airdrops."/><TokenCreate /></ShadowShell>;
}
