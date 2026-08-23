import { json, nextUtcMidnight, wlRemaining } from "../_lib/core.js";
export async function onRequestGet(context) {
  return json({
    serverTime: new Date().toISOString(),
    resetAt: nextUtcMidnight(),
    wlRemaining: await wlRemaining(context.env),
    wlLimit: 200,
    wlPrice: 1000
  });
}
