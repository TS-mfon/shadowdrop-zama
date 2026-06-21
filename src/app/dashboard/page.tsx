import { ShadowDashboard } from "@/components/shadow/dashboard";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="ISSUER CONSOLE" title="Dashboard" copy="Manage confidential token launches and encrypted TokenOps airdrops from one place."/><ShadowDashboard /></ShadowShell>;
}
