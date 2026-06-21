import { PageHeader, ShadowShell } from "@/components/shadow/shell";
import { shadowContracts } from "@/lib/shadow-config";
import deployment from "../../../deployments/sepolia.json";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="STATUS" title="ShadowDrop live contracts" copy="Sepolia deployment addresses used by the current frontend."/><section className="docs"><pre>{JSON.stringify({ contracts: shadowContracts, transactions: deployment.transactions }, null, 2)}</pre></section></ShadowShell>;
}
