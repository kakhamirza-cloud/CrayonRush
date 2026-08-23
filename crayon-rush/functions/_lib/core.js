export const WL_PRICE = 1000;
export const GAME_SECONDS = 20;

export function utcDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
export function nextUtcMidnight(d = new Date()) {
  const n = new Date(d);
  n.setUTCHours(24, 0, 0, 0);
  return n.toISOString();
}
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra }
  });
}
export function normalizeHandle(v) {
  const s = String(v || "").trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);
  return s.length >= 2 ? "@" + s : "";
}
export function getCookie(req, name) {
  const c = req.headers.get("cookie") || "";
  const m = c.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}
export async function currentUser(context) {
  const id = getCookie(context.request, "cr_session");
  if (!id) return null;
  return await context.env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();
}
export function userDto(u, todayBestRP = 0, previousDaysRP = 0) {
  return {
    handle: u.x_handle,
    character: u.character || "",
    rpBalance: Number(u.rp_balance || 0),
    races: Number(u.races || 0),
    bestScore: Number(u.best_score || 0),
    todayBestRP: Number(todayBestRP || 0),
    previousDaysRP: Number(previousDaysRP || 0),
    wlClaimed: Boolean(u.wl_claimed),
    wallet: u.wallet || null
  };
}
export async function profileFor(context, u) {
  const day = utcDay();
  const today = await context.env.DB.prepare("SELECT best_rp FROM daily_scores WHERE user_id=? AND day_utc=?").bind(u.id, day).first();
  const previous = await context.env.DB.prepare("SELECT COALESCE(SUM(best_rp),0) AS total FROM daily_scores WHERE user_id=? AND day_utc<?").bind(u.id, day).first();
  return userDto(u, today?.best_rp || 0, previous?.total || 0);
}
export async function wlRemaining(env) {
  const limit = Number((await env.DB.prepare("SELECT value FROM settings WHERE key='game_wl_limit'").first())?.value || 200);
  const claimed = Number((await env.DB.prepare("SELECT value FROM settings WHERE key='game_wl_claimed'").first())?.value || 0);
  return Math.max(0, limit - claimed);
}
export async function validateTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const d = await r.json();
  return Boolean(d.success);
}
