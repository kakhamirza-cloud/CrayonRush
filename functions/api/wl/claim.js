import { json, currentUser, profileFor, WL_PRICE, wlRemaining } from "../../_lib/core.js";
export async function onRequestPost(context) {
  const u = await currentUser(context); if (!u) return json({ error: "Lock your X username first." }, 401);
  if (u.wl_claimed) return json({ error: "This account already claimed a game WL." }, 409);
  if (Number(u.rp_balance) < WL_PRICE) return json({ error: "Not enough Rush Points." }, 400);
  const remaining = await wlRemaining(context.env); if (remaining <= 0) return json({ error: "Game WL allocation is sold out." }, 409);

  const iso = new Date().toISOString();
  // D1 batch ensures the user's own claim operations happen together.
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE users SET rp_balance=rp_balance-?,wl_claimed=1,updated_at=? WHERE id=? AND wl_claimed=0 AND rp_balance>=?").bind(WL_PRICE,iso,u.id,WL_PRICE),
    context.env.DB.prepare("INSERT OR IGNORE INTO wl_claims(user_id,rp_spent,claimed_at) VALUES(?,?,?)").bind(u.id,WL_PRICE,iso),
    context.env.DB.prepare("UPDATE settings SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT) WHERE key='game_wl_claimed'")
  ]);
  const fresh = await context.env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first();
  return json({ user: await profileFor(context,fresh), wlRemaining: await wlRemaining(context.env) });
}
