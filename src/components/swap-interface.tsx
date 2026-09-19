"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { SplitActionButton } from "@/components/ui/split-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/lib/wallet";
import { COOKIE_TOKENS } from "@/lib/cookie-chain";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  Loader2,
  Settings2,
  Zap,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface QuoteResponse {
  from: string;
  to: string;
  amountIn: number;
  amountOut: number;
  priceImpact: number;
  fee: number;
  feeBps: number;
  rate: number;
  route: string;
  minimumReceived?: number;
}

interface TxStatus {
  state: "idle" | "simulating" | "submitting" | "confirming" | "confirmed" | "error";
  signature?: string;
  error?: string;
  action?: string;
  slot?: number;
  explorerUrl?: string;
  latencyMs?: number;
}

const STAGES: Record<TxStatus["state"], { label: string; color: string }> = {
  idle: { label: "Idle", color: "text-muted-foreground" },
  simulating: { label: "Validating quote", color: "text-primary" },
  submitting: { label: "Submitting", color: "text-primary" },
  confirming: { label: "Awaiting confirmation", color: "text-primary" },
  confirmed: { label: "Confirmed", color: "text-positive" },
  error: { label: "Failed", color: "text-destructive" },
};

export function SwapInterface() {
  const { connected, address } = useWallet();
  const { toast } = useToast();

  const [fromToken, setFromToken] = React.useState("COOKIE");
  const [toToken, setToToken] = React.useState("milk");
  const [amount, setAmount] = React.useState("100");
  const [slippage, setSlippage] = React.useState(0.5);
  const [showSettings, setShowSettings] = React.useState(false);

  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [tx, setTx] = React.useState<TxStatus>({ state: "idle" });

  React.useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/cookie/swap?from=${fromToken}&to=${toToken}&amount=${amount}`
        );
        if (!res.ok) {
          setQuote(null);
          return;
        }
        const data: QuoteResponse = await res.json();
        setQuote(data);
      } catch {
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [fromToken, toToken, amount]);

  // Reset stale tx status when the user edits inputs after a swap
  React.useEffect(() => {
    if (tx.state === "confirmed" || tx.state === "error") {
      setTx({ state: "idle" });
    }
  }, [fromToken, toToken, amount]);

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
  };

  const handleExecuteSwap = async () => {
    if (!connected || !address) {
      toast({
        title: "Connect your wallet",
        description: "You need a wallet to execute a swap.",
        variant: "destructive",
      });
      return;
    }
    if (!quote || parseFloat(amount) <= 0) {
      toast({
        title: "Enter an amount",
        description: "Specify how much you want to swap.",
        variant: "destructive",
      });
      return;
    }

    setTx({ state: "simulating" });

    try {
      await new Promise((r) => setTimeout(r, 350));
      setTx({
        state: "submitting",
        action: `Swap ${amount} ${fromToken} → ${quote.amountOut} ${toToken}`,
      });

      const submitRes = await fetch("/api/cookie/tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulate: true,
          fromAddress: address,
          action: "swap",
          params: {
            from: fromToken,
            to: toToken,
            amountIn: parseFloat(amount),
            amountOut: quote.amountOut,
            slippage,
            route: quote.route,
          },
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok || submitData.status === "error") {
        throw new Error(submitData.error ?? "Submission failed");
      }

      setTx({
        state: "confirming",
        signature: submitData.signature,
        action: `Swap ${amount} ${fromToken} → ${quote.amountOut} ${toToken}`,
      });

      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

      setTx({
        state: "confirmed",
        signature: submitData.signature,
        slot: submitData.slot,
        explorerUrl: submitData.explorerUrl,
        latencyMs: submitData.latencyMs,
        action: `Swap ${amount} ${fromToken} → ${quote.amountOut} ${toToken}`,
      });

      toast({
        title: "Swap confirmed",
        description: `${amount} ${fromToken} → ${quote.amountOut} ${toToken} · ${submitData.latencyMs}ms`,
      });
    } catch (err: any) {
      setTx({
        state: "error",
        error: err?.message ?? "Transaction failed",
      });
      toast({
        title: "Swap failed",
        description: err?.message ?? "Unknown error",
        variant: "destructive",
      });
    }
  };

  const isBusy =
    tx.state === "simulating" ||
    tx.state === "submitting" ||
    tx.state === "confirming";

  const isButtonDisabled =
    !connected ||
    isBusy ||
    !quote ||
    parseFloat(amount) <= 0;

  const buttonLabel = !connected
    ? "Connect wallet"
    : !quote || parseFloat(amount) <= 0
      ? "Enter an amount"
      : isBusy
        ? "Processing…"
        : `Swap ${fromToken} for ${toToken}`;

  return (
    <Card className="gap-0 pt-0 pb-4">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-[13px] font-medium tracking-tight">Swap</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            AMM routing · 0.30% fee
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  showSettings
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Settings2 className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Swap settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* From */}
      <div className="mx-4 mt-4 rounded-md border bg-muted/50 p-3.5">
        <div className="flex items-center justify-between mb-2">
<span className="eyebrow">You pay</span>
          <button
            onClick={() => setAmount("10000")}
            className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
          >
            MAX
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="min-w-0 flex-1 border-0 bg-transparent text-[22px] font-medium outline-none tnum placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <Select value={fromToken} onValueChange={setFromToken}>
            <SelectTrigger className="h-9 w-[128px] gap-1.5 border-border-strong bg-card font-medium">
              <span className="text-base">
                {COOKIE_TOKENS.find((t) => t.symbol === fromToken)?.logo}
              </span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COOKIE_TOKENS.map((t) => (
                <SelectItem key={t.symbol} value={t.symbol}>
                  <span className="mr-1.5">{t.logo}</span>
                  {t.symbol}
                  {t.verified && (
                    <span className="ml-1.5 text-[10px] text-positive">✓</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Flip */}
      <div className="relative z-10 -my-3 flex justify-center">
        <button
          onClick={handleSwapTokens}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong bg-background text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Flip tokens"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* To */}
      <div className="mx-4 rounded-md border bg-muted/50 p-3.5">
        <div className="flex items-center justify-between mb-2">
<span className="eyebrow">You receive</span>
          {quote && !quoteLoading && (
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
              1 {fromToken} = {quote.rate.toFixed(4)} {toToken}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[22px] font-medium tnum">
            {quoteLoading ? (
              <Skeleton className="h-7 w-32 rounded-sm" />
            ) : quote ? (
              <span className="fade-in">{quote.amountOut}</span>
            ) : (
              <span className="text-muted-foreground/40">0.0</span>
            )}
          </div>
          <Select value={toToken} onValueChange={setToToken}>
            <SelectTrigger className="h-9 w-[128px] gap-1.5 border-border-strong bg-card font-medium">
              <span className="text-base">
                {COOKIE_TOKENS.find((t) => t.symbol === toToken)?.logo}
              </span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COOKIE_TOKENS.map((t) => (
                <SelectItem key={t.symbol} value={t.symbol}>
                  <span className="mr-1.5">{t.logo}</span>
                  {t.symbol}
                  {t.verified && (
                    <span className="ml-1.5 text-[10px] text-positive">✓</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="fade-in mx-4 mt-3 rounded-md border bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Slippage tolerance</span>
            <div className="flex items-center gap-1">
              {[0.1, 0.5, 1.0].map((v) => (
                <button
                  key={v}
                  onClick={() => setSlippage(v)}
                  className={cn(
                    "h-7 rounded-md px-2 text-xs transition-colors tnum",
                    slippage === v
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quote detail */}
      {quote && !quoteLoading && parseFloat(amount) > 0 && (
        <div className="fade-in mx-4 mt-3 space-y-1.5 border-t pt-3 text-xs">
          <Row label="Route" value={quote.route} mono />
          <Row
            label="Price impact"
            value={
              <span
                className={cn(
                  "font-mono tabular-nums",
                  quote.priceImpact > 3
                    ? "text-negative"
                    : quote.priceImpact > 1
                      ? "text-primary"
                      : "text-positive"
                )}
              >
                {quote.priceImpact.toFixed(2)}%
              </span>
            }
          />
          <Row
            label="Fee"
            value={
              <span className="font-mono tabular-nums">
                {quote.fee.toFixed(4)} {fromToken}
                <span className="text-muted-foreground ml-1">
                  ({(quote.feeBps / 100).toFixed(2)}%)
                </span>
              </span>
            }
          />
          <Row
            label="Min received"
            value={
              <span className="font-mono tabular-nums">
                {quote.minimumReceived?.toFixed(4) ?? "—"} {toToken}
              </span>
            }
          />
        </div>
      )}

      {/* Execute */}
      <SplitActionButton
        onClick={handleExecuteSwap}
        disabled={isButtonDisabled}
        loading={isBusy}
        icon={!isBusy && connected ? <Zap className="h-4 w-4" /> : undefined}
        variant="default"
        size="lg"
        className="mx-4 mt-4 w-[calc(100%-2rem)]"
      >
        {buttonLabel}
      </SplitActionButton>

      {/* Tx status */}
      {tx.state !== "idle" && (
        <div
          className={cn(
            "fade-in mx-4 mt-3 space-y-2 rounded-md border p-3",
            tx.state === "confirmed"
              ? "border-positive/30 bg-positive/5"
              : tx.state === "error"
                ? "border-destructive/30 bg-destructive/5"
                : "border-primary/30 bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2">
            {tx.state === "confirmed" ? (
              <CheckCircle2 className="h-4 w-4 text-positive" />
            ) : tx.state === "error" ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            <span className={cn("text-sm font-medium", STAGES[tx.state].color)}>
              {STAGES[tx.state].label}
            </span>
          </div>
          {tx.action && (
            <div className="text-xs text-muted-foreground">{tx.action}</div>
          )}
          {tx.signature && (
            <div className="text-[11px] font-mono text-muted-foreground break-all">
              <span className="text-foreground/60">Sig: </span>
              {tx.signature.slice(0, 32)}…
            </div>
          )}
          {tx.state === "confirmed" && (
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-positive tnum">
                {tx.latencyMs}ms
              </span>
              {tx.slot && (
                <span className="font-mono text-muted-foreground tnum">
                  slot {tx.slot.toLocaleString()}
                </span>
              )}
              <span className="ml-auto eyebrow">Simulated · not on-chain</span>
            </div>
          )}
          {tx.state === "error" && tx.error && (
            <div className="text-xs text-negative">{tx.error}</div>
          )}
        </div>
      )}

      {!connected && (
        <div className="mt-3 flex items-center justify-center gap-1.5 px-4 text-[11px] text-muted-foreground">
          <Info className="h-3 w-3" />
          Connect your wallet to execute transactions
        </div>
      )}
    </Card>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground flex items-center gap-1">
        {label}
      </span>
      <span className={cn(mono && "font-mono tabular-nums")}>{value}</span>
    </div>
  );
}
