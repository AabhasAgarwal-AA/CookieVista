/**
 * API Route: Proxy RPC requests to Cookie Chain
 *
 * Cookie Chain RPC: https://rpc.cookiescan.io
 *
 * This proxies JSON-RPC requests from the browser to the Cookie Chain RPC,
 * avoiding CORS issues and keeping the RPC URL configurable server-side.
 */

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_CHAIN_CONFIG } from "@/lib/cookie-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rpcRes = await fetch(COOKIE_CHAIN_CONFIG.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Short timeout — Cookie Chain is sub-second finality
      signal: AbortSignal.timeout(8000),
    });

    const text = await rpcRes.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from RPC", raw: text.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json(json, { status: rpcRes.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message ?? "RPC proxy error",
        name: err?.name ?? "RpcError",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Cookie Chain RPC proxy. Send JSON-RPC POST requests.",
    endpoint: COOKIE_CHAIN_CONFIG.rpcEndpoint,
    methods: ["getHealth", "getSlot", "getBlockHeight", "getEpochInfo"],
  });
}
