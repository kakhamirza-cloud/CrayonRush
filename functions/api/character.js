import { json, currentUser } from "../_lib/core.js";

export async function onRequestPost(context) {
  const u = await currentUser(context);
  if (!u) return json({ error: "Lock your X username first." }, 401);

  const body = await context.request.json().catch(() => ({}));
  const allowed = ["🐉", "🤖", "⭐", "👻", "🍄", "🐙"];
  if (!allowed.includes(body.character)) return json({ error: "Invalid runner." }, 400);

  await context.env.DB.prepare(
    "UPDATE users SET character=?,updated_at=? WHERE id=?"
  ).bind(body.character, new Date().toISOString(), u.id).run();

  return json({ ok: true });
}
