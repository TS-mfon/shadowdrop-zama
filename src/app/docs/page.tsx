import Link from "next/link";
import { PageHeader, ShadowShell } from "@/components/shadow/shell";
import { shadowContracts } from "@/lib/shadow-config";

export default function Page() {
  return <ShadowShell><PageHeader eyebrow="DOCUMENTATION" title="How to use ShadowDrop" copy="Complete issuer and recipient instructions for the Sepolia Zama/TokenOps build."/>
    <section className="docs">
      <h2>Issuer flow</h2>
      <ol><li>Create a confidential token at <Link href="/token/create">/token/create</Link>.</li><li>Mint supply to the issuer wallet at <Link href="/token/mint">/token/mint</Link>.</li><li>Prepare a CSV with `address,amount` columns. Use the files in `fixtures/shadowdrop` as examples.</li><li>Create the airdrop at <Link href="/airdrops/create">/airdrops/create</Link>. The app validates the CSV, initializes Zama, authorizes TokenOps, creates/funds the airdrop, registers metadata, and downloads claim authorizations.</li><li>Send each recipient their authorization file or a filtered per-wallet authorization.</li></ol>
      <h2>Recipient flow</h2>
      <ol><li>Open <Link href="/claims">/claims</Link> or a campaign URL.</li><li>Connect the eligible wallet on Ethereum Sepolia.</li><li>Import the claim authorization JSON.</li><li>Click Validate & claim. The amount remains encrypted.</li></ol>
      <h2>Privacy model</h2><p>Wallet addresses and contract addresses are public. Allocation amounts, claim amounts, balances, and transfer values are encrypted through Zama/TokenOps FHE flows.</p>
      <h2>Contracts</h2><pre>{JSON.stringify(shadowContracts, null, 2)}</pre>
      <h2>Troubleshooting</h2><ul><li>Wrong network: switch wallet to Ethereum Sepolia.</li><li>Invalid CSV: fix checksum, duplicate, zero, or malformed rows.</li><li>Claim invalid: use the connected recipient wallet and unused authorization.</li><li>Funding failure: mint enough token supply and ensure TokenOps operator approval succeeds.</li></ul>
    </section>
  </ShadowShell>;
}
