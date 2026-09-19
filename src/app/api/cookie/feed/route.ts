/**
 * API Route: Live on-chain activity feed
 *
 * Fetches REAL transactions from Cookie Chain via the System Program address
 * (which is involved in every transaction that pays fees). Returns parsed
 * feed items with type, from/to, amount, program, and the real signature
 * that links to the explorer.
 *
 * Cached for 15s to avoid hammering the RPC on every poll.
 */

import { NextResponse } from "next/server";
import { COOKIE_CHAIN_CONFIG } from "@/lib/cookie-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- Types ---

export interface FeedItem {
  id: string;
  type: "swap" | "transfer" | "deploy" | "mint" | "vote" | "program";
  signature: string;
  slot: number;
  blockTime: number;
  from: string;
  to: string;
  amount?: string;
  program?: string;
  instruction?: string;
  err: boolean;
}

interface ApiResponse {
  items: FeedItem[];
  live: boolean;
  count: number;
  timestamp: number;
  cached?: boolean;
  source?: string;
  error?: string;
}

// --- RPC helper ---

async function rpcCall<T>(method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(COOKIE_CHAIN_CONFIG.rpcEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Math.floor(Math.random() * 1e9),
        method,
        params,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.error) return null;
    return json.result ?? null;
  } catch {
    return null;
  }
}

// --- Cache (module-level, survives between requests) ---

let cache: { items: FeedItem[]; timestamp: number } | null = null;
const CACHE_TTL = 15000; // 15 seconds

// --- Transaction parser ---

// Known program IDs on Solana / Cookie Chain (SVM-compatible)
const PROGRAM_LABELS: Record<string, { name: string; type: FeedItem["type"] }> = {
  "11111111111111111111111111111111": { name: "System", type: "transfer" },
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: { name: "Token", type: "transfer" },
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: { name: "AssociatedToken", type: "deploy" },
  "BPFLoader2111111111111111111111111111111111": { name: "BPFLoader", type: "deploy" },
  Vote111111111111111111111111111111111111111: { name: "Vote", type: "vote" },
  ComputeBudget111111111111111111111111111111: { name: "ComputeBudget", type: "program" },
  "Config1111111111111111111111111111111111111": { name: "Config", type: "program" },
  Stake11111111111111111111111111111111111111: { name: "Stake", type: "program" },
  MemoSq4gqABAXKb96qnH8TysNcWUMytCcjDJFwfoQVFo: { name: "Memo", type: "program" },
};

function labelProgram(pid: string): { name: string; type: FeedItem["type"] } {
  return PROGRAM_LABELS[pid] ?? { name: pid.slice(0, 8), type: "program" };
}

function parseTransaction(
  tx: any,
  signature: string,
  fallbackSlot: number,
  fallbackBlockTime: number
): FeedItem | null {
  if (!tx) return null;

  const meta = tx.meta || {};
  const message = tx.transaction?.message || {};
  const accountKeys: string[] = message.accountKeys || [];
  const instructions: any[] = message.instructions || [];
  const innerInstructions: any[] = meta.innerInstructions || [];
  const preBalances: number[] = meta.preBalances || [];
  const postBalances: number[] = meta.postBalances || [];
  const preTokenBalances: any[] = meta.preTokenBalances || [];
  const postTokenBalances: any[] = meta.postTokenBalances || [];
  const logMessages: string[] = meta.logMessages || [];

  // Collect ALL instructions (top-level + inner) for type detection
  const allInstructions = [
    ...instructions,
    ...innerInstructions.flatMap((inner: any) => inner.instructions || []),
  ];

  // Resolve a programId that might be an index into accountKeys
  const resolvePid = (inst: any): string => {
    if (!inst) return "";
    if (inst.programId) return inst.programId;
    if (typeof inst.programIdIndex === "number" && accountKeys[inst.programIdIndex]) {
      return accountKeys[inst.programIdIndex];
    }
    return "";
  };

  // Determine the PRIMARY instruction (skip ComputeBudget which is just gas settings)
  const primaryInst =
    allInstructions.find((inst) => {
      const pid = resolvePid(inst);
      return pid !== "ComputeBudget111111111111111111111111111111";
    }) || allInstructions[0];

  const primaryPid = resolvePid(primaryInst);
  const { name: programName, type } = labelProgram(primaryPid);

  // Try to extract the instruction name from log messages
  let instruction: string | undefined;
  for (const log of logMessages) {
    const m = log.match(/Instruction:\s*(\w+)/);
    if (m) {
      instruction = m[1];
      break;
    }
  }
  // Also check parsed type
  if (!instruction && primaryInst?.parsed?.type) {
    instruction = primaryInst.parsed.type;
  }

  // From = fee payer (first account key)
  const from = accountKeys[0] || "unknown";

  // Determine "to" and "amount"
  let to = accountKeys[1] || from;
  let amount = "";

  // 1. Check inner instructions for parsed transfers (most accurate)
  for (const inner of innerInstructions) {
    for (const inst of inner.instructions || []) {
      const parsed = inst.parsed;
      if (!parsed || typeof parsed !== "object") continue;

      if (parsed.type === "transfer" && parsed.info?.amount) {
        const rawAmt = parseInt(parsed.info.amount);
        if (!isNaN(rawAmt) && rawAmt > 0) {
          // Determine decimals from token balances if possible
          const acctIdx = inst.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            ? (accountKeys.indexOf(parsed.info.source) >= 0
              ? accountKeys.indexOf(parsed.info.source)
              : inner.index)
            : inner.index;
          // Default to 9 decimals (SOL/COOKIE), but check token balances for actual
          let decimals = 9;
          const tokenBal = postTokenBalances.find(
            (tb) => tb.accountIndex === inner.index
          );
          if (tokenBal?.uiTokenAmount?.decimals !== undefined) {
            decimals = tokenBal.uiTokenAmount.decimals;
          }
          const uiAmt = rawAmt / Math.pow(10, decimals);
          amount = `${uiAmt.toFixed(4)}`;
          if (parsed.info.source) to = parsed.info.source;
          if (parsed.info.destination) to = parsed.info.destination;
        }
      }
      if (parsed.type === "mintTo" && parsed.info?.amount) {
        const rawAmt = parseInt(parsed.info.amount);
        if (!isNaN(rawAmt) && rawAmt > 0) {
          const uiAmt = rawAmt / 1e6; // default 6 decimals for tokens
          amount = `${uiAmt.toFixed(4)} (minted)`;
          if (parsed.info.mint) to = parsed.info.mint;
        }
      }
    }
  }

  // 2. Check SOL (COOKIE) balance changes
  if (!amount && preBalances.length > 1) {
    let maxDiff = 0;
    let maxDiffIdx = -1;
    for (let i = 1; i < Math.min(preBalances.length, accountKeys.length); i++) {
      const pb = preBalances[i] || 0;
      const pab = postBalances[i] || 0;
      const diff = (pab - pb) / 1e9;
      if (Math.abs(diff) > Math.abs(maxDiff)) {
        maxDiff = diff;
        maxDiffIdx = i;
      }
    }
    if (Math.abs(maxDiff) > 0.001) {
      amount = `${Math.abs(maxDiff).toFixed(4)} COOKIE`;
      if (maxDiffIdx >= 0) {
        to = accountKeys[maxDiffIdx] || to;
      }
    }
  }

  // 3. Check token balance changes
  if (!amount) {
    for (let i = 0; i < postTokenBalances.length; i++) {
      const post = postTokenBalances[i];
      const pre = preTokenBalances.find(
        (p) => p.accountIndex === post.accountIndex
      );
      const preAmt = pre?.uiTokenAmount?.uiAmount || 0;
      const postAmt = post?.uiTokenAmount?.uiAmount || 0;
      const diff = Math.abs(postAmt - preAmt);
      if (diff > 0.001) {
        const decimals = post.uiTokenAmount?.decimals || 6;
        amount = `${diff.toFixed(decimals > 6 ? 2 : 4)} SPL`;
        if (post.accountIndex !== undefined && accountKeys[post.accountIndex]) {
          to = accountKeys[post.accountIndex];
        }
        break;
      }
    }
  }

  // Override type based on detected instruction
  let finalType = type;
  if (instruction) {
    const il = instruction.toLowerCase();
    if (il.includes("swap")) finalType = "swap";
    else if (il.includes("mint") || il === "mintto") finalType = "mint";
    else if (il.includes("createaccount") || il.includes("create") || il.includes("initialize"))
      finalType = "deploy";
    else if (il === "transfer") finalType = "transfer";
    else if (il.includes("vote")) finalType = "vote";
  }

  // If it's a vote transaction, simplify
  if (type === "vote" || (logMessages[0] || "").includes("Vote111111")) {
    return {
      id: signature,
      type: "vote",
      signature,
      slot: tx.slot || fallbackSlot,
      blockTime: tx.blockTime || fallbackBlockTime,
      from,
      to: accountKeys[2] || to,
      program: "Vote",
      err: !!meta.err,
    };
  }

  return {
    id: signature,
    type: finalType,
    signature,
    slot: tx.slot || fallbackSlot,
    blockTime: tx.blockTime || fallbackBlockTime,
    from,
    to,
    amount: amount || undefined,
    program: programName,
    instruction,
    err: !!meta.err,
  };
}

// --- Main handler ---

export async function GET(): NextResponse {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    const response: ApiResponse = {
      items: cache.items,
      live: true,
      count: cache.items.length,
      timestamp: cache.timestamp,
      cached: true,
    };
    return NextResponse.json(response);
  }

  try {
    // Use the System Program address — it's involved in every transaction
    // that pays fees, so we get the widest variety of real transactions.
    const SOURCE = "11111111111111111111111111111111";

    // Step 1: Get recent signatures
    const signatures = await rpcCall<any[]>("getSignaturesForAddress", [
      SOURCE,
      { limit: 25 },
    ]);

    if (!signatures || signatures.length === 0) {
      // Fallback: try the node identity
      const fallbackSigs = await rpcCall<any[]>("getSignaturesForAddress", [
        "4wHgybVzqEKn17HRh1MXdLDdaZDh6Y59atZrLtygmCew",
        { limit: 25 },
      ]);
      if (!fallbackSigs || fallbackSigs.length === 0) {
        const empty: ApiResponse = {
          items: [],
          live: false,
          count: 0,
          timestamp: Date.now(),
          error: "No recent transactions found on Cookie Chain",
        };
        return NextResponse.json(empty);
      }
      signatures.push(...fallbackSigs);
    }

    // Step 2: Fetch transaction details (concurrency 5)
    const items: FeedItem[] = [];
    const CONCURRENCY = 5;

    for (let i = 0; i < signatures.length; i += CONCURRENCY) {
      const batch = signatures.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (sig: any) => {
          const tx = await rpcCall<any>("getTransaction", [
            sig.signature,
            { maxSupportedTransactionVersion: 0 },
          ]);
          return parseTransaction(
            tx,
            sig.signature,
            sig.slot || 0,
            sig.blockTime || Math.floor(Date.now() / 1000)
          );
        })
      );
      items.push(...results.filter((r): r is FeedItem => r !== null));
    }

    // Step 3: Sort by blockTime descending (newest first)
    items.sort((a, b) => b.blockTime - a.blockTime);

    // Step 4: Cache
    cache = { items, timestamp: Date.now() };

    const response: ApiResponse = {
      items,
      live: true,
      count: items.length,
      timestamp: Date.now(),
      source: "Cookie Chain RPC",
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (err: any) {
    // Return stale cache if available
    if (cache) {
      const response: ApiResponse = {
        items: cache.items,
        live: false,
        count: cache.items.length,
        timestamp: cache.timestamp,
        cached: true,
        error: "Using cached data — RPC temporarily unavailable",
      };
      return NextResponse.json(response);
    }

    const errorResponse: ApiResponse = {
      items: [],
      live: false,
      count: 0,
      timestamp: Date.now(),
      error: err?.message ?? "Failed to fetch transactions from Cookie Chain",
    };
    return NextResponse.json(errorResponse);
  }
}
