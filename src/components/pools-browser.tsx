"use client";

import * as React from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { SplitActionButton } from "@/components/ui/split-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { COOKIE_TOKENS } from "@/lib/cookie-chain";
import { useWallet } from "@/lib/wallet";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
} from "lucide-react";

interface Pool {
  id: string;
  pair: [string, string];
  tvl: number;
  volume24h: number;
  apr: number;
  feeTier: number;
  liquidity: string;
}

interface PoolData {
  pools: Pool[];
  totalTvl: number;
  totalVolume: number;
  poolCount: number;
  timestamp: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getToken(symbol: string) {
  return COOKIE_TOKENS.find((t) => t.symbol === symbol);
}

function formatUsd(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function PoolsBrowser() {
  const { data, error, isLoading } = useSWR<PoolData>("/api/cookie/pools", fetcher, {
    refreshInterval: 15000,
  });
  const { connected } = useWallet();
  const { toast } = useToast();

  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"tvl" | "volume24h" | "apr">("tvl");
  const [supplying, setSupplying] = React.useState<string | null>(null);

  const pools = React.useMemo(() => {
    if (!data?.pools) return [];
    let list = data.pools.filter(
      (p) =>
        p.pair[0].toLowerCase().includes(search.toLowerCase()) ||
        p.pair[1].toLowerCase().includes(search.toLowerCase())
    );
    list = list.sort((a, b) => b[sortBy] - a[sortBy]);
    return list;
  }, [data, search, sortBy]);

  const handleSupply = async (pool: Pool) => {
    if (!connected) {
      toast({
        title: "Connect your wallet",
        description: "Connect first to supply liquidity.",
        variant: "destructive",
      });
      return;
    }
    setSupplying(pool.id);
    try {
      const res = await fetch("/api/cookie/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulate: true,
          action: "add_liquidity",
          params: { pool: pool.id, pair: pool.pair, amount: 1000 },
        }),
      });
      const result = await res.json();
      await new Promise((r) => setTimeout(r, 500));

      toast({
        title: "Liquidity added",
        description: `Supplied to ${pool.pair[0]}/${pool.pair[1]} · ${result.signature?.slice(0, 12)}…`,
      });
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSupplying(null);
    }
  };

  return (
    <Card className="gap-0 py-0">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b px-4 py-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-[13px] font-medium tracking-tight">
            Liquidity pools
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Supply liquidity to earn a share of trading fees
          </p>
        </div>
        {data && (
          <div className="flex items-center gap-6">
            <Stat label="Total TVL" value={formatUsd(data.totalTvl)} />
            <Stat label="24h volume" value={formatUsd(data.totalVolume)} />
            <Stat label="Active pools" value={data.poolCount.toString()} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by token (e.g. COOKIE, milk)…"
            className="h-8 border-border-strong bg-muted/50 pl-9 text-[13px]"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="eyebrow px-1">Sort</span>
          {(["tvl", "volume24h", "apr"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className={cn(
                "h-8 rounded-md border px-2.5 text-xs transition-colors",
                sortBy === k
                  ? "border-transparent bg-foreground text-background"
                  : "border-border-strong text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {k === "tvl" ? "TVL" : k === "volume24h" ? "Volume" : "APR"}
            </button>
          ))}
        </div>
      </div>

      {/* Table header (mobile-friendly hidden) */}
      <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_110px] gap-4 border-b bg-muted/40 px-4 py-2 md:grid">
        <div className="eyebrow">Pool</div>
        <div className="eyebrow text-right">TVL</div>
        <div className="eyebrow text-right">Volume 24h</div>
        <div className="eyebrow text-right">APR</div>
        <div className="eyebrow text-right">Action</div>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-4">
              <Skeleton className="h-10 w-full rounded-sm" />
            </div>
          ))
        ) : pools.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No pools match &quot;{search}&quot;
          </div>
        ) : (
          pools.map((pool) => {
            const tokenA = getToken(pool.pair[0]);
            const tokenB = getToken(pool.pair[1]);
            return (
              <div
                key={pool.id}
                className="grid grid-cols-1 items-center gap-2 px-4 py-3 transition-colors hover:bg-accent md:grid-cols-[2fr_1fr_1fr_1fr_110px] md:gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-sm border bg-muted text-[11px]">
                      {tokenA?.logo}
                    </span>
                    <span className="flex h-6 w-6 items-center justify-center rounded-sm border bg-muted text-[11px]">
                      {tokenB?.logo}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">
                      {pool.pair[0]}
                      <span className="mx-0.5 text-muted-foreground">/</span>
                      {pool.pair[1]}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground tnum">
                      {pool.feeTier}% fee
                    </div>
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="eyebrow md:hidden">TVL</div>
                  <div className="font-mono text-[13px] tnum">{formatUsd(pool.tvl)}</div>
                </div>

                <div className="md:text-right">
                  <div className="eyebrow md:hidden">24h volume</div>
                  <div className="font-mono text-[13px] text-muted-foreground tnum">
                    {formatUsd(pool.volume24h)}
                  </div>
                </div>

                <div className="md:text-right">
                  <div className="eyebrow md:hidden">APR</div>
                  <div
                    className={cn(
                      "font-mono text-[13px] tnum",
                      pool.apr > 30 ? "text-positive" : "text-foreground"
                    )}
                  >
                    {pool.apr.toFixed(1)}%
                  </div>
                </div>

                <div className="md:text-right">
                  <SplitActionButton
                    size="sm"
                    variant="outline"
                    disabled={supplying === pool.id}
                    loading={supplying === pool.id}
                    onClick={() => handleSupply(pool)}
                    icon={<Plus className="h-3 w-3" />}
                  >
                    {supplying === pool.id ? "Supplying" : "Supply"}
                  </SplitActionButton>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="border-t px-4 py-2 text-[11px] text-negative">
          Couldn&apos;t refresh live pool data — showing last cached values.
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-[15px] font-medium tnum">{value}</div>
    </div>
  );
}
