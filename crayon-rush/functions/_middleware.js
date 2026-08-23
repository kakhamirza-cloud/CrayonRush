import { json } from "./_lib/core.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith("/api/")) return context.next();

  // Basic origin protection for state-changing requests.
  if (!["GET","HEAD","OPTIONS"].includes(context.request.method)) {
    const origin = context.request.headers.get("origin");
    if (origin && origin !== url.origin) return json({ error: "Invalid origin." }, 403);
  }

  const res = await context.next();
  const h = new Headers(res.headers);
  h.set("x-content-type-options","nosniff");
  h.set("referrer-policy","same-origin");
  h.set("permissions-policy","camera=(), microphone=(), geolocation=()");
  return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h});
}
