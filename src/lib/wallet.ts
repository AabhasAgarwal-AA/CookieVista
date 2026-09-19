/**
 * Wallet Adapter for Cookie Chain (SVM-compatible)
 *
 * Supports:
 *  - Nightly (REQUIRED)
 *  - Phantom
 *  - Solflare
 *  - Backpack
 *
 * All wallets expose the Solana wallet standard interface.
 * We detect them via their injected providers on `window`.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import bs58 from "bs58";

export interface WalletProvider {
  name: string;
  icon: string;
  url: string;
  isInstalled: boolean;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signTransaction?: (tx: unknown) => Promise<unknown>;
  provider?: unknown;
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  walletName: string | null;
  connecting: boolean;
  error: string | null;
}

// Type definitions for injected wallet providers
declare global {
  interface Window {
    solana?: any;
    nightly?: any;
    solflare?: any;
    backpack?: any;
    xnft?: any;
  }
}

/**
 * Detect available wallet providers on the window object.
 * Returns a list of supported wallets with install status.
 */
export function getAvailableWallets(): WalletProvider[] {
  if (typeof window === "undefined") return [];

  const wallets: WalletProvider[] = [];

  // Nightly wallet — required by spec
  // Nightly injects under window.nightly.solana or window.nightly
  const nightly = (window as any).nightly?.solana || (window as any).nightly;
  wallets.push({
    name: "Nightly",
    icon: "🌙",
    url: "https://nightly.app",
    isInstalled: !!nightly && typeof nightly.connect === "function",
    provider: nightly,
    connect: async () => {
      if (!nightly) throw new Error("Nightly wallet not installed");
      const res = await nightly.connect();
      const addr =
        res?.address ||
        res?.publicKey?.toString?.() ||
        (res?.publicKey ? bs58.encode(res.publicKey) : "");
      if (!addr) throw new Error("Failed to get Nightly address");
      return addr;
    },
    disconnect: async () => {
      if (nightly?.disconnect) await nightly.disconnect();
    },
    signMessage: async (message: string) => {
      if (!nightly?.signMessage) throw new Error("Nightly signMessage unavailable");
      const encoded = new TextEncoder().encode(message);
      const signed = await nightly.signMessage(encoded, "utf8");
      const sig = signed?.signature || signed;
      return typeof sig === "string" ? sig : bs58.encode(sig);
    },
  });

  // Phantom wallet
  const phantom = (window as any).solana;
  const isPhantom = phantom?.isPhantom;
  wallets.push({
    name: "Phantom",
    icon: "👻",
    url: "https://phantom.app",
    isInstalled: !!isPhantom,
    provider: isPhantom ? phantom : undefined,
    connect: async () => {
      if (!isPhantom) throw new Error("Phantom wallet not installed");
      const res = await phantom.connect();
      return res?.publicKey?.toString?.() ?? "";
    },
    disconnect: async () => {
      if (phantom?.disconnect) await phantom.disconnect();
    },
    signMessage: async (message: string) => {
      if (!phantom?.signMessage) throw new Error("Phantom signMessage unavailable");
      const encoded = new TextEncoder().encode(message);
      const { signature } = await phantom.signMessage(encoded, "utf8");
      return bs58.encode(signature);
    },
  });

  // Solflare wallet
  const solflare = (window as any).solflare || (window as any).Solflare;
  const isSolflare = solflare?.isSolflare || solflare?.publicKey !== undefined;
  wallets.push({
    name: "Solflare",
    icon: "🔥",
    url: "https://solflare.com",
    isInstalled: !!isSolflare,
    provider: isSolflare ? solflare : undefined,
    connect: async () => {
      if (!solflare) throw new Error("Solflare wallet not installed");
      if (solflare.connect) await solflare.connect();
      return solflare?.publicKey?.toString?.() ?? "";
    },
    disconnect: async () => {
      if (solflare?.disconnect) await solflare.disconnect();
    },
    signMessage: async (message: string) => {
      if (!solflare?.signMessage) throw new Error("Solflare signMessage unavailable");
      const encoded = new TextEncoder().encode(message);
      const { signature } = await solflare.signMessage(encoded, "utf8");
      return bs58.encode(signature);
    },
  });

  // Backpack wallet
  const backpack = (window as any).backpack || (window as any).xnft;
  const isBackpack = backpack?.isBackpack || backpack?.publicKey !== undefined;
  wallets.push({
    name: "Backpack",
    icon: "🎒",
    url: "https://backpack.app",
    isInstalled: !!isBackpack,
    provider: isBackpack ? backpack : undefined,
    connect: async () => {
      if (!backpack) throw new Error("Backpack wallet not installed");
      if (backpack.connect) await backpack.connect();
      return backpack?.publicKey?.toString?.() ?? "";
    },
    disconnect: async () => {
      if (backpack?.disconnect) await backpack.disconnect();
    },
    signMessage: async (message: string) => {
      if (!backpack?.signMessage) throw new Error("Backpack signMessage unavailable");
      const encoded = new TextEncoder().encode(message);
      const res = await backpack.signMessage(encoded, "utf8");
      return bs58.encode(res.signature || res);
    },
  });

  return wallets;
}

const STORAGE_KEY = "cookievista_wallet";

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    walletName: null,
    connecting: false,
    error: null,
  });
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);

  // Refresh available wallets whenever providers inject
  useEffect(() => {
    const refresh = () => setAvailableWallets(getAvailableWallets());
    refresh();

    // Wallets inject asynchronously — poll a few times
    const intervals: NodeJS.Timeout[] = [];
    intervals.push(setTimeout(refresh, 300));
    intervals.push(setTimeout(refresh, 800));
    intervals.push(setTimeout(refresh, 1500));

    // Listen for wallet injection events
    window.addEventListener("load", refresh);
    if ((window as any).addEventListener) {
      // Phantom / Solana standard events
    }

    return () => {
      intervals.forEach(clearTimeout);
      window.removeEventListener("load", refresh);
    };
  }, []);

  // Restore previous session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.address && parsed.walletName) {
          setState({
            connected: true,
            address: parsed.address,
            walletName: parsed.walletName,
            connecting: false,
            error: null,
          });
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const connect = useCallback(
    async (walletName?: string) => {
      setState((s) => ({ ...s, connecting: true, error: null }));

      try {
        const wallets = getAvailableWallets();
        const target = walletName
          ? wallets.find((w) => w.name === walletName)
          : wallets.find((w) => w.isInstalled);

        if (!target) {
          throw new Error(
            walletName
              ? `${walletName} wallet not detected. Please install it first.`
              : "No SVM-compatible wallet detected. Install Nightly or Phantom."
          );
        }

        if (!target.isInstalled) {
          // Open the wallet's install page so the user can grab it
          window.open(target.url, "_blank", "noopener,noreferrer");
          throw new Error(`${target.name} wallet not installed. Opening install page...`);
        }

        const address = await target.connect();

        setState({
          connected: true,
          address,
          walletName: target.name,
          connecting: false,
          error: null,
        });

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ address, walletName: target.name })
        );

        return address;
      } catch (err: any) {
        const message =
          err?.message ??
          (typeof err === "string" ? err : "Failed to connect wallet");
        setState({
          connected: false,
          address: null,
          walletName: null,
          connecting: false,
          error: message,
        });
        throw err;
      }
    },
    []
  );

  const disconnect = useCallback(async () => {
    try {
      const wallets = getAvailableWallets();
      const target = state.walletName
        ? wallets.find((w) => w.name === state.walletName)
        : undefined;
      if (target?.disconnect) {
        await target.disconnect();
      }
    } catch {
      /* ignore */
    }

    localStorage.removeItem(STORAGE_KEY);
    setState({
      connected: false,
      address: null,
      walletName: null,
      connecting: false,
      error: null,
    });
  }, [state.walletName]);

  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!state.connected || !state.walletName) return null;
      const wallets = getAvailableWallets();
      const target = wallets.find((w) => w.name === state.walletName);
      if (!target) return null;
      return target.signMessage(message);
    },
    [state.connected, state.walletName]
  );

  return {
    ...state,
    availableWallets,
    connect,
    disconnect,
    signMessage,
  };
}

/** Truncate a wallet address for display: 4CxY...8mN3 */
export function truncateAddress(addr: string | null, head = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

/** Copy address to clipboard */
export async function copyAddress(addr: string | null): Promise<boolean> {
  if (!addr) return false;
  try {
    await navigator.clipboard.writeText(addr);
    return true;
  } catch {
    return false;
  }
}
