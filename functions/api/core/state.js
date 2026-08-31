import { json, cleanWallet, publicClient } from "./_shared.js";
import { TEST_CRAYON_ABI, CRAYON_CORE_ABI } from "./_abi.js";
import { getAddress, formatEther } from "viem";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const wallet = cleanWallet(url.searchParams.get("wallet"));

  if (!wallet) {
    return json({ error: "Invalid wallet." }, 400);
  }

  if (!context.env.TEST_CRAYON_ADDRESS || !context.env.CRAYON_CORE_ADDRESS) {
    return json({ error: "Contracts not configured." }, 503);
  }

  const balance = await publicClient.getBalance({
    address: wallet
  });

  const tokenId = await publicClient.readContract({
    address: getAddress(context.env.TEST_CRAYON_ADDRESS),
    abi: TEST_CRAYON_ABI,
    functionName: "tokenOf",
    args: [wallet]
  });

  if (tokenId === 0n) {
    return json({
      wallet,
      balanceEth: formatEther(balance),
      tokenId: 0,
      bestScore: 0,
      achievementBits: 0,
      testCrayonAddress: context.env.TEST_CRAYON_ADDRESS,
      crayonCoreAddress: context.env.CRAYON_CORE_ADDRESS
    });
  }

  const [bestScore, bits] = await Promise.all([
    publicClient.readContract({
      address: getAddress(context.env.CRAYON_CORE_ADDRESS),
      abi: CRAYON_CORE_ABI,
      functionName: "bestScore",
      args: [tokenId]
    }),

    publicClient.readContract({
      address: getAddress(context.env.CRAYON_CORE_ADDRESS),
      abi: CRAYON_CORE_ABI,
      functionName: "achievementBits",
      args: [tokenId]
    })
  ]);

  return json({
    wallet,
    balanceEth: formatEther(balance),
    tokenId: Number(tokenId),
    bestScore: Number(bestScore),
    achievementBits: Number(bits),
    testCrayonAddress: context.env.TEST_CRAYON_ADDRESS,
    crayonCoreAddress: context.env.CRAYON_CORE_ADDRESS
  });
}