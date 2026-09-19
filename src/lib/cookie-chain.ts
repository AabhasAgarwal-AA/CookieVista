/**
 * Cookie Chain Configuration
 * Cookie Chain is an SVM (Solana Virtual Machine) compatible blockchain
 * with sub-second finality and minimal transaction fees.
 *
 * Docs: https://docs.cookiechain.wtf
 * RPC:   https://rpc.cookiescan.io
 * API:   https://api.cookiescan.io
 */

export const COOKIE_CHAIN_CONFIG = {
  // Primary RPC endpoint for Cookie Chain
  rpcEndpoint: "https://rpc.cookiescan.io",
  // CookieScan API for analytics and on-chain data
  apiEndpoint: "https://api.cookiescan.io",
  // Chain homepage
  homepage: "https://www.cookiechain.wtf",
  // Docs
  docs: "https://docs.cookiechain.wtf",
  // Network characteristics
  features: {
    subSecondFinality: true,
    lowFees: true,
    solanaCompatible: true,
    cheapDeploys: true,
  },
  // Cookie Chain native token symbol
  nativeTokenSymbol: "COOKIE",
  // Estimated finality in milliseconds
  finalityMs: 400,
  // Chain ID (Cookie Chain uses Solana mainnet-compatible IDs)
  chainId: 0xeef // Custom Cookie Chain chain id
};

// Popular tokens on Cookie Chain ecosystem (representative list)
export interface CookieToken {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logo: string;
  color: string;
  verified: boolean;
}

export const COOKIE_TOKENS: CookieToken[] = [
  {
    symbol: "COOKIE",
    name: "Cookie Chain Native",
    mint: "native",
    decimals: 9,
    logo: "🍪",
    color: "#D97706",
    verified: true,
  },
  {
    symbol: "milk",
    name: "Milk Token",
    mint: "MiLk7KqLr5C7P6mR3sQ8NtV4xY1wZ2aB3cD4eF5gH6iJ7k",
    decimals: 6,
    logo: "🥛",
    color: "#E0E7FF",
    verified: true,
  },
  {
    symbol: "CHIP",
    name: "Chocolate Chip",
    mint: "ChP8C7o6K5c4B3a2D1eF0gH9iJ8kL7mN6oP5qR4sT3u",
    decimals: 6,
    logo: "🍫",
    color: "#7C2D12",
    verified: true,
  },
  {
    symbol: "BUTR",
    name: "Butter Token",
    mint: "BuT1tR2e3W4q5X6y7Z8a9B0cD1eF2gH3iJ4kL5mN6oP7",
    decimals: 8,
    logo: "🧈",
    color: "#FEF3C7",
    verified: true,
  },
  {
    symbol: "SUGR",
    name: "Sugar Coin",
    mint: "SuG5aR4cD3eF2gH1iJ0kL9mN8oP7qR6sT5uV4wX3yZ2a",
    decimals: 6,
    logo: "🍬",
    color: "#FCA5A5",
    verified: false,
  },
  {
    symbol: "OVEN",
    name: "Oven Token",
    mint: "OvE3nN2oP1qR0sT9uV8wX7yZ6aB5cD4eF3gH2iJ1kL0m",
    decimals: 6,
    logo: "🔥",
    color: "#F97316",
    verified: true,
  },
  {
    symbol: "DOUGH",
    name: "Dough Token",
    mint: "DoU6gH5iJ4kL3mN2oP1qR0sT9uV8wX7yZ6aB5cD4eF3",
    decimals: 7,
    logo: "🥖",
    color: "#FCD34D",
    verified: false,
  },
  {
    symbol: "JAR",
    name: "Cookie Jar",
    mint: "JaR1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4",
    decimals: 6,
    logo: "🏺",
    color: "#A78BFA",
    verified: true,
  },
];

// Liquidity pools (representative dataset — Cookiebox-style)
export interface CookiePool {
  id: string;
  pair: [string, string];
  tvl: number;
  volume24h: number;
  apr: number;
  feeTier: number;
  liquidity: string;
}

export const COOKIE_POOLS: CookiePool[] = [
  {
    id: "pool-cookie-milk",
    pair: ["COOKIE", "milk"],
    tvl: 1284520.45,
    volume24h: 184230.12,
    apr: 24.8,
    feeTier: 0.3,
    liquidity: "1,284,520.45",
  },
  {
    id: "pool-cookie-chip",
    pair: ["COOKIE", "CHIP"],
    tvl: 892341.22,
    volume24h: 134512.34,
    apr: 31.2,
    feeTier: 0.3,
    liquidity: "892,341.22",
  },
  {
    id: "pool-cookie-butr",
    pair: ["COOKIE", "BUTR"],
    tvl: 642119.78,
    volume24h: 87411.0,
    apr: 18.4,
    feeTier: 0.3,
    liquidity: "642,119.78",
  },
  {
    id: "pool-chip-milk",
    pair: ["CHIP", "milk"],
    tvl: 412887.5,
    volume24h: 62341.9,
    apr: 22.1,
    feeTier: 0.3,
    liquidity: "412,887.50",
  },
  {
    id: "pool-cookie-sugr",
    pair: ["COOKIE", "SUGR"],
    tvl: 298120.66,
    volume24h: 41298.0,
    apr: 45.7,
    feeTier: 0.3,
    liquidity: "298,120.66",
  },
  {
    id: "pool-oven-jar",
    pair: ["OVEN", "JAR"],
    tvl: 187453.21,
    volume24h: 22109.5,
    apr: 12.3,
    feeTier: 0.3,
    liquidity: "187,453.21",
  },
  {
    id: "pool-dough-cookie",
    pair: ["DOUGH", "COOKIE"],
    tvl: 156221.04,
    volume24h: 19832.4,
    apr: 38.9,
    feeTier: 0.3,
    liquidity: "156,221.04",
  },
  {
    id: "pool-milk-dough",
    pair: ["milk", "DOUGH"],
    tvl: 98023.55,
    volume24h: 11203.78,
    apr: 16.7,
    feeTier: 0.3,
    liquidity: "98,023.55",
  },
];
