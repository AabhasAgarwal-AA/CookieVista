/**
 * API Route: Liquidity pools on Cookie Chain (Cookiebox-style)
 *
 * Returns pool data. In production this would query Cookieswap / Cookiebox
 * contracts; here we return representative pool data with live-looking
 * volume updates.
 */

import { NextResponse } from "next/server";
import { COOKIE_POOLS } from "@/lib/cookie-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Add tiny random jitter to volume/tvl to simulate live updates
  const now = Date.now();
  const jitter = (base: number, factor = 0.005) =>
    base * (1 + (Math.sin(now / 60000) * factor + (Math.random() - 0.5) * factor));

  const pools = COOKIE_POOLS.map((p) => ({
    ...p,
    tvl: jitter(p.tvl),
    volume24h: jitter(p.volume24h, 0.02),
    apr: p.apr + Math.sin(now / 120000) * 0.5,
  }));

  const totalTvl = pools.reduce((sum, p) => sum + p.tvl, 0);
  const totalVolume = pools.reduce((sum, p) => sum + p.volume24h, 0);

  return NextResponse.json({
    pools,
    totalTvl,
    totalVolume,
    poolCount: pools.length,
    timestamp: now,
  });
}
