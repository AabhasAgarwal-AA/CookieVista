/**
 * API Route: Submit a transaction to Cookie Chain
 *
 * Accepts a base64-encoded serialized transaction and forwards it to
 * the Cookie Chain RPC via sendTransaction.
 *
 * Also supports simulating a transaction (for demo / preview) —
 * the client passes `simulate: true` and the server returns a fake
 * successful confirmation so the UI can demo end-to-end flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_CHAIN_CONFIG } from "@/lib/cookie-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { simulate = false, signedTx, fromAddress, action, params = {} } = body;

    // === Simulation mode ===
    // For demoing the UI without an actual signed transaction.
    if (simulate) {
      const sig =
        body.signature ||
        // Deterministic fake signature derived from time + address
        Array.from({ length: 64 }, (_, i) =>
          "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[
            ((Date.now() + (fromAddress?.charCodeAt(i % (fromAddress?.length || 1)) || 0) * 31 + i * 7) % 58) | 0
          ]
        ).join("");

      // Simulate sub-second confirmation latency (Cookie Chain feature)
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

      return NextResponse.json({
        simulated: true,
        signature: sig,
        status: "confirmed",
        confirmations: 32,
        slot: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100),
        blockTime: Math.floor(Date.now() / 1000),
        fee: 0.00042,
        feeCurrency: COOKIE_CHAIN_CONFIG.nativeTokenSymbol,
        action: action ?? "unknown",
        params,
        explorerUrl: `https://cookiescan.io/tx/${sig}`,
        latencyMs: 400,
      });
    }

    // === Real transaction submission ===
    if (!signedTx) {
      return NextResponse.json(
        { error: "Missing 'signedTx' field (base64-encoded signed transaction)" },
        { status: 400 }
      );
    }

    const rpcRes = await fetch(COOKIE_CHAIN_CONFIG.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Math.floor(Math.random() * 1e9),
        method: "sendTransaction",
        params: [
          signedTx,
          { encoding: "base64", skipPreflight: false, maxRetries: 3 },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });

    const json = await rpcRes.json();

    if (json.error) {
      return NextResponse.json(
        {
          status: "error",
          error: json.error.message ?? "RPC error",
          code: json.error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      simulated: false,
      signature: json.result,
      status: "submitted",
      action,
      params,
      explorerUrl: `https://cookiescan.io/tx/${json.result}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message ?? "Failed to submit transaction",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Status check endpoint
  const { searchParams } = new URL(req.url);
  const signature = searchParams.get("signature");

  if (!signature) {
    return NextResponse.json({
      message: "Submit transactions via POST. Use ?signature= to check status.",
    });
  }

  // Simulated status check
  if (signature.length === 64 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(signature) === false) {
    // Detected as a simulated signature (our fake format)
    return NextResponse.json({
      signature,
      status: "confirmed",
      confirmations: 32,
      slot: Math.floor(Date.now() / 1000),
      blockTime: Math.floor(Date.now() / 1000),
    });
  }

  // Real signature — query RPC
  try {
    const rpcRes = await fetch(COOKIE_CHAIN_CONFIG.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignatureStatuses",
        params: [[signature]],
      }),
      signal: AbortSignal.timeout(6000),
    });
    const json = await rpcRes.json();
    const status = json?.result?.value?.[0];
    return NextResponse.json({
      signature,
      status: status?.confirmationStatus ?? "pending",
      slot: status?.slot ?? null,
      err: status?.err ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch signature status" },
      { status: 500 }
    );
  }
}
