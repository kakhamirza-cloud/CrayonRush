import { json, currentUser, profileFor } from "../_lib/core.js";
export async function onRequestPost(context) {
  const u = await currentUser(context); if (!u) return json({ error: "Lock your X username first." }, 401);
  if (!u.wl_claimed) return json({ error: "Buy WL first." }, 403);
  const body = await context.request.json().catch(() => ({}));
  const wallet = String(body.wallet || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) return json({ error: "Enter a valid EVM wallet." }, 400);
  const taken = await context.env.DB.prepare("SELECT id FROM users WHERE wallet=? COLLATE NOCASE AND id<>?").bind(wallet,u.id).first();
  if (taken) return json({ error: "That wallet is already registered." }, 409);
  if (u.wallet && u.wallet.toLowerCase() !== wallet.toLowerCase()) return json({ error: "Wallet is already locked for this account." }, 409);
  await context.env.DB.prepare("UPDATE users SET wallet=?,updated_at=? WHERE id=?").bind(wallet,new Date().toISOString(),u.id).run();
  const fresh = await context.env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first();
  return json({ user: await profileFor(context,fresh) });
}
