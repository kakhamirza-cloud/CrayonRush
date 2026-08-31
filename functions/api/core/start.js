import { json, cleanWallet } from "./_shared.js";

const MAX_RUN_MS = 5 * 60 * 1000;

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const wallet = cleanWallet(body.wallet);
  if (!wallet) return json({ error: "Connect a valid wallet first." }, 400);

  const now = Date.now();
  const recent = await context.env.DB.prepare(
    "SELECT started_at_ms FROM core_run_sessions WHERE wallet=? ORDER BY started_at_ms DESC LIMIT 1"
  ).bind(wallet.toLowerCase()).first();

  if (recent && now - Number(recent.started_at_ms) < 2500) {
    return json({ error: "Wait a moment before starting again." }, 429);
  }

  const id = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  await context.env.DB.prepare(
    "INSERT INTO core_run_sessions(id,wallet,started_at_ms,expires_at_ms,used,nonce) VALUES(?,?,?,?,0,?)"
  ).bind(
    id,
    wallet.toLowerCase(),
    now,
    now + MAX_RUN_MS + 15000,
    nonce
  ).run();

  return json({ sessionId: id, maxRunSeconds: MAX_RUN_MS / 1000 });
}
