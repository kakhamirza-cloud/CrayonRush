import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  isAddress,
  parseEther,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.chain.robinhood.com"] } },
  blockExplorers: {
    default: {
      name: "Robinhood Testnet Explorer",
      url: "https://explorer.testnet.chain.robinhood.com"
    }
  }
});

export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http("https://rpc.testnet.chain.robinhood.com")
});

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

export function cleanWallet(value) {
  if (!isAddress(value || "")) return null;
  return getAddress(value);
}

export function getIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

export function achievementBits(score) {
  let bits = 1n; // bit0 First Rush
  if (score >= 250) bits |= 2n; // bit1 Speedy
  if (score >= 500) bits |= 4n; // bit2 Rusher
  if (score >= 900) bits |= 8n; // bit3 Super Rusher
  return bits;
}

export function expectedScoreForMs(ms) {
  const BASE = 300, ACCEL = 8.5, MAX = 720, DIV = 12, MAX_MS = 5 * 60 * 1000;
  const t = Math.max(0, Math.min(MAX_MS, ms)) / 1000;
  const tCap = (MAX - BASE) / ACCEL;
  let distance;
  if (t <= tCap) distance = BASE * t + 0.5 * ACCEL * t * t;
  else {
    const capDistance = BASE * tCap + 0.5 * ACCEL * tCap * tCap;
    distance = capDistance + MAX * (t - tCap);
  }
  return Math.floor(distance / DIV);
}

export async function signCoreProof(env, payload) {
  if (!env.CORE_SIGNER_PRIVATE_KEY) throw new Error("CORE_SIGNER_PRIVATE_KEY missing");
  if (!env.CRAYON_CORE_ADDRESS) throw new Error("CRAYON_CORE_ADDRESS missing");

  const account = privateKeyToAccount(env.CORE_SIGNER_PRIVATE_KEY);

  // Must exactly match:
  // abi.encode(address(this), block.chainid, msg.sender, tokenId,
  //            newBestScore, newAchievementBits, claimId, deadline)
  const digest = keccak256(encodeAbiParameters(
    parseAbiParameters("address,uint256,address,uint256,uint256,uint256,bytes32,uint256"),
    [
      getAddress(env.CRAYON_CORE_ADDRESS),
      46630n,
      getAddress(payload.wallet),
      BigInt(payload.tokenId),
      BigInt(payload.bestScore),
      BigInt(payload.achievementBits),
      payload.claimId,
      BigInt(payload.deadline)
    ]
  ));

  return account.signMessage({ message: { raw: digest } });
}

export async function sendFaucetEth(env, wallet) {
  if (!env.FAUCET_PRIVATE_KEY) throw new Error("FAUCET_PRIVATE_KEY missing");
  const account = privateKeyToAccount(env.FAUCET_PRIVATE_KEY);
  const client = createWalletClient({
    account,
    chain: robinhoodTestnet,
    transport: http(env.RH_TESTNET_RPC || "https://rpc.testnet.chain.robinhood.com")
  });
  return client.sendTransaction({
    account,
    to: getAddress(wallet),
    value: parseEther(env.FAUCET_AMOUNT_ETH || "0.002")
  });
}
