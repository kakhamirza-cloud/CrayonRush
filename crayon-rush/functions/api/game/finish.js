import { json, currentUser, utcDay, profileFor, GAME_SECONDS } from "../../_lib/core.js";
export async function onRequestPost(context) {
  const u = await currentUser(context); if (!u) return json({ error: "Session expired." }, 401);
  const body = await context.request.json().catch(() => ({}));
  const score = Number(body.score);
  const session = await context.env.DB.prepare("SELECT * FROM game_sessions WHERE id=? AND user_id=?").bind(body.sessionId,u.id).first();
  if (!session || session.used) return json({ error: "Invalid or already-used game session." }, 409);

  const now = Date.now(), elapsed = now - Number(session.started_at_ms);
  if (now > Number(session.expires_at_ms)) return json({ error: "Game session expired." }, 400);
  if (elapsed < (GAME_SECONDS-2)*1000) return json({ error: "Run finished impossibly fast." }, 400);
  if (!Number.isInteger(score) || score < 0 || score > 700) return json({ error: "Impossible score rejected." }, 400);

  const moves = Array.isArray(body.moves) ? body.moves : [];
  if (moves.length > 160) return json({ error: "Impossible input rate rejected." }, 400);
  let prevLane = 1, prevT = Number(session.started_at_ms);
  for (const m of moves) {
    const lane = Number(m.lane), t = Number(m.t);
    if (![0,1,2].includes(lane) || !Number.isFinite(t) || t < prevT || t > now || Math.abs(lane-prevLane) > 1) {
      return json({ error: "Invalid movement sequence." }, 400);
    }
    if (t - prevT < 20) return json({ error: "Input rate too fast." }, 400);
    prevLane = lane; prevT = t;
  }

  const day = utcDay();
  const old = await context.env.DB.prepare("SELECT best_score,best_rp FROM daily_scores WHERE user_id=? AND day_utc=?").bind(u.id,day).first();
  const runRP = Math.max(15, Math.floor(score * 0.75));
  const oldBestRP = Number(old?.best_rp || 0), oldBestScore = Number(old?.best_score || 0);
  const newBestRP = Math.max(oldBestRP, runRP), newBestScore = Math.max(oldBestScore, score);
  const addedRP = newBestRP - oldBestRP;
  const iso = new Date().toISOString();

  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE game_sessions SET used=1 WHERE id=?").bind(session.id),
    context.env.DB.prepare(
      "INSERT INTO daily_scores(user_id,day_utc,best_score,best_rp,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,day_utc) DO UPDATE SET best_score=MAX(best_score,excluded.best_score),best_rp=MAX(best_rp,excluded.best_rp),updated_at=excluded.updated_at"
    ).bind(u.id,day,newBestScore,newBestRP,iso),
    context.env.DB.prepare(
      "UPDATE users SET rp_balance=rp_balance+?,lifetime_rp=lifetime_rp+?,races=races+1,best_score=MAX(best_score,?),updated_at=? WHERE id=?"
    ).bind(addedRP,addedRP,score,iso,u.id)
  ]);

  const fresh = await context.env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first();
  const rankRow = await context.env.DB.prepare(
    "SELECT 1+COUNT(*) AS rank FROM daily_scores WHERE day_utc=? AND best_score>?"
  ).bind(day,newBestScore).first();
  return json({ runRP,addedRP,rank:Number(rankRow?.rank||0),user:await profileFor(context,fresh) });
}
