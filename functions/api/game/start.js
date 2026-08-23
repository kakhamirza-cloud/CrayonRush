import { json, currentUser, GAME_SECONDS } from "../../_lib/core.js";
export async function onRequestPost(context) {
  const u = await currentUser(context); if (!u) return json({ error: "Lock your X username first." }, 401);
  const body = await context.request.json().catch(() => ({}));
  if (!u.character && !body.character) return json({ error: "Pick a character first." }, 400);

  // Simple server-side anti-spam: max 1 new live session every 3 seconds.
  const recent = await context.env.DB.prepare(
    "SELECT started_at_ms FROM game_sessions WHERE user_id=? ORDER BY started_at_ms DESC LIMIT 1"
  ).bind(u.id).first();
  const now = Date.now();
  if (recent && now - Number(recent.started_at_ms) < 3000) return json({ error: "Wait a moment before starting again." }, 429);

  const id = crypto.randomUUID(), nonce = crypto.randomUUID();
  await context.env.DB.prepare(
    "INSERT INTO game_sessions(id,user_id,started_at_ms,expires_at_ms,used,nonce) VALUES(?,?,?,?,0,?)"
  ).bind(id,u.id,now,now+(GAME_SECONDS+15)*1000,nonce).run();
  return json({ sessionId:id,durationSeconds:GAME_SECONDS });
}
