import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { getShadowAirdrop } from "@/lib/blob-store";
import { SHADOW_CHAIN_ID } from "@/lib/shadow-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status });
}

export async function GET(request: Request, context: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await context.params;
    if (!isAddress(address)) return fail("airdrop address is invalid.", 400);
    const { searchParams } = new URL(request.url);
    const chainId = Number(searchParams.get("chainId") ?? SHADOW_CHAIN_ID);
    const recipient = searchParams.get("recipient");
    if (recipient && !isAddress(recipient)) return fail("recipient query param is invalid.", 400);

    const record = await getShadowAirdrop(chainId, getAddress(address));
    if (!record) return fail("Airdrop metadata was not found in shared storage.", 404);

    const { claims, ...publicRecord } = record;
    if (!recipient) return NextResponse.json({ ok: true, data: publicRecord });

    const target = getAddress(recipient);
    const claim = claims.find((item) => item.recipient.toLowerCase() === target.toLowerCase()) ?? null;
    return NextResponse.json({ ok: true, data: { ...publicRecord, claim } });
  } catch (error) {
    return fail(error);
  }
}
