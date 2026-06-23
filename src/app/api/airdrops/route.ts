import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { listShadowAirdrops, saveShadowAirdrop } from "@/lib/blob-store";
import { SHADOW_CHAIN_ID } from "@/lib/shadow-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const claimSchema = z.object({
  airdrop: z.string(),
  recipient: z.string(),
  handle: z.string().regex(/^0x[0-9a-fA-F]+$/),
  inputProof: z.string().regex(/^0x[0-9a-fA-F]+$/),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

const airdropSchema = z.object({
  chainId: z.number().int().default(SHADOW_CHAIN_ID),
  campaign: z.string().min(1).max(120),
  token: z.string(),
  airdrop: z.string(),
  issuer: z.string(),
  startAt: z.number().int().positive(),
  endAt: z.number().int().positive(),
  total: z.string().min(1),
  recipients: z.number().int().positive(),
  createdAt: z.number().int().positive().optional(),
  registryTx: z.string().optional(),
  claims: z.array(claimSchema).min(1),
});

function fail(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = Number(searchParams.get("chainId") ?? SHADOW_CHAIN_ID);
    const data = await listShadowAirdrops(chainId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = airdropSchema.parse(await request.json());
    for (const value of [input.token, input.airdrop, input.issuer]) {
      if (!isAddress(value)) return fail(`Invalid address: ${value}`, 400);
    }
    const claims = input.claims.map((claim) => {
      if (!isAddress(claim.airdrop)) throw new Error(`Invalid claim airdrop address: ${claim.airdrop}`);
      if (!isAddress(claim.recipient)) throw new Error(`Invalid claim recipient address: ${claim.recipient}`);
      return { ...claim, airdrop: getAddress(claim.airdrop), recipient: getAddress(claim.recipient) };
    });
    if (claims.some((claim) => claim.airdrop.toLowerCase() !== input.airdrop.toLowerCase())) {
      return fail("Every claim must point at the created airdrop contract.", 400);
    }
    const uniqueRecipients = new Set(claims.map((claim) => claim.recipient.toLowerCase()));
    if (uniqueRecipients.size !== claims.length) return fail("Duplicate claim recipient detected.", 400);
    if (input.endAt <= input.startAt) return fail("Airdrop endAt must be after startAt.", 400);
    const record = {
      version: 1 as const,
      ...input,
      token: getAddress(input.token),
      airdrop: getAddress(input.airdrop),
      issuer: getAddress(input.issuer),
      recipients: claims.length,
      claims,
      createdAt: input.createdAt ?? Date.now(),
    };
    await saveShadowAirdrop(record);
    const publicRecord = {
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
    };
    return NextResponse.json({ ok: true, data: publicRecord });
  } catch (error) {
    return fail(error, error instanceof z.ZodError ? 400 : 500);
  }
}
