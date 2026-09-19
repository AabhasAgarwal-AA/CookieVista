"use client";

import * as React from "react";
import useSWR from "swr";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  Coins,
  Database,
  Zap,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Vote,
  Cog,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedItem {
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

interface FeedResponse {
  items: FeedItem[];
  live: boolean;
  count: number;
  timestamp: number;
  cached?: boolean;
  source?: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 5) return "now";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function truncateAddr(addr: string, head = 4, tail = 4): string {
  if (!addr || addr === "unknown") return "unknown";
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/**
 * Type is carried by a monochrome icon plus its written label, not by a
 * coloured chip. Six tinted pills down the left edge of a feed read as
 * decoration and make failures — the one thing worth colouring — harder to
 * spot. Colour in this list means "something went wrong", and nothing else.
 */
const TYPE_META: Record<
  FeedItem["type"],
  { icon: React.ReactNode; label: string }
> = {
  swap: { icon: <ArrowLeftRight className="h-3 w-3" />, label: "Swap" },
  transfer: { icon: <Coins className="h-3 w-3" />, label: "Transfer" },
  deploy: { icon: <Database className="h-3 w-3" />, label: "Deploy" },
  mint: { icon: <Zap className="h-3 w-3" />, label: "Mint" },
  vote: { icon: <Vote className="h-3 w-3" />, label: "Vote" },
  program: { icon: <Cog className="h-3 w-3" />, label: "Program" },
};

export function ActivityFeed() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<FeedResponse>(
    "/api/cookie/feed",
    fetcher,
    {
      refreshInterval: 15000, // refresh every 15s for new transactions
      revalidateOnFocus: false,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  );

  const items = data?.items ?? [];
  const isLive = data?.live ?? false;
  const hasError = !!error || (!isLoading && !data?.live && items.length === 0);

  return (
    // Sizes to its content. It must NOT be h-full: the feed sits in a stacked
    // grid column, where a stretched grid item resolves to the full row
    // height on top of the charts above it, leaving a tall empty card.
    <Card className="flex flex-col gap-0 py-0">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-[13px] font-medium tracking-tight">Activity</h3>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "status-dot",
                isLive ? "text-positive" : "text-muted-foreground"
              )}
            />
            <span className="eyebrow">{isLive ? "Live" : "Offline"}</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => mutate()}
          disabled={isLoading || isValidating}
          aria-label="Refresh feed"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              (isLoading || isValidating) && "animate-spin"
            )}
          />
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="cv-scroll h-[440px]">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="px-4 py-2.5">
                  <Skeleton className="h-8 w-full rounded-sm" />
                </div>
              ))}
            </div>
          ) : hasError ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <p className="mb-1 text-[13px] font-medium">Feed unavailable</p>
              <p className="mb-4 max-w-[280px] text-xs text-muted-foreground">
                {data?.error ||
                  "Couldn't reach the Cookie Chain RPC. Try refreshing."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => mutate()}
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 py-16 text-center">
              <p className="text-[13px] text-muted-foreground">
                No recent transactions
              </p>
            </div>
          ) : (
            /* Rows are separated by hairlines rather than gaps, so the feed
               reads as a ledger and the columns line up down the page. */
            <div className="divide-y">
              {items.map((item) => {
                const meta = TYPE_META[item.type] || TYPE_META.program;
                const explorerUrl = `https://cookiescan.io/tx/${item.signature}`;
                return (
                  <a
                    key={item.id}
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fade-in group grid grid-cols-[16px_88px_1fr_auto] items-baseline gap-x-3 px-4 py-2.5 transition-colors hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "relative top-0.5",
                        item.err ? "text-negative" : "text-muted-foreground"
                      )}
                    >
                      {item.err ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        meta.icon
                      )}
                    </span>

                    <span
                      className={cn(
                        "truncate text-xs font-medium",
                        item.err && "text-negative"
                      )}
                    >
                      {item.err ? "Failed" : meta.label}
                    </span>

                    <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground tnum">
                      {item.amount && (
                        <span className="text-foreground/85">
                          {item.amount}
                        </span>
                      )}
                      {item.amount && "  "}
                      {truncateAddr(item.from)}
                      <span className="mx-1 text-muted-foreground/50">→</span>
                      {truncateAddr(item.to)}
                      {item.instruction && (
                        <span className="ml-2 text-muted-foreground/70">
                          {item.instruction}
                        </span>
                      )}
                    </span>

                    <span className="flex items-baseline gap-1.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground tnum">
                      {timeAgo(item.blockTime)}
                      <ExternalLink className="h-2.5 w-2.5 self-center opacity-0 transition-opacity group-hover:opacity-70" />
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {(data?.cached || (isLive && items.length > 0)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2 text-[11px] text-muted-foreground">
          {data?.cached && !isLive ? (
            <span className="text-negative">
              Cached — RPC temporarily unavailable
            </span>
          ) : (
            <>
              <span className="tnum">
                {items.length} transactions · slot{" "}
                {items[0]?.slot.toLocaleString()}
              </span>
              <a
                href="https://cookiescan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto transition-colors hover:text-foreground"
              >
                View on CookieScan →
              </a>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
