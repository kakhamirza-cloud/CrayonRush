import { json, normalizeHandle, getCookie, profileFor } from "../_lib/core.js";

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const handle = normalizeHandle(body.handle);
  if (!handle) return json({ error: "Enter a valid X handle." }, 400);

  const existingCookie = getCookie(context.request, "cr_session");
  if (existingCookie) {
    const mine = await context.env.DB.prepare("SELECT * FROM users WHERE id=?").bind(existingCookie).first();
    if (mine) {
      if (mine.x_handle.toLowerCase() !== handle.toLowerCase()) return json({ error: "This browser already locked a different X username." }, 409);
      return json({ handle: mine.x_handle, user: await profileFor(context, mine) });
    }
  }

  const taken = await context.env.DB.prepare("SELECT id FROM users WHERE x_handle=? COLLATE NOCASE").bind(handle).first();
  if (taken) return json({ error: "That X username is already registered." }, 409);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await context.env.DB.prepare(
    "INSERT INTO users(id,x_handle,character,created_at,updated_at) VALUES(?,?,?,?,?)"
  ).bind(id, handle, body.character || null, now, now).run();

  const headers = {
    "set-cookie": `cr_session=${encodeURIComponent(id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`
  };
  return json({ handle }, 200, headers);
}
