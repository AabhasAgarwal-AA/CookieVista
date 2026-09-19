/**
 * API Route: Token swap quote (Cookieswap-style)
 *
 * Returns a swap quote based on a constant-product AMM formula
 * (x * y = k) with a configurable fee tier. This mirrors how a
 * Solana-based AMM would quote a swap on Cookie Chain.
 *
 * In production this would call the Cookieswap program. Here we compute
 * the quote locally to demonstrate the UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_TOKENS } from "@/lib/cookie-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Pool {
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  feeBps: number;
}

// Representative AMM reserves (these would come from Cookieswap on-chain)
const POOLS: Pool[] = [
  { tokenA: "COOKIE", tokenB: "milk", reserveA: 1_280_000, reserveB: 6_400_000, feeBps: 30 },
  { tokenA: "COOKIE", tokenB: "CHIP", reserveA: 890_000, reserveB: 2_100_000, feeBps: 30 },
  { tokenA: "COOKIE", tokenB: "BUTR", reserveA: 640_000, reserveB: 1_980_000, feeBps: 30 },
  { tokenA: "COOKIE", tokenB: "SUGR", reserveA: 298_000, reserveB: 1_490_000, feeBps: 30 },
  { tokenA: "CHIP", tokenB: "milk", reserveA: 410_000, reserveB: 1_300_000, feeBps: 30 },
  { tokenA: "OVEN", tokenB: "JAR", reserveA: 187_000, reserveB: 312_000, feeBps: 30 },
  { tokenA: "DOUGH", tokenB: "COOKIE", reserveA: 156_000, reserveB: 312_000, feeBps: 30 },
];

function findPool(from: string, to: string): Pool | null {
  let p = POOLS.find((x) => x.tokenA === from && x.tokenB === to);
  if (p) return p;
  p = POOLS.find((x) => x.tokenA === to && x.tokenB === from);
  if (p) return { ...p, reserveA: p.reserveB, reserveB: p.reserveA };
  return null;
}

/** Compute AMM output amount using constant-product formula. */
function computeOut(amountIn: number, reserveIn: number, reserveOut: number, feeBps: number): number {
  if (amountIn <= 0) return 0;
  const amountInWithFee = amountIn * (10_000 - feeBps);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10_000 + amountInWithFee;
  return denominator > 0 ? numerator / denominator : 0;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const amount = parseFloat(searchParams.get("amount") || "0");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing 'from' or 'to' parameter" }, { status: 400 });
  }

  const fromToken = COOKIE_TOKENS.find((t) => t.symbol === from);
  const toToken = COOKIE_TOKENS.find((t) => t.symbol === to);

  if (!fromToken || !toToken) {
    return NextResponse.json({ error: "Unknown token symbol" }, { status: 400 });
  }

  if (from === to) {
    return NextResponse.json({
      from,
      to,
      amountIn: amount,
      amountOut: amount,
      priceImpact: 0,
      fee: amount * 0.003,
      feeBps: 30,
      rate: 1,
      route: "direct",
    });
  }

  const pool = findPool(from, to);

  if (!pool) {
    // Try routed path: from → COOKIE → to
    const leg1 = findPool(from, "COOKIE");
    const leg2 = findPool("COOKIE", to);
    if (leg1 && leg2) {
      const mid = computeOut(amount, leg1.reserveA, leg1.reserveB, leg1.feeBps);
      const out = computeOut(mid, leg2.reserveA, leg2.reserveB, leg2.feeBps);
      const priceImpact = amount > 0 ? Math.max(0, (1 - out / (amount * (leg2.reserveB / leg1.reserveA))) * 100) : 0;
      return NextResponse.json({
        from,
        to,
        amountIn: amount,
        amountOut: out,
        priceImpact: parseFloat(priceImpact.toFixed(2)),
        fee: amount * 0.003,
        feeBps: 30,
        rate: amount > 0 ? out / amount : 0,
        route: `${from} → COOKIE → ${to}`,
        minimumReceived: parseFloat((out * 0.995).toFixed(6)),
      });
    }
    return NextResponse.json({ error: `No liquidity path from ${from} to ${to}` }, { status: 404 });
  }

  const amountOut = computeOut(amount, pool.reserveA, pool.reserveB, pool.feeBps);
  const spotRate = pool.reserveB / pool.reserveA;
  const effectiveRate = amount > 0 ? amountOut / amount : 0;
  const priceImpact = Math.max(0, (1 - effectiveRate / spotRate) * 100);

  return NextResponse.json({
    from,
    to,
    amountIn: amount,
    amountOut: parseFloat(amountOut.toFixed(6)),
    priceImpact: parseFloat(priceImpact.toFixed(2)),
    fee: parseFloat((amount * pool.feeBps / 10_000).toFixed(6)),
    feeBps: pool.feeBps,
    rate: parseFloat(effectiveRate.toFixed(6)),
    route: "direct",
    minimumReceived: parseFloat((amountOut * 0.995).toFixed(6)),
    reserves: { reserveA: pool.reserveA, reserveB: pool.reserveB },
  });
}
