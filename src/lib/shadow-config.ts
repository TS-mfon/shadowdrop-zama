import { getAddress, isAddress, parseUnits, type Address } from "viem";
import deployment from "../../deployments/sepolia.json";

export const SHADOW_CHAIN_ID = 11155111;
export const SHADOW_TOKEN_DECIMALS = 6;

export const shadowContracts = {
  registry: deployment.shadowCampaignRegistry as Address,
  referenceToken: deployment.shadowConfidentialToken as Address,
  tokenOpsAirdropFactory: deployment.tokenOps.airdropFactory as Address,
  tokenOpsVestingFactory: deployment.tokenOps.vestingFactory as Address,
  tokenOpsDisperseSingleton: deployment.tokenOps.disperseSingleton as Address,
};

export type AllocationRow = { address: Address; amount: string; rawAmount: bigint };
export type ParsedCsv = { rows: AllocationRow[]; totalRaw: bigint; errors: string[] };

export function normalizeAddress(value: string, label = "address"): Address {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) throw new Error(`${label} is not a valid EVM address.`);
  return getAddress(trimmed);
}

export function parseTokenAmount(value: string, label = "amount"): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) throw new Error(`${label} must be a positive number with up to 6 decimals.`);
  const parsed = parseUnits(trimmed, SHADOW_TOKEN_DECIMALS);
  if (parsed <= 0n) throw new Error(`${label} must be greater than zero.`);
  if (parsed > (2n ** 64n - 1n)) throw new Error(`${label} exceeds the euint64 token limit.`);
  return parsed;
}

export function parseAllocationCsv(text: string): ParsedCsv {
  const errors: string[] = [];
  const rows: AllocationRow[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const dataLines = lines[0]?.toLowerCase().startsWith("address,") ? lines.slice(1) : lines;

  dataLines.forEach((line, index) => {
    const lineNumber = index + 2;
    const [rawAddress, rawAmount] = line.split(",").map((item) => item?.trim() ?? "");
    try {
      const address = normalizeAddress(rawAddress, `row ${lineNumber} address`);
      const key = address.toLowerCase();
      if (seen.has(key)) throw new Error(`row ${lineNumber} duplicates ${address}.`);
      seen.add(key);
      rows.push({ address, amount: rawAmount, rawAmount: parseTokenAmount(rawAmount, `row ${lineNumber} amount`) });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `row ${lineNumber} is invalid.`);
    }
  });

  return { rows, totalRaw: rows.reduce((total, row) => total + row.rawAmount, 0n), errors };
}

export function formatUnits6(raw: bigint): string {
  const whole = raw / 1_000_000n;
  const fraction = raw % 1_000_000n;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

export function humanError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/user rejected|User rejected|rejected/i.test(message)) return "Wallet request rejected. No transaction was submitted.";
  if (/insufficient funds/i.test(message)) return "Insufficient Sepolia ETH for gas.";
  if (/chain|network/i.test(message)) return "Wrong network or RPC issue. Switch to Ethereum Sepolia and retry.";
  if (/invalid address|checksum|Address/i.test(message)) return message;
  if (/execution reverted/i.test(message)) return "Transaction reverted. Check token balance, operator approval, campaign window, and funding.";
  if (/relayer|encrypt|FHE|proof/i.test(message)) return `Zama encryption failed: ${message}`;
  return message || "Unexpected error.";
}
