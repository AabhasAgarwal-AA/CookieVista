"use client";

import * as React from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useWallet, copyAddress } from "@/lib/wallet";
import { COOKIE_TOKENS } from "@/lib/cookie-chain";
import { cn } from "@/lib/utils";
import {
  Copy,
  ExternalLink,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

interface AccountData {
  address: string;
  balanceLamports: number;
  balance: number;
  balanceFormatted: string;
  tokens: {
    symbol: string;
    amount: number;
    decimals: number;
    native: boolean;
  }[];
  recentTransactions: {
    signature: string;
    slot: number;
    err: any;
    memo: string | null;
    blockTime: number | null;
    confirmationStatus: string;
  }[];
  timestamp: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PRICES: Record<string, number> = {
  COOKIE: 1.42, milk: 0.18, CHIP: 0.34, BUTR: 0.92,
  SUGR: 0.07, OVEN: 1.85, DOUGH: 0.42, JAR: 2.31,
};
const PREV_PRICES: Record<string, number> = {
  COOKIE: 1.39, milk: 0.19, CHIP: 0.31, BUTR: 0.95,
  SUGR: 0.06, OVEN: 1.79, DOUGH: 0.45, JAR: 2.18,
};

function getToken(symbol: string) {
  return COOKIE_TOKENS.find((t) => t.symbol === symbol);
}

function timeAgo(unixSec: number | null): string {
  if (!unixSec) return "—";
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function PortfolioTracker() {
  const { connected, address } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const { data, error, isLoading, mutate } = useSWR<AccountData>(
    connected && address ? `/api/cookie/account?address=${address}` : null,
    fetcher,
    { refreshInterval: 12000 }
  );

  const handleCopy = async () => {
    const ok = await copyAddress(address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: "Address copied" });
    }
  };

  const portfolio = React.useMemo(() => {
    if (!data?.tokens) return null;
    let totalValue = 0;
    let prevValue = 0;
    const holdings = data.tokens.map((t) => {
      const price = PRICES[t.symbol] ?? 0;
      const prev = PREV_PRICES[t.symbol] ?? price;
      const value = t.amount * price;
      const prevTotal = t.amount * prev;
      totalValue += value;
      prevValue += prevTotal;
      const change = prevTotal > 0 ? ((value - prevTotal) / prevTotal) * 100 : 0;
      return { ...t, price, value, change };
    });
    const totalChange = prevValue > 0 ? ((totalValue - prevValue) / prevValue) * 100 : 0;
    return { holdings, totalValue, totalChange };
  }, [data]);

  if (!connected) {
    return (
      <Card className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
        <Wallet className="mb-3 h-5 w-5 text-muted-foreground" />
        <h3 className="mb-1 text-[13px] font-medium">No wallet connected</h3>
        <p className="max-w-[260px] text-xs leading-relaxed text-muted-foreground">
          Connect your Nightly or Phantom wallet to view your COOKIE balance
          and on-chain activity.
        </p>
      </Card>
    );
  }

  return (
    <Card className="gap-0 py-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-[13px] font-medium tracking-tight">Portfolio</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Cookie Chain holdings
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => mutate()}
          disabled={isLoading}
          aria-label="Refresh portfolio"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5 border-b px-4 py-2.5">
        <code className="flex-1 truncate rounded-sm border bg-muted/50 px-2 py-1 font-mono text-[11px]">
          {address}
        </code>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleCopy}>
          {copied ? (
            <CheckCircle2 className="h-3 w-3 text-positive" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7"
          onClick={() => window.open(`https://cookiescan.io/address/${address}`, "_blank")}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>

      {/* Total balance */}
      {isLoading && !data ? (
        <div className="px-4 py-4">
          <Skeleton className="h-14 w-full rounded-sm" />
        </div>
      ) : portfolio ? (
        <div className="border-b px-4 py-4">
          <div className="eyebrow">Net worth</div>
          <div className="mt-2 text-[26px] font-medium leading-none tracking-tight tnum">
            ${portfolio.totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {portfolio.totalChange >= 0 ? (
              <TrendingUp className="h-3 w-3 text-positive" />
            ) : (
              <TrendingDown className="h-3 w-3 text-negative" />
            )}
            <span
              className={cn(
                "font-mono text-xs tnum",
                portfolio.totalChange >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {portfolio.totalChange >= 0 ? "+" : ""}
              {portfolio.totalChange.toFixed(2)}%
            </span>
            <span className="text-xs text-muted-foreground">· 24h</span>
            {data?.balanceFormatted && (
              <span className="ml-auto font-mono text-xs text-muted-foreground tnum">
                {data.balanceFormatted}
              </span>
            )}
          </div>
        </div>
      ) : null}

      {/* Holdings */}
      <div className="border-b">
        <div className="eyebrow px-4 pb-1.5 pt-3">Holdings</div>
        {isLoading && !data ? (
          <div className="space-y-1 px-4 pb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-sm" />
            ))}
          </div>
        ) : portfolio ? (
          <div className="divide-y border-t">
            {portfolio.holdings.map((h) => {
              const meta = getToken(h.symbol);
              return (
                <div
                  key={h.symbol}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm border bg-muted text-[11px]">
                    {meta?.logo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium">{h.symbol}</span>
                      {h.native && <span className="eyebrow">Native</span>}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground tnum">
                      {h.amount.toLocaleString(undefined, { maximumFractionDigits: h.decimals })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[13px] tnum">
                      ${h.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div
                      className={cn(
                        "font-mono text-[10px] tnum",
                        h.change >= 0 ? "text-positive" : "text-negative"
                      )}
                    >
                      {h.change >= 0 ? "+" : ""}
                      {h.change.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            Could not load holdings.{" "}
            <button
              className="text-foreground underline underline-offset-2"
              onClick={() => mutate()}
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <div className="eyebrow px-4 pb-1.5 pt-3">Recent activity</div>
        {isLoading && !data ? (
          <div className="space-y-1 px-4 pb-3">
            <Skeleton className="h-8 w-full rounded-sm" />
            <Skeleton className="h-8 w-full rounded-sm" />
            <Skeleton className="h-8 w-full rounded-sm" />
          </div>
        ) : data?.recentTransactions && data.recentTransactions.length > 0 ? (
          <ScrollArea className="max-h-64 cv-scroll">
            <div className="divide-y border-t">
              {data.recentTransactions.map((tx) => (
                <div
                  key={tx.signature}
                  className="flex cursor-pointer items-center gap-2 px-4 py-2 transition-colors hover:bg-accent"
                  onClick={() => window.open(`https://cookiescan.io/tx/${tx.signature}`, "_blank")}
                >
                  {tx.err ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 flex-shrink-0 text-negative" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  )}
                  <code className="text-[11px] font-mono flex-1 truncate text-muted-foreground">
                    {tx.signature.slice(0, 18)}…
                  </code>
                  <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground tnum">
                    {timeAgo(tx.blockTime)}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            No transactions yet.
          </div>
        )}
      </div>

      {error && (
        <div className="border-t px-4 py-2 text-[11px] text-negative">
          Live RPC unavailable — showing representative balances.
        </div>
      )}
    </Card>
  );
}
