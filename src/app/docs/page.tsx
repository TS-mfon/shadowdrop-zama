import Link from "next/link";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";
import { shadowContracts } from "@/lib/shadow-config";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="DOCUMENTATION" title="How to use ShadowDrop" copy="Complete issuer and recipient instructions for the Sepolia Zama/TokenOps build."/>
    <section className="docs">
      <h2>Issuer flow</h2>
      <ol><li>Create a confidential token at <Link href="/token/create">/token/create</Link>. The configured supply is minted privately to your issuer wallet during deployment.</li><li>Create the airdrop at <Link href="/airdrops/create">/airdrops/create</Link>.</li><li>Enter eligible wallets and token amounts directly in the page. No upload and no backend database are used.</li><li>The app validates rows, initializes Zama, authorizes TokenOps, locks/funds the required token amount into the airdrop contract, registers metadata, and stores encrypted claim metadata locally in your browser.</li></ol>
      <h2>Recipient flow</h2>
      <ol><li>Open <Link href="/airdrops">/airdrops</Link>.</li><li>Select an available airdrop before the claim deadline.</li><li>Connect the wallet that the issuer added.</li><li>Click Check eligibility. If eligible, click Claim encrypted tokens. The amount remains encrypted.</li></ol>
      <h2>Privacy model</h2><p>Wallet addresses and contract addresses are public. Allocation amounts, claim amounts, balances, and transfer values are encrypted through Zama/TokenOps FHE flows.</p>
      <h2>Contracts</h2><pre>{JSON.stringify(shadowContracts, null, 2)}</pre>
      <h2>No database model</h2><p>ShadowDrop does not run a server database. The browser stores local campaign claim metadata so the airdrop and claim pages can render. If you need users on other devices to see the same claim package, share the campaign package out-of-band or add an explicitly decentralized storage layer later.</p>
      <h2>Troubleshooting</h2><ul><li>Wrong network: switch wallet to Ethereum Sepolia.</li><li>Connect issue: click the action button again after wallet connection or network switching completes.</li><li>Invalid wallet rows: fix checksum, duplicate, zero, or malformed rows.</li><li>Ineligible: connect the exact wallet entered by the issuer.</li><li>Funding failure: the issuer wallet must hold enough confidential token balance and TokenOps operator approval must succeed.</li></ul>
    </section>
  </ShadowShell>;
}
