"use client";

import * as React from "react";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NetworkStats {
  live: boolean;
  endpoint: string;
  latencyMs: number;
  timestamp: number;
  health: string;
  slot: number | null;
  blockHeight: number | null;
  epoch: number | null;
  slotIndex: number | null;
  slotsInEpoch: number | null;
  tps: number;
  version: string;
  featureSet: number;
  nodeIdentity: string | null;
  chainName: string;
  finalityMs: number;
  nativeToken: string;
  features: Record<string, boolean>;
  metrics: {
    totalTransactions: number;
    activeWallets24h: number;
    totalPrograms: number;
    avgGasFee: number;
    gasFeeCurrency: string;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

/**
 * One readout in the strip.
 *
 * Deliberately has no border, no hover state and no sparkline: the cells are
 * separated by the container's divide rules, and adding a trend line per cell
 * would mean inventing a history the RPC does not give us.
 */
function Readout({
  label,
  value,
  unit,
  sub,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="px-4 py-3.5">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        {loading ? (
          <Skeleton className="h-6 w-20 rounded-sm" />
        ) : (
          <span className="text-[22px] font-medium leading-none tracking-tight tnum">
            {value}
          </span>
        )}
        {unit && !loading && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {/* Reserve the sub-line height so cells stay on a common baseline
          whether or not the RPC returned the secondary figure. */}
      <div className="mt-1.5 h-4 truncate text-[11px] text-muted-foreground tnum">
        {loading ? null : sub}
      </div>
    </div>
  );
}

/** A labelled value in the status line. */
function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="eyebrow">{label}</span>
      <span className="font-mono text-[11px] text-foreground/80 tnum">
        {value}
      </span>
    </span>
  );
}

export function NetworkStatsPanel() {
  const { data, error, isLoading } = useSWR<NetworkStats>(
    "/api/cookie/network",
    fetcher,
    { refreshInterval: 8000, revalidateOnFocus: true }
  );

  const isLive = data?.live ?? false;

  const epochPct =
    data?.slotIndex != null && data?.slotsInEpoch
      ? (data.slotIndex / data.slotsInEpoch) * 100
      : null;

  return (
    <section className="rounded-md border">
      {/* Status line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "status-dot",
              isLoading
                ? "text-muted-foreground"
                : isLive
                  ? "text-positive"
                  : "text-negative"
            )}
          />
          <span className="text-[13px] font-medium">
            {isLoading
              ? "Connecting"
              : isLive
                ? "Live"
                : "RPC unreachable"}
          </span>
          {!isLoading && !isLive && (
            <span className="text-[11px] text-muted-foreground">
              showing representative data
            </span>
          )}
        </span>

        {data && (
          <>
            <Meta label="RPC" value={`${data.latencyMs}ms`} />
            <Meta label="Finality" value={`${data.finalityMs}ms`} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default">
                    <Meta label="Core" value={data.version} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="space-y-0.5 text-xs">
                    <div>Feature set: {data.featureSet ?? "—"}</div>
                    {data.nodeIdentity && (
                      <div className="max-w-[220px] truncate font-mono text-[10px]">
                        Node: {data.nodeIdentity}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {error && (
          <span className="ml-auto text-[11px] text-negative">
            Couldn&apos;t reach RPC — retrying
          </span>
        )}
      </div>

      {/* Readout strip. Cells are divided by rules rather than boxed
          individually, so the row reads as one instrument. */}
      <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        <Readout
          label="Throughput"
          value={data ? formatNumber(data.tps) : "—"}
          unit="tps"
          loading={isLoading}
        />
        <Readout
          label="Slot"
          value={data?.slot ? formatNumber(data.slot) : "—"}
          sub={
            data?.blockHeight
              ? `block ${formatNumber(data.blockHeight)}`
              : undefined
          }
          loading={isLoading}
        />
        <Readout
          label="Epoch"
          value={data?.epoch ?? "—"}
          sub={epochPct != null ? `${epochPct.toFixed(1)}% elapsed` : undefined}
          loading={isLoading}
        />
        <Readout
          label="Transactions"
          value={data ? formatNumber(data.metrics.totalTransactions) : "—"}
          sub="all time"
          loading={isLoading}
        />
        <Readout
          label="Active wallets"
          value={data ? formatNumber(data.metrics.activeWallets24h) : "—"}
          sub="last 24h"
          loading={isLoading}
        />
        <Readout
          label="Avg fee"
          value={data ? data.metrics.avgGasFee : "—"}
          unit={data?.nativeToken}
          sub="per transaction"
          loading={isLoading}
        />
      </div>

      {/* Epoch progress reads better as one continuous bar under the strip
          than as a percentage buried in a cell. */}
      {epochPct != null && (
        <div
          className="h-[3px] w-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(epochPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Epoch progress"
        >
          <div
            className="h-full bg-primary/70"
            style={{ width: `${epochPct}%` }}
          />
        </div>
      )}
    </section>
  );
}
