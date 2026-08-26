import { json, currentUser } from "../../_lib/core.js";
const MAX_RUN_MS = 5 * 60 * 1000;
export async function onRequestPost(context) {
  const u = await currentUser(context);
  if (!u) return json({ error: "Lock your X username first." }, 401);
  const body = await context.request.json().catch(() => ({}));
  const allowed = ["wolf", "scarlet", "ghost", "mole"];
  const character = body.character || u.character;
  if (!allowed.includes(character)) return json({ error: "Pick a valid runner first." }, 400);
  const recent = await context.env.DB.prepare("SELECT started_at_ms FROM game_sessions WHERE user_id=? ORDER BY started_at_ms DESC LIMIT 1").bind(u.id).first();
  const now = Date.now();
  if (recent && now - Number(recent.started_at_ms) < 2500) return json({ error: "Wait a moment before starting again." }, 429);
  if (u.character !== character) await context.env.DB.prepare("UPDATE users SET character=?,updated_at=? WHERE id=?").bind(character,new Date().toISOString(),u.id).run();
  const id=crypto.randomUUID(),nonce=crypto.randomUUID();
  await context.env.DB.prepare("INSERT INTO game_sessions(id,user_id,started_at_ms,expires_at_ms,used,nonce) VALUES(?,?,?,?,0,?)").bind(id,u.id,now,now+MAX_RUN_MS+15000,nonce).run();
  return json({sessionId:id,maxRunSeconds:MAX_RUN_MS/1000});
}
