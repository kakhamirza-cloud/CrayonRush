import {
  json,
  cleanWallet,
  publicClient,
  achievementBits,
  expectedScoreForMs,
  signCoreProof
} from "./_shared.js";
import { TEST_CRAYON_ABI, CRAYON_CORE_ABI } from "./_abi.js";
import { getAddress, bytesToHex } from "viem";

const MAX_RUN_MS = 5 * 60 * 1000;

function randomBytes32() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return bytesToHex(a);
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const wallet = cleanWallet(body.wallet);
  if (!wallet) return json({ error: "Invalid wallet." }, 400);
  if (!context.env.TEST_CRAYON_ADDRESS || !context.env.CRAYON_CORE_ADDRESS) {
    return json({ error: "Crayon Core contracts are not configured yet." }, 503);
  }

  const tokenId = Number(body.tokenId);
  const score = Number(body.score);
  const durationMs = Number(body.durationMs);
  const jumps = Number(body.jumps || 0);
  const obstaclesCleared = Number(body.obstaclesCleared || 0);

  if (!Number.isInteger(tokenId) || tokenId <= 0) return json({ error: "Invalid Test Crayon." }, 400);
  if (!Number.isInteger(score) || score < 0) return json({ error: "Invalid score." }, 400);
  if (!Number.isFinite(durationMs) || durationMs < 0 || durationMs > MAX_RUN_MS + 3000) {
    return json({ error: "Invalid run duration." }, 400);
  }

  const session = await context.env.DB.prepare(
    "SELECT * FROM core_run_sessions WHERE id=? AND wallet=?"
  ).bind(body.sessionId || "", wallet.toLowerCase()).first();

  if (!session || Number(session.used)) return json({ error: "Invalid or already-used run." }, 409);

  const now = Date.now();
  const serverElapsed = now - Number(session.started_at_ms);
  if (now > Number(session.expires_at_ms)) return json({ error: "Run expired." }, 400);
  if (Math.abs(serverElapsed - durationMs) > 3500) {
    return json({ error: "Run timing did not match the server session." }, 400);
  }

  const expected = expectedScoreForMs(durationMs);
  if (score > expected + 35) return json({ error: "Impossible distance rejected." }, 400);

  const seconds = Math.max(1, durationMs / 1000);
  if (!Number.isInteger(jumps) || jumps < 0 || jumps > Math.ceil(seconds * 4.5)) {
    return json({ error: "Impossible jump rate rejected." }, 400);
  }
  if (!Number.isInteger(obstaclesCleared) || obstaclesCleared < 0 || obstaclesCleared > Math.ceil(seconds * 2.2)) {
    return json({ error: "Impossible obstacle count rejected." }, 400);
  }

  let owner;
  try {
    owner = await publicClient.readContract({
      address: getAddress(context.env.TEST_CRAYON_ADDRESS),
      abi: TEST_CRAYON_ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)]
    });
  } catch {
    return json({ error: "Test Crayon does not exist." }, 404);
  }

  if (getAddress(owner) !== wallet) return json({ error: "You do not own this Test Crayon." }, 403);

  const [oldBest, oldBits] = await Promise.all([
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

  const newBest = BigInt(Math.max(Number(oldBest), score));
  const newBits = BigInt(oldBits) | achievementBits(score);
  const claimId = randomBytes32();
  const deadline = Math.floor(Date.now() / 1000) + 10 * 60;

  const signature = await signCoreProof(context.env, {
    wallet,
    tokenId,
    bestScore: newBest,
    achievementBits: newBits,
    claimId,
    deadline
  });

  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE core_run_sessions SET used=1 WHERE id=?").bind(session.id),
    context.env.DB.prepare(
      "INSERT INTO core_claims(claim_id,wallet,token_id,best_score,achievement_bits,created_at) VALUES(?,?,?,?,?,?)"
    ).bind(
      claimId,
      wallet.toLowerCase(),
      tokenId,
      Number(newBest),
      Number(newBits),
      new Date().toISOString()
    )
  ]);

  return json({
    score,
    bestScore: Number(newBest),
    achievementBits: Number(newBits),
    claim: {
      tokenId,
      bestScore: Number(newBest),
      achievementBits: Number(newBits),
      claimId,
      deadline,
      signature
    }
  });
}
