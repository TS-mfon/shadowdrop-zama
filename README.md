# ShadowDrop

Confidential token creation and TokenOps-powered encrypted distribution on Zama FHEVM, deployed for Ethereum Sepolia.

Live application: https://shadowdrop-zama.vercel.app

## What ShadowDrop does

ShadowDrop is a no-database confidential airdrop workflow:

1. The issuer connects a Sepolia wallet.
2. The issuer deploys a confidential ERC-7984-style token.
3. The same token setup page mints the configured issuer supply privately.
4. The issuer creates an airdrop by entering eligible wallets and token amounts directly in the browser.
5. The browser validates rows, initializes Zama encryption, authorizes TokenOps, and locks/funds the required token amount into the airdrop contract.
6. Users open `/airdrops`, select an available airdrop, connect their wallet, check eligibility, and claim encrypted tokens.

No backend database is used. No recipient upload is required in the UI.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page and workflow overview |
| `/dashboard` | Issuer dashboard |
| `/token/create` | Connect, deploy confidential token, and mint issuer supply in one guided flow |
| `/airdrops` | Globally available published airdrops |
| `/airdrops/create` | Manual eligible-wallet entry, Zama encryption, TokenOps create/fund flow |
| `/airdrops/[id]` | Campaign-specific eligibility and claim page |
| `/docs` | In-app user documentation |
| `/status` | Human-readable deployment status |
| `/api/status` | Machine-readable contract health |

## Architecture

```text
Issuer wallet
  -> Next.js browser UI
  -> deploy ShadowConfidentialToken
  -> mint issuer supply
  -> enter eligible wallets and amounts
  -> Zama browser encryption
  -> TokenOps SDK setOperator
  -> TokenOps ConfidentialAirdropFactory create/fund
  -> funded ConfidentialAirdrop clone
  -> ShadowCampaignRegistry metadata
  -> Vercel Blob shared airdrop registry

Recipient wallet
  -> /airdrops
  -> select campaign
  -> request connected-wallet encrypted authorization package
  -> TokenOps signature validation
  -> encrypted handle + input proof
  -> confidential claim
```

## No-database model

ShadowDrop intentionally does not run a SQL database. Public campaign metadata and recipient-bound encrypted claim authorizations are stored as JSON objects in Vercel Blob. That makes created airdrops visible across browsers/devices without relying on `localStorage`, `sessionStorage`, IndexedDB, or a traditional database server.

The API never returns the full claim list from the public airdrop listing. A connected recipient page requests only the encrypted authorization for that wallet.

## Privacy model

Public:

- wallet addresses
- token, airdrop, and registry contract addresses
- timestamps and transaction existence
- token max/minted supply counters

Encrypted/private:

- token balances
- transfer values
- recipient allocations
- claim amounts

Eligible wallet and amount plaintext exists only in the issuer browser during setup. It is encrypted before the TokenOps claim package is generated.

## Validation

The UI blocks or explains:

- disconnected wallet
- wallet signer not ready after connect
- wrong chain
- bad checksum/address
- duplicate eligible wallets
- zero or malformed amounts
- missing contract bytecode
- insufficient Sepolia ETH
- user-rejected transactions
- operator/funding failure
- Zama relayer/encryption failure
- invalid or already-used authorization
- ineligible connected wallet

## Fixtures

Files under `fixtures/shadowdrop/` are still provided for developer testing and QA, but the production UI no longer requires upload:

- `sample-airdrop.csv`
- `sample-team-vesting.csv`
- `invalid-airdrop-duplicates.csv`
- `sample-claim-authorizations.example.json`

## Local development

Requirements: Node 22+, pnpm 11, Foundry, Sepolia wallet, and Sepolia ETH.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Environment:

```env
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
BLOB_READ_WRITE_TOKEN=vercel_blob_token
```

## Testing

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
forge test --root contracts -vv
```

Vanilla Foundry does not execute Zama FHE precompiles. Local contract tests cover deployment, access/operator configuration, limits, and registry behavior. Encrypted mint/transfer/claim behavior must be verified against Sepolia Zama contracts.

## Sepolia user test

1. Open `/token/create`.
2. Connect issuer wallet.
3. Deploy token. The app then mints issuer supply in the same page.
4. Open `/airdrops/create`.
5. Enter token address, eligible wallets, token amounts, and claim window.
6. Confirm TokenOps operator approval.
7. Confirm create/fund transaction.
8. Open `/airdrops`.
9. Select the airdrop.
10. Connect an eligible wallet.
11. Click check eligibility.
12. Claim encrypted tokens.

## Deployment

```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod --yes --archive=tgz
```

Contract addresses are versioned in `deployments/sepolia.json`. Never commit private keys or production secrets.

## Security notes

- Token issuer controls minting and pause roles.
- Operator approval is time-bound for the airdrop window.
- Claim signatures are recipient-bound and intended for single use.
- Public supply counters are not confidential; balances and transfer values are.
- This testnet build has not received an independent production audit.
