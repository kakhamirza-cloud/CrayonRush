import { json, currentUser, profileFor } from "../_lib/core.js";
export async function onRequestGet(context) {
  const u = await currentUser(context);
  if (!u) return json({ user: null });
  return json({ user: await profileFor(context, u) });
}
