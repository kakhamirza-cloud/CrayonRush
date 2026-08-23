import { json, utcDay } from "../_lib/core.js";
export async function onRequestGet(context) {
  const day = utcDay();
  const r = await context.env.DB.prepare(
    "SELECT u.x_handle AS handle,d.best_score AS score FROM daily_scores d JOIN users u ON u.id=d.user_id WHERE d.day_utc=? ORDER BY d.best_score DESC,u.x_handle ASC LIMIT 20"
  ).bind(day).all();
  return json({ day, entries: r.results || [] });
}
