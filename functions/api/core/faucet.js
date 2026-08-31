import {
  json,
  cleanWallet,
  getIp,
  publicClient,
  sendFaucetEth
} from "./_shared.js";
import { formatEther, parseEther } from "viem";

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const wallet = cleanWallet(body.wallet);
  if (!wallet) return json({ error: "Connect a valid wallet first." }, 400);

  const ip = getIp(context.request);
  const lower = wallet.toLowerCase();

  const old = await context.env.DB.prepare(
    "SELECT tx_hash FROM core_faucet_claims WHERE wallet=?"
  ).bind(lower).first();
  if (old) return json({ error: "This wallet already used the Crayon Rush test faucet.", txHash: old.tx_hash }, 409);

  const ipRow = await context.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM core_faucet_claims WHERE ip=? AND created_at >= datetime('now','-24 hours')"
  ).bind(ip).first();
  if (Number(ipRow?.n || 0) >= 3) {
    return json({ error: "Too many faucet claims from this connection today. Try the official Robinhood faucet." }, 429);
  }

  const balance = await publicClient.getBalance({ address: wallet });
  const threshold = parseEther(context.env.FAUCET_SKIP_IF_BALANCE_ETH || "0.001");
  if (balance >= threshold) {
    return json({
      ok: true,
      skipped: true,
      balance: formatEther(balance),
      message: "You already have enough testnet ETH for the demo."
    });
  }

  try {
    const txHash = await sendFaucetEth(context.env, wallet);
    await context.env.DB.prepare(
      "INSERT INTO core_faucet_claims(wallet,ip,tx_hash,created_at) VALUES(?,?,?,?)"
    ).bind(lower, ip, txHash, new Date().toISOString()).run();

    return json({ ok: true, txHash });
  } catch (e) {
    console.error("faucet error", e);
    return json({
      error: "Crayon Rush faucet is temporarily empty or unavailable. Use the official Robinhood testnet faucet."
    }, 503);
  }
}
