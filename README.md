# ShadowDrop

Confidential token distribution on Ethereum Sepolia. ShadowDrop provides real operational surfaces for airdrops, vesting, payroll, grants, referrals, team schedules, investor unlocks, and multi-recipient dispersals through Zama FHE and `@tokenops/sdk`.

## Privacy boundary

Amounts are parsed and encrypted in the browser. ShadowDrop does not store plaintext allocation files. FHE protects values, while wallet addresses and transaction senders remain visible on Ethereum.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test:contracts
pnpm build
pnpm dev
```

Copy `.env.example` to `.env.local`. The UI defaults to a public Sepolia RPC and resolves official TokenOps deployments from the SDK.

## Sepolia contracts

- Shadow registry: `0xc9136dc0bc439352aC919Ed9d366Ea36C16400ec`
- TokenOps airdrop factory: `0xbE6A3B78B36684fFee48De77d47Bc3393F5Acd4c`
- TokenOps vesting factory: `0xA87701CE9A52D43681600583a99c85b50DbE3150`
- TokenOps disperse: `0x710dD9885Cc9986EfD234E7719483147a6d8DBb4`

Full transaction evidence is in `deployments/sepolia.json`.
