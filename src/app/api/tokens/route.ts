import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { z } from "zod";
import { SHADOW_CHAIN_ID } from "@/lib/shadow-config";
import { listShadowTokens, saveShadowToken } from "@/lib/blob-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tokenSchema = z.object({
  chainId: z.number().int().default(SHADOW_CHAIN_ID),
  address: z.string(),
  name: z.string().min(1).max(80),
  symbol: z.string().min(1).max(16),
  maxSupply: z.string().regex(/^\d+$/),
  owner: z.string(),
  createdAt: z.number().int().positive().optional(),
  deploymentTx: z.string().optional(),
  mintTx: z.string().optional(),
});

function fail(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner");
    const chainId = Number(searchParams.get("chainId") ?? SHADOW_CHAIN_ID);
    if (!owner || !isAddress(owner)) return fail("owner query param must be a valid wallet address.", 400);
    const data = await listShadowTokens(chainId, getAddress(owner));
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = tokenSchema.parse(await request.json());
    if (!isAddress(input.address)) return fail("token address is invalid.", 400);
    if (!isAddress(input.owner)) return fail("owner address is invalid.", 400);
    const record = {
      version: 1 as const,
      ...input,
      address: getAddress(input.address),
      owner: getAddress(input.owner),
      symbol: input.symbol.toUpperCase(),
      createdAt: input.createdAt ?? Date.now(),
    };
    await saveShadowToken(record);
    return NextResponse.json({ ok: true, data: record });
  } catch (error) {
    return fail(error, error instanceof z.ZodError ? 400 : 500);
  }
}
