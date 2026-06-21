import { createPublicClient, createWalletClient, http, keccak256, stringToHex } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { RelayerNode, SepoliaConfig } from "@zama-fhe/sdk/node";
import { getFheAirdropFactoryAddress } from "@tokenops/sdk";
import { setOperator } from "@tokenops/sdk/fhe";
import { createConfidentialAirdropClient, createConfidentialAirdropFactoryClient, encryptUint64, signClaimAuthorization } from "@tokenops/sdk/fhe-airdrop";

const privateKey = process.env.DEPLOYER_PRIVATEKEY;
const token = process.env.SHADOW_TOKEN_ADDRESS;
const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
if (!privateKey || !token) throw new Error("DEPLOYER_PRIVATEKEY and SHADOW_TOKEN_ADDRESS are required.");

const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
const encryptor = new RelayerNode({ transports: { [SepoliaConfig.chainId]: { ...SepoliaConfig, network: rpcUrl } }, getChainId: async () => sepolia.id });

try {
  const factoryAddress = getFheAirdropFactoryAddress(sepolia.id);
  if (!factoryAddress) throw new Error("TokenOps airdrop factory is unavailable on Sepolia.");
  const now = Math.floor(Date.now() / 1000);
  const amount = 100_000_000n; // 100 tokens at 6 decimals.
  console.error(`[shadow-smoke] deployer=${account.address}`);
  console.error(`[shadow-smoke] token=${token}`);
  console.error(`[shadow-smoke] factory=${factoryAddress}`);
  console.error("[shadow-smoke] authorizing TokenOps factory as encrypted-token operator");
  await setOperator({ publicClient, walletClient, token, spender: factoryAddress, account, deadline: BigInt(now + 7 * 86400) });
  console.error("[shadow-smoke] creating/funding confidential airdrop");
  const factory = createConfidentialAirdropFactoryClient({ publicClient, walletClient, encryptor });
  const created = await factory.createAndFundConfidentialAirdrop({
    params: { token, startTimestamp: now, endTimestamp: now + 7 * 86400, canExtendClaimWindow: false, admin: account.address },
    userSalt: keccak256(stringToHex(`shadowdrop-smoke:${Date.now()}`)),
    amount,
    account,
  });
  console.error(`[shadow-smoke] airdrop=${created.airdrop}`);
  console.error("[shadow-smoke] encrypting recipient claim amount");
  const encryptedInput = await encryptUint64({ encryptor, contractAddress: created.airdrop, userAddress: account.address, value: amount });
  console.error("[shadow-smoke] signing claim authorization");
  const signature = await signClaimAuthorization({ walletClient, airdropAddress: created.airdrop, recipient: account.address, encryptedAmountHandle: encryptedInput.handle });
  const airdrop = createConfidentialAirdropClient({ publicClient, walletClient, address: created.airdrop });
  console.error("[shadow-smoke] validating authorization onchain");
  const valid = await airdrop.isSignatureValid({ encryptedAmountHandle: encryptedInput.handle, signature, caller: account.address });
  if (!valid) throw new Error("Generated TokenOps authorization failed signature validation.");
  console.error("[shadow-smoke] submitting encrypted claim");
  const claimHash = await airdrop.claim({ encryptedInput, signature, account });
  await publicClient.waitForTransactionReceipt({ hash: claimHash });
  console.log(JSON.stringify({ token, airdrop: created.airdrop, createAndFundTx: created.hash, claimTx: claimHash, encrypted: true, authorizationValid: true }, null, 2));
} finally {
  encryptor.terminate();
}
