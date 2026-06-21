import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import deployment from "../../../../deployments/sepolia.json";

export const dynamic = "force-dynamic";
export async function GET(){
  const client=createPublicClient({chain:sepolia,transport:http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL||"https://ethereum-sepolia-rpc.publicnode.com")});
  const entries={
    registry:deployment.shadowCampaignRegistry,
    referenceToken:deployment.shadowConfidentialToken,
    ...deployment.tokenOps
  };
  const [latest, contracts]=await Promise.all([
    client.getBlockNumber(),
    Promise.all(Object.entries(entries).map(async([name,address])=>[
      name,
      {address,deployed:Boolean(await client.getBytecode({address:address as `0x${string}`}))}
    ]))
  ]);
  return NextResponse.json({
    service:"shadowdrop",
    chainId:sepolia.id,
    latestBlock:latest.toString(),
    privacy:"amounts-encrypted-wallets-public",
    contracts:Object.fromEntries(contracts),
    transactions:deployment.transactions,
    checkedAt:new Date().toISOString()
  });
}
