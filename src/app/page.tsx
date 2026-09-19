"use client";

import * as React from "react";
import { WalletButton } from "@/components/wallet-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { NetworkStatsPanel } from "@/components/network-stats";
import { NetworkCharts } from "@/components/network-charts";
import { ActivityFeed } from "@/components/activity-feed";
import { SwapInterface } from "@/components/swap-interface";
import { PoolsBrowser } from "@/components/pools-browser";
import { PortfolioTracker } from "@/components/portfolio-tracker";
import { COOKIE_CHAIN_CONFIG } from "@/lib/cookie-chain";
import { cn } from "@/lib/utils";
import { Github, ExternalLink } from "lucide-react";

type View = "overview" | "swap" | "pools" | "portfolio";

/**
 * Nav is text-only. Icons next to four short words are redundant, and a row
 * of glyphs is what makes a small nav read as decoration rather than
 * structure. `hint` is the one-line context shown under the tab bar.
 */
const NAV: { id: View; label: string; hint: string }[] = [
  {
    id: "overview",
    label: "Overview",
    hint: "Network throughput, recent blocks, and live chain activity.",
  },
  {
    id: "swap",
    label: "Swap",
    hint: "Route and execute swaps against Cookieswap AMM pools.",
  },
  {
    id: "pools",
    label: "Pools",
    hint: "Liquidity, depth, and fee tiers across every listed pair.",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    hint: "Balances and transaction history for the connected wallet.",
  },
];

export default function Home() {
  const [view, setView] = React.useState<View>("overview");
  const active = NAV.find((n) => n.id === view)!;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Masthead ───────────────────────────────────────────────
          Opaque, not translucent: a blurred bar over scrolling numbers
          makes them hard to read at the moment they pass under it. */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-6">
          <div className="flex h-12 items-center justify-between gap-4">
            <a href="/" className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold tracking-tight">
                CookieVista
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                v0.3
              </span>
            </a>

            <div className="flex items-center gap-1">
              <a
                href={COOKIE_CHAIN_CONFIG.docs}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
              >
                Docs
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
              <a
                href="https://github.com/cookiechain"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <ThemeToggle />
              <div className="ml-1">
                <WalletButton />
              </div>
            </div>
          </div>

          {/* Tabs sit on the masthead's own bottom border, so the active
              tab connects to the content below it. */}
          <nav
            className="-mb-px flex items-center gap-5 overflow-x-auto"
            aria-label="Sections"
          >
            {NAV.map((item) => {
              const isActive = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "shrink-0 border-b-2 px-0.5 pb-2.5 pt-1 text-[13px] transition-colors",
                    isActive
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Context line ───────────────────────────────────────────
          Replaces the marketing hero. Says what you are looking at and
          where the data comes from, then gets out of the way. */}
      <div className="border-b bg-card/40">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 lg:px-6">
          <p className="text-[13px] text-muted-foreground">{active.hint}</p>
          <a
            href={COOKIE_CHAIN_CONFIG.rpcEndpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="eyebrow">Endpoint</span>
            <span className="max-w-[260px] truncate">
              {COOKIE_CHAIN_CONFIG.rpcEndpoint.replace(/^https?:\/\//, "")}
            </span>
            <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
          </a>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-4 px-4 py-4 lg:px-6 lg:py-5">
        <NetworkStatsPanel />

        {view === "overview" && (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <NetworkCharts />
              <ActivityFeed />
            </div>
            <div className="lg:col-span-2" id="swap">
              {/* Sticky: the swap panel is the action on this page, and
                  the feed beside it is much taller. */}
              <div className="lg:sticky lg:top-[90px]">
                <SwapInterface />
              </div>
            </div>
          </div>
        )}

        {view === "swap" && (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <SwapInterface />
            </div>
            <div className="lg:col-span-3">
              <NetworkCharts />
            </div>
          </div>
        )}

        {view === "pools" && <PoolsBrowser />}

        {view === "portfolio" && (
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <PortfolioTracker />
            </div>
            <div className="space-y-4 lg:col-span-3">
              <NetworkCharts />
              <ActivityFeed />
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 border-t">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 lg:px-6">
          <span className="text-xs text-muted-foreground">
            CookieVista — open-source cApp on Cookie Chain
          </span>
          <nav className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <a
              href={COOKIE_CHAIN_CONFIG.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              cookiechain.wtf
            </a>
            <a
              href={COOKIE_CHAIN_CONFIG.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Docs
            </a>
            <a
              href="https://cookiescan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Explorer
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
