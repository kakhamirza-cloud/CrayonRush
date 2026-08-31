import { publicClient } from "../_shared.js";
import { TEST_CRAYON_ABI, CRAYON_CORE_ABI } from "../_abi.js";
import { getAddress } from "viem";

export async function onRequestGet(context) {
  const tokenId = Number(context.params.tokenId);
  if (!Number.isInteger(tokenId) || tokenId <= 0) {
    return new Response("Bad token", { status: 400 });
  }
  if (!context.env.TEST_CRAYON_ADDRESS || !context.env.CRAYON_CORE_ADDRESS) {
    return new Response("Contracts not configured", { status: 503 });
  }

  try {
    await publicClient.readContract({
      address: getAddress(context.env.TEST_CRAYON_ADDRESS),
      abi: TEST_CRAYON_ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)]
    });
  } catch {
    return new Response("Token not found", { status: 404 });
  }

  const [bestScore, bits] = await Promise.all([
    publicClient.readContract({
      address: getAddress(context.env.CRAYON_CORE_ADDRESS),
      abi: CRAYON_CORE_ABI,
      functionName: "bestScore",
      args: [BigInt(tokenId)]
    }),
    publicClient.readContract({
      address: getAddress(context.env.CRAYON_CORE_ADDRESS),
      abi: CRAYON_CORE_ABI,
      functionName: "achievementBits",
      args: [BigInt(tokenId)]
    })
  ]);

  const b = Number(bits);
  const attributes = [
    { trait_type: "Collection", value: "Crayon Core Test" },
    { display_type: "number", trait_type: "Best Rush", value: Number(bestScore) }
  ];

  if (b & 1) attributes.push({ trait_type: "First Rush", value: "Unlocked" });
  if (b & 2) attributes.push({ trait_type: "Speedy Crayon", value: "Unlocked" });
  if (b & 4) attributes.push({ trait_type: "Rusher", value: "Unlocked" });
  if (b & 8) attributes.push({ trait_type: "Super Rusher", value: "Unlocked" });

  return new Response(JSON.stringify({
    name: `Test Crayon #${tokenId}`,
    description: "A free Robinhood Chain testnet NFT used to test Crayon Core earned traits.",
    image: "https://crayonrush.fun/core/test-crayon.svg",
    external_url: "https://crayonrush.fun/core/",
    attributes
  }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*"
    }
  });
}
