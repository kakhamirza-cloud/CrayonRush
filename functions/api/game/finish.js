import { json, currentUser, utcDay, profileFor } from "../../_lib/core.js";
const BASE_SPEED=300,ACCEL=8.5,MAX_SPEED=720,SCORE_DIVISOR=12,MAX_RUN_MS=5*60*1000;
function expectedScoreForMs(ms){
  const t=Math.max(0,Math.min(MAX_RUN_MS,ms))/1000,tCap=(MAX_SPEED-BASE_SPEED)/ACCEL;
  let distance;
  if(t<=tCap) distance=BASE_SPEED*t+0.5*ACCEL*t*t;
  else{const capDistance=BASE_SPEED*tCap+0.5*ACCEL*tCap*tCap;distance=capDistance+MAX_SPEED*(t-tCap)}
  return Math.floor(distance/SCORE_DIVISOR);
}
function rushPointsForScore(score){if(score<25)return 0;return Math.min(180,Math.floor(3*Math.sqrt(score)))}
export async function onRequestPost(context){
  const u=await currentUser(context);if(!u)return json({error:"Session expired."},401);
  const body=await context.request.json().catch(()=>({})),score=Number(body.score),durationMs=Number(body.durationMs),jumps=Number(body.jumps||0),obstaclesCleared=Number(body.obstaclesCleared||0);
  const session=await context.env.DB.prepare("SELECT * FROM game_sessions WHERE id=? AND user_id=?").bind(body.sessionId,u.id).first();
  if(!session||session.used)return json({error:"Invalid or already-used game session."},409);
  const now=Date.now(),serverElapsed=now-Number(session.started_at_ms);
  if(now>Number(session.expires_at_ms))return json({error:"Game session expired."},400);
  if(!Number.isFinite(durationMs)||durationMs<0||durationMs>MAX_RUN_MS+3000)return json({error:"Invalid run duration."},400);
  if(Math.abs(serverElapsed-durationMs)>3500)return json({error:"Run timing did not match the server session."},400);
  if(!Number.isInteger(score)||score<0)return json({error:"Invalid score."},400);
  const expected=expectedScoreForMs(durationMs);
  if(score>expected+35)return json({error:"Impossible distance rejected."},400);
  const seconds=Math.max(1,durationMs/1000);
  if(!Number.isInteger(jumps)||jumps<0||jumps>Math.ceil(seconds*4.5))return json({error:"Impossible jump rate rejected."},400);
  if(!Number.isInteger(obstaclesCleared)||obstaclesCleared<0||obstaclesCleared>Math.ceil(seconds*2.2))return json({error:"Impossible obstacle count rejected."},400);

  const day=utcDay(),old=await context.env.DB.prepare("SELECT best_score,best_rp FROM daily_scores WHERE user_id=? AND day_utc=?").bind(u.id,day).first();
  const runRP=rushPointsForScore(score),oldBestRP=Number(old?.best_rp||0),oldBestScore=Number(old?.best_score||0),newBestRP=Math.max(oldBestRP,runRP),newBestScore=Math.max(oldBestScore,score),addedRP=newBestRP-oldBestRP,iso=new Date().toISOString();
  await context.env.DB.batch([
    context.env.DB.prepare("UPDATE game_sessions SET used=1 WHERE id=?").bind(session.id),
    context.env.DB.prepare("INSERT INTO daily_scores(user_id,day_utc,best_score,best_rp,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,day_utc) DO UPDATE SET best_score=MAX(best_score,excluded.best_score),best_rp=MAX(best_rp,excluded.best_rp),updated_at=excluded.updated_at").bind(u.id,day,newBestScore,newBestRP,iso),
    context.env.DB.prepare("UPDATE users SET rp_balance=rp_balance+?,lifetime_rp=lifetime_rp+?,races=races+1,best_score=MAX(best_score,?),updated_at=? WHERE id=?").bind(addedRP,addedRP,score,iso,u.id)
  ]);
  const fresh=await context.env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first();
  const rankRow=await context.env.DB.prepare("SELECT 1+COUNT(*) AS rank FROM daily_scores WHERE day_utc=? AND best_score>?").bind(day,newBestScore).first();
  return json({runRP,addedRP,rank:Number(rankRow?.rank||0),user:await profileFor(context,fresh)});
}
