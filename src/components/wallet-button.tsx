"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SplitActionButton } from "@/components/ui/split-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useWallet, truncateAddress, copyAddress } from "@/lib/wallet";
import {
  ChevronDown,
  Copy,
  LogOut,
  ExternalLink,
  Check,
  Loader2,
  Wallet,
} from "lucide-react";

export function WalletButton() {
  const {
    connected,
    address,
    walletName,
    connecting,
    availableWallets,
    connect,
    disconnect,
  } = useWallet();
  const { toast } = useToast();
  const [walletDialogOpen, setWalletDialogOpen] = React.useState(false);
  const [connectingWallet, setConnectingWallet] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const handleConnect = async (walletName?: string) => {
    setConnectingWallet(walletName ?? "auto");
    try {
      const addr = await connect(walletName);
      toast({
        title: "Wallet connected",
        description: `${truncateAddress(addr)} via ${walletName ?? "default"}`,
      });
      setWalletDialogOpen(false);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to connect";
      if (!msg.includes("Opening install page")) {
        toast({
          title: "Connection failed",
          description: msg,
          variant: "destructive",
        });
      }
    } finally {
      setConnectingWallet(null);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast({ title: "Disconnected", description: "Wallet session cleared" });
  };

  const handleCopy = async () => {
    const ok = await copyAddress(address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ title: "Address copied" });
    }
  };

  // Connected state
  if (connected && address) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex h-8 items-center gap-2 rounded-md border border-border-strong px-2.5 transition-colors hover:bg-accent">
              <span className="status-dot text-positive" />
              <span className="font-mono text-[13px] tnum">
                {truncateAddress(address, 4, 4)}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 p-0">
            <div className="border-b px-3 py-2.5">
              <div className="eyebrow mb-1">Connected with {walletName}</div>
              <code className="block text-xs font-mono break-all text-foreground/80">
                {address}
              </code>
            </div>
            <div className="p-1">
              <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer rounded-md">
                {copied ? (
                  <Check className="h-4 w-4 text-positive" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                Copy address
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(`https://cookiescan.io/address/${address}`, "_blank")}
                className="gap-2 cursor-pointer rounded-md"
              >
                <ExternalLink className="h-4 w-4" />
                View on CookieScan
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <div className="p-1">
              <DropdownMenuItem
                onClick={handleDisconnect}
                className="gap-2 cursor-pointer rounded-md text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }

  // Connecting state
  if (connecting) {
    return (
      <SplitActionButton disabled size="sm" loading>
        Connecting…
      </SplitActionButton>
    );
  }

  // Disconnected state
  return (
    <>
      <SplitActionButton
        onClick={() => setWalletDialogOpen(true)}
        size="sm"
        variant="default"
        icon={<Wallet className="h-3.5 w-3.5" />}
      >
        Connect wallet
      </SplitActionButton>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          <div className="p-5">
            <DialogHeader>
              <DialogTitle className="text-base">Connect a wallet</DialogTitle>
              <DialogDescription>
                Choose a Solana-compatible wallet to interact with Cookie Chain.
                Nightly is the recommended wallet for this app.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5 mt-4">
              {availableWallets.length === 0 && (
                <>
                  <Skeleton className="h-[52px] w-full rounded-md" />
                  <Skeleton className="h-[52px] w-full rounded-md" />
                  <Skeleton className="h-[52px] w-full rounded-md" />
                </>
              )}
              {availableWallets.map((w) => {
                const isConnecting = connectingWallet === w.name;
                // For not-installed wallets, render an anchor that opens the install
                // page in a new tab — much more reliable than calling window.open
                // inside an async handler (popup blockers often kill that).
                if (!w.isInstalled) {
                  return (
                    <a
                      key={w.name}
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:border-border-strong hover:bg-accent"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-base">
                        {w.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{w.name}</span>
                          {w.name === "Nightly" && (
                            <Badge variant="default" className="text-[9px] px-1.5 py-0 h-3.5 font-medium">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Not installed · click to download
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  );
                }
                // For installed wallets, use a button that triggers connect()
                return (
                  <button
                    key={w.name}
                    onClick={() => handleConnect(w.name)}
                    disabled={isConnecting}
                    className="group flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:border-border-strong hover:bg-accent disabled:opacity-60"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-base">
                      {w.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{w.name}</span>
                        {w.name === "Nightly" && (
                          <Badge variant="default" className="text-[9px] px-1.5 py-0 h-3.5 font-medium">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Detected — click to connect
                      </div>
                    </div>
                    {isConnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Check className="h-4 w-4 text-positive opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
              <SplitActionButton
                size="default"
                variant="outline"
                className="w-full mt-4"
                icon={<ExternalLink className="h-4 w-4" />}
                href="https://nightly.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Nightly
              </SplitActionButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
