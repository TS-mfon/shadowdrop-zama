import { list, put } from "@vercel/blob";

const JSON_OPTIONS = {
  access: "public",
  contentType: "application/json",
  addRandomSuffix: false,
  allowOverwrite: true,
} as const;

export type ShadowTokenRecord = {
  version: 1;
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  maxSupply: string;
  owner: string;
  createdAt: number;
  deploymentTx?: string;
  mintTx?: string;
};

export type ShadowClaimRecord = {
  airdrop: string;
  recipient: string;
  handle: string;
  inputProof: string;
  signature: string;
};

export type ShadowAirdropRecord = {
  version: 1;
  chainId: number;
  campaign: string;
  token: string;
  airdrop: string;
  issuer: string;
  startAt: number;
  endAt: number;
  total: string;
  recipients: number;
  createdAt: number;
  registryTx?: string;
  claims: ShadowClaimRecord[];
};

export type ShadowAirdropPublic = Omit<ShadowAirdropRecord, "claims">;

export function assertBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add Vercel Blob storage to this Vercel project and redeploy.");
  }
}

function jsonBody<T>(value: T) {
  return JSON.stringify(value, null, 2);
}

async function readJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export async function saveShadowToken(record: ShadowTokenRecord) {
  assertBlobConfigured();
  const pathname = `shadowdrop/tokens/${record.chainId}/${record.owner.toLowerCase()}/${record.address.toLowerCase()}.json`;
  await put(pathname, jsonBody(record), JSON_OPTIONS);
}

export async function listShadowTokens(chainId: number, owner: string) {
  assertBlobConfigured();
  const blobs = await list({ prefix: `shadowdrop/tokens/${chainId}/${owner.toLowerCase()}/` });
  const records = await Promise.all(blobs.blobs.map((blob) => readJson<ShadowTokenRecord>(blob.url)));
  return records.filter((record): record is ShadowTokenRecord => Boolean(record)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveShadowAirdrop(record: ShadowAirdropRecord) {
  assertBlobConfigured();
  const pathname = `shadowdrop/airdrops/${record.chainId}/${record.airdrop.toLowerCase()}.json`;
  await put(pathname, jsonBody(record), JSON_OPTIONS);
}

export async function listShadowAirdrops(chainId: number) {
  assertBlobConfigured();
  const blobs = await list({ prefix: `shadowdrop/airdrops/${chainId}/` });
  const records = await Promise.all(blobs.blobs.map((blob) => readJson<ShadowAirdropRecord>(blob.url)));
  return records
    .filter((record): record is ShadowAirdropRecord => Boolean(record))
    .map((record) => ({
      version: record.version,
      chainId: record.chainId,
      campaign: record.campaign,
      token: record.token,
      airdrop: record.airdrop,
      issuer: record.issuer,
      startAt: record.startAt,
      endAt: record.endAt,
      total: record.total,
      recipients: record.recipients,
      createdAt: record.createdAt,
      registryTx: record.registryTx,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getShadowAirdrop(chainId: number, airdrop: string) {
  assertBlobConfigured();
  const blobs = await list({ prefix: `shadowdrop/airdrops/${chainId}/${airdrop.toLowerCase()}.json` });
  const blob = blobs.blobs[0];
  return blob ? readJson<ShadowAirdropRecord>(blob.url) : null;
}
