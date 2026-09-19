# CookieVista — Cookie Chain Analytics & Trading Dashboard

An innovative **cApp (Cookie App)** built on **[Cookie Chain](https://www.cookiechain.wtf)** — the fast, community-driven SVM ecosystem with sub-second finality, minimal transaction fees, Solana compatibility, and program deployments costing only a few cents.

CookieVista is a one-stop dashboard that demonstrates **meaningful on-chain interaction with Cookie Chain**: real-time network analytics pulled live from the Cookie Chain RPC, a Cookieswap-style AMM swap interface, a Cookiebox-style liquidity pool browser, a portfolio tracker that fetches real account balances, and a live on-chain activity feed — all wrapped in a dense, instrument-panel UI built for reading numbers rather than selling them.

---

## Features

### Required features (all implemented)

| Requirement | Implementation |
|---|---|
| **Wallet connection** | Custom adapter supporting **Nightly (required)**, Phantom, Solflare, and Backpack — with auto-detection, install prompts, and session persistence |
| **Display connected wallet address** | Truncated in the header, full address in dropdown with copy button + CookieScan explorer link |
| **Transaction execution** | Swap & liquidity-supply flows execute against the `/api/cookie/tx` endpoint with multi-stage status tracking |
| **Transaction confirmation handling** | 5-state machine: `idle → simulating → submitting → confirming → confirmed/error`, with slot number, signature, latency, and explorer link |
| **Error handling and user feedback** | Toast notifications, inline error banners, RPC fallback to representative data when the network is unreachable |
| **Real-time feedback** | SWR polling every 8s for network stats, live activity feed that prepends new transactions every ~5s |
| **Application-specific data and activity** | Live network stats (TPS, slot, epoch, gas), pool TVL/volume/APR tables, portfolio holdings & recent transactions |
| **Analytics, charts, dashboards** | TPS area chart, gas-fee bar chart, ranked program-mix bars, all with live updates |

### Application modules

#### 1. Overview dashboard
- **Live readout strip** — TPS, current slot, epoch, total transactions, active wallets 24h, average gas fee, presented as one divided instrument row rather than six separate cards. Data is fetched directly from `https://rpc.cookiescan.io` via the proxy API route. A hairline progress bar under the strip shows how far through the epoch the chain is.
- **Status line** — connection state, RPC round-trip latency, finality, and `solana-core` version, with node identity in a tooltip.
- **Throughput chart** (24h TPS area chart) — updates every 30 seconds with fresh data points.
- **Gas fee chart** (24h bar chart of average fee per transaction).
- **Program mix** — share of on-chain calls across Cookieswap, Cookiebox, CookieMint, etc., as a ranked bar list. Every row is directly labelled, so nothing depends on matching a colour to a legend.
- **Live activity feed** — a ledger of recent swaps, transfers, deployments, and mints with wallet addresses, slot numbers, and time-ago. Transaction type is carried by a monochrome icon plus its written label; colour is reserved for failures.

#### 2. Swap interface (Cookieswap-style AMM)
- Constant-product AMM (`x * y = k`) with 0.30% fee tier — implemented server-side in `/api/cookie/swap`.
- 8 supported tokens: COOKIE (native), milk, CHIP, BUTR, SUGR, OVEN, DOUGH, JAR.
- Live quote updates as you type — shows rate, route (direct or via COOKIE), price impact, fee, and minimum received.
- Slippage tolerance settings (0.1%, 0.5%, 1.0%).
- Swap-direction flip button.
- MAX button to use full balance.
- Multi-stage transaction status with signature, slot, latency, and explorer link.

#### 3. Liquidity pools (Cookiebox-style)
- Sortable table of 8 AMM pools — sort by TVL, 24h volume, or APR.
- Searchable by either token in the pair.
- Live-updating TVL and volume (with jitter simulating real-time market movements).
- **Supply liquidity** flow — executes a simulated add-liquidity transaction with confirmation.
- Pool summary stats at the top: total TVL, total 24h volume, pool count.

#### 4. Portfolio tracker
- Fetches real account balance from Cookie Chain RPC via `getBalance`.
- Token holdings list with per-token value (USD-equivalent) and 24h change.
- Recent on-chain transactions for the connected wallet (via `getSignaturesForAddress`).
- Copy address + open in CookieScan explorer shortcuts.

---

## File Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── health/route.ts     # Service liveness probe (no RPC dependency)
│   │   └── cookie/
│   │       ├── rpc/route.ts       # JSON-RPC proxy → https://rpc.cookiescan.io
│   │       ├── network/route.ts   # Aggregates getHealth/getSlot/getBlockHeight/getEpochInfo/etc.
│   │       ├── account/route.ts   # getBalance + getSignaturesForAddress for a wallet
│   │       ├── tx/route.ts        # sendTransaction (real) + simulated confirmations (demo)
│   │       ├── pools/route.ts     # Cookiebox-style pool list
│   │       └── swap/route.ts      # Cookieswap-style AMM quote (constant-product)
│   ├── globals.css             # Theme tokens, custom utilities (light + dark)
│   ├── layout.tsx              # ThemeProvider, fonts, metadata
│   └── page.tsx                # Masthead + tabs (Overview/Swap/Pools/Portfolio)
├── components/
│   ├── wallet-button.tsx       # Connect/disconnect dropdown + wallet picker dialog
│   ├── theme-toggle.tsx        # Light/dark switcher
│   ├── network-stats.tsx       # Live readout strip + status line (SWR-polled)
│   ├── network-charts.tsx      # Recharts area + bar charts, ranked program-mix bars
│   ├── activity-feed.tsx       # Streaming on-chain activity ledger
│   ├── swap-interface.tsx      # AMM swap UI with multi-stage tx status
│   ├── pools-browser.tsx       # Sortable/searchable pool table
│   └── portfolio-tracker.tsx  # Wallet balance + holdings + tx history
├── lib/
│   ├── cookie-chain.ts         # Network config, token list, pool list
│   ├── wallet.ts               # Multi-wallet adapter (Nightly/Phantom/Solflare/Backpack)
│   └── utils.ts                # shadcn utility
└── hooks/
    └── use-toast.ts            # Toast hook
```

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | Required by stack |
| Language | **TypeScript 5** | End-to-end type safety |
| Styling | **Tailwind CSS 4** | Atomic, themeable |
| Components | **shadcn/ui** (New York style) | Pre-built, accessible |
| Charts | **Recharts** | Declarative React charts |
| Data fetching | **SWR** | Auto-revalidation, ideal for live data |
| Wallet encoding | **bs58** | Base58 encoding for Solana wallet addresses |
| Toasts | **sonner** | Stack-able notifications |

---

## Getting started

### Prerequisites

- **Node.js 18+** (or **Bun** 1.0+ — recommended, faster)
- A Cookie Chain-compatible wallet:
  - **[Nightly](https://nightly.app)** (recommended, required by the hackathon)
  - [Phantom](https://phantom.app) — works as `window.solana`
  - [Solflare](https://solflare.com)
  - [Backpack](https://backpack.app)

### Install & run locally

```bash
# 1. Install dependencies
bun install
#  or:  npm install

# 2. Start the dev server
bun run dev
#  or:  npm run dev

# 3. Open the app
# The dev server runs on http://localhost:3000
```

### Production build

```bash
bun run build
bun run start
```

### Lint

```bash
bun run lint
```

---

## Cookie Chain integration

### RPC endpoint

The app talks to the live Cookie Chain RPC at **`https://rpc.cookiescan.io`** through a server-side proxy at `/api/cookie/rpc`. This avoids CORS issues and lets us configure the endpoint in one place (`src/lib/cookie-chain.ts`).

**Methods called live:**

| Method | Purpose |
|---|---|
| `getHealth` | Liveness check |
| `getSlot` | Current slot height |
| `getBlockHeight` | Current block height |
| `getEpochInfo` | Epoch / slot index / slots-in-epoch |
| `getRecentPerformanceSamples` | TPS calculation |
| `getVersion` | Solana-core version + feature set |
| `getIdentity` | RPC node identity |
| `getBalance` | Wallet balance (lamports) |
| `getSignaturesForAddress` | Recent transactions for a wallet |
| `sendTransaction` | Submit a real signed transaction |

### API endpoints (this app)

| Endpoint | Method | Description |
|---|---|---|
| `/api/cookie/network` | GET | Aggregated network stats (TPS, slot, epoch, version, …) |
| `/api/cookie/account?address=<base58>` | GET | Balance + holdings + recent txs for an address |
| `/api/cookie/swap?from=X&to=Y&amount=N` | GET | AMM swap quote with route + price impact |
| `/api/cookie/pools` | GET | Liquidity pool list (TVL, volume, APR) |
| `/api/cookie/tx` | POST | Submit (or simulate) a transaction |
| `/api/cookie/tx?signature=<sig>` | GET | Transaction status check |
| `/api/cookie/rpc` | POST | Direct JSON-RPC pass-through to the RPC |
| `/api/health` | GET | Service liveness probe — see below |

#### Health endpoint

`GET /api/health` is a dependency-free liveness probe for uptime monitors, container health checks, and load-balancer targets. It deliberately does **not** call the Cookie Chain RPC, so it reports whether *this service* is up rather than whether the upstream chain is reachable — use `/api/cookie/network` for that.

It runs on the Node.js runtime, is marked `force-dynamic`, and responds `200` with `Cache-Control: no-store`:

```json
{
  "status": "ok",
  "service": "cookeivista",
  "timestamp": "2026-09-19T12:34:56.789Z",
  "uptimeSeconds": 4210
}
```

`uptimeSeconds` is the current process uptime, which resets on every deploy or restart.

---

## Cookie ecosystem integrations

This cApp integrates with the Cookie ecosystem in the following ways:

| Tool | Integration |
|---|---|
| **Cookieswap** | AMM swap UI with constant-product formula, quote endpoint at `/api/cookie/swap`, multi-stage tx execution. |
| **Cookiebox** | Liquidity pool browser with sortable TVL/volume/APR table + supply-liquidity flow. |
| **CookieScan / API** | All transaction signatures and wallet addresses link to `https://cookiescan.io`. |
| **Cookie Chain RPC** | Live RPC at `https://rpc.cookiescan.io` for all on-chain state. |
| **cookie-mcp** | Out-of-scope for this UI build (cookie-mcp is an MCP server for LLM agents). |

### Notes on simulation mode

The Cookie Chain RPC is **live and reachable** — the dashboard pulls real slot numbers, epoch info, version, node identity, and wallet balances from it. However, since:

1. Cookieswap and Cookiebox program addresses are not publicly documented as of this build, and
2. Submitting a real signed transaction requires the wallet to sign against specific program instructions

…the **swap and supply-liquidity flows run in simulation mode** by default. The `/api/cookie/tx` endpoint supports both:

- **`simulate: true`** (default) — returns a realistic confirmation with sub-second latency matching Cookie Chain's actual finality.
- **`simulate: false`** with a base64-encoded `signedTx` — submits to the real RPC via `sendTransaction`.

To switch to real transactions, drop in your Cookieswap program instruction builder and pass the serialized signed transaction to the existing endpoint — no other code changes are needed.

---

## On-chain addresses

A full inventory of every address in this codebase, and which are real. **CookieVista deploys no program of its own and has no custom contract address** — its on-chain surface is entirely read-only RPC queries against native SVM programs.

### Native SVM programs (real)

Canonical Solana/SVM program IDs, defined in `src/app/api/cookie/feed/route.ts`. They are used **only as a lookup table to label programs** seen in the activity feed — nothing is deployed to them and none are invoked:

| Address | Program |
|---|---|
| `11111111111111111111111111111111` | System |
| `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | SPL Token |
| `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` | Associated Token Account |
| `BPFLoader2111111111111111111111111111111111` | BPF Loader |
| `Vote111111111111111111111111111111111111111` | Vote |
| `ComputeBudget111111111111111111111111111111` | Compute Budget |
| `Config1111111111111111111111111111111111111` | Config |
| `Stake11111111111111111111111111111111111111` | Stake |
| `MemoSq4gqABAXKb96qnH8TysNcWUMytCcjDJFwfoQVFo` | Memo |

### Addresses queried live

The activity feed reads real on-chain data via `getSignaturesForAddress` against:

| Address | Role |
|---|---|
| `11111111111111111111111111111111` | System program — primary feed source, since it pays fees on the widest variety of transactions |
| `4wHgybVzqEKn17HRh1MXdLDdaZDh6Y59atZrLtygmCew` | Hardcoded fallback (node identity), used only when the primary source returns nothing |

### Token mints (placeholders — not real)

The non-native mints in `src/lib/cookie-chain.ts` are **invented placeholders**, not deployed tokens. Six of the seven are not even decodable as base58: the alphabet excludes `0`, `O`, `I`, and `l` to avoid visual ambiguity, and these contain `0` (plus `O` in OVEN's case). The `milk` mint is 46 characters, beyond the 44-character maximum for a 32-byte public key.

| Symbol | Mint | Length | Valid base58 |
|---|---|---|---|
| COOKIE | `native` | — | Sentinel value, not an address |
| milk | `MiLk7KqLr5C7P6mR3sQ8NtV4xY1wZ2aB3cD4eF5gH6iJ7k` | 46 | Characters valid, but too long |
| CHIP | `ChP8C7o6K5c4B3a2D1eF0gH9iJ8kL7mN6oP5qR4sT3u` | 43 | No — contains `0` |
| BUTR | `BuT1tR2e3W4q5X6y7Z8a9B0cD1eF2gH3iJ4kL5mN6oP7` | 44 | No — contains `0` |
| SUGR | `SuG5aR4cD3eF2gH1iJ0kL9mN8oP7qR6sT5uV4wX3yZ2a` | 44 | No — contains `0` |
| OVEN | `OvE3nN2oP1qR0sT9uV8wX7yZ6aB5cD4eF3gH2iJ1kL0m` | 44 | No — contains `0` and `O` |
| DOUGH | `DoU6gH5iJ4kL3mN2oP1qR0sT9uV8wX7yZ6aB5cD4eF3` | 43 | No — contains `0` |
| JAR | `JaR1cD2eF3gH4iJ5kL6mN7oP8qR9sT0uV1wX2yZ3aB4` | 43 | No — contains `0` |

The `verified` flag on these tokens is cosmetic — it renders a tick in the swap dropdown and carries no on-chain meaning.

**Do not paste these into anything that validates addresses.** They exist so the swap and pool UIs have a realistic token set to render; substitute real mints once Cookie Chain publishes them.

### Other synthetic identifiers

| Identifier | Where | Notes |
|---|---|---|
| Pool IDs | `src/lib/cookie-chain.ts` | Plain slugs (`pool-cookie-milk`, `pool-oven-jar`, …), not addresses |
| Transaction signatures | `src/app/api/cookie/tx/route.ts` | Generated from `Date.now()` plus the wallet address, followed by a 400-700ms delay imitating finality |

### Summary

| Question | Answer |
|---|---|
| Custom program / contract address | None — nothing is deployed |
| Token mint addresses | Placeholders, not real |
| Real on-chain reads | Yes — live RPC against native programs |
| Real on-chain writes | No — simulated by default (see above) |

The genuine on-chain integration is the read path: `getHealth`, `getSlot`, `getBlockHeight`, `getEpochInfo`, `getRecentPerformanceSamples`, `getVersion`, `getIdentity`, `getBalance`, and `getSignaturesForAddress`, all against `https://rpc.cookiescan.io`.

---

## Design system

CookieVista runs **dark by default**. The reference points are trading terminals and instrument panels, not landing pages: a warm near-black ink, flat surfaces that step by lightness alone, and structure carried by hairline borders rather than shadow, blur, or gradient.

The organising rule is that **colour always means something**. Exactly one hue is interactive — a toasted amber — while green and red are reserved for signed values (up/down, confirmed/failed). Anything merely decorative is greyscale.

- **Background**: `oklch(0.155 0.004 75)` warm near-black. The slight yellow cast keeps it from reading as the default cold dark-mode blue. No gradients or ambient glows.
- **Surfaces**: `--card` `oklch(0.185 0.004 75)` and `--popover` `oklch(0.215 0.005 75)` — opaque steps in lightness, never translucency.
- **Primary**: `oklch(0.76 0.13 66)` toasted amber — the only chromatic interactive colour, used for CTAs, the active tab, and single-series chart marks.
- **Accent**: a neutral hover/active *surface*, not a brand colour. Keeping it grey is what lets amber stay meaningful.
- **Positive / negative**: `oklch(0.76 0.14 158)` and `oklch(0.68 0.17 25)`, used only for signed values and status.
- **Borders**: `--border` at 11% white and `--border-strong` at 18%. These are visible on purpose — they do the structural work that shadows would otherwise do.
- **Typography**: IBM Plex Sans + IBM Plex Mono, with tabular figures on every numeric value.
- **Radius**: 0.25rem — squared off, so panels, inputs, and table rows read as one family.

### Chart colour

Single-series charts (throughput, gas fees) use `--primary` and carry no legend — the panel title names the series. Multi-series work draws from `--chart-1` … `--chart-5`, which are **assigned in fixed order and never cycled**.

Those five slots are a validated set, not a hand-picked one: they clear the lightness band, chroma floor, colour-vision-deficiency separation, normal-vision separation, and contrast-against-surface checks in both themes. An earlier hand-tuned palette failed three of those gates and was replaced. Re-run the palette validator before changing a value or reordering the slots.

Custom CSS utilities in `globals.css` (all inside `@layer utilities`, so Tailwind variants such as `hover:` still win by specificity):

- `.eyebrow` — the small-caps label above a panel or field, used instead of bigger/bolder headings to keep the page quiet
- `.tnum` — tabular figures for prices, balances, and slots
- `.status-dot` — status indicator that takes its colour from `currentColor`, so one element serves live / degraded / offline
- `.cv-scroll` — slim scrollbar for dense scrolling panels
- `.fade-in` — opacity-only entrance for newly arrived rows; movement in a live feed reads as noise once more than one row updates at a time

Motion is minimal and respects `prefers-reduced-motion`.

Light theme is also supported (toggled via the sun/moon button in the header) — warm paper rather than pure white, with its own validated chart steps rather than an automatic flip of the dark values.

---

## Theming

Dark mode is the default. A sun/moon toggle in the header switches to light mode. Both themes are **selected** rather than derived: the light palette re-steps every token against a light surface, including the chart slots, instead of inverting the dark values.

---

## Responsive design

- **Mobile-first** — works on phones (390px viewport tested) up to wide desktops.
- Section tabs scroll horizontally on narrow screens; the Docs link and GitHub icon hide below `lg` and `sm` respectively.
- The readout strip is `grid-cols-2` on mobile, expanding to `grid-cols-6` on `xl`.
- Tables scroll horizontally on narrow screens.
- Pool summary stats stack vertically on mobile.

---

## Wallet adapter details

The wallet adapter at `src/lib/wallet.ts` supports **four** SVM-compatible wallets:

| Wallet | Window injection | Required by spec |
|---|---|---|
| **Nightly** | `window.nightly.solana` or `window.nightly` | Yes |
| Phantom | `window.solana` (with `isPhantom` flag) | Optional |
| Solflare | `window.solflare` or `window.solana` (`isSolflare`) | Optional |
| Backpack | `window.backpack` or `window.xnft` | Optional |

### Behaviour

- **Async injection detection** — wallets inject asynchronously, so the adapter polls three times (at 300ms, 800ms, 1500ms) and also listens for the `load` event.
- **Install prompts** — clicking a non-installed wallet opens its install page in a new tab.
- **Session persistence** — the connected wallet's address + provider name is saved to `localStorage` so refreshes don't lose state.
- **Clean disconnect** — calls the wallet's `disconnect()` method (if available) before clearing local state.
- **`signMessage` support** — all four wallets implement message signing for off-chain auth flows (e.g. proving wallet ownership).

---

## Testing the live data flow

Open the app and verify the following end-to-end:

1. **Network stats are live**: The status line should read "Live" with a green status dot, and the readout strip should show real values like `solana-core 4.1.2`, `slot 23M+`, `epoch 54`, etc.
2. **Wallet connection**: Click "Connect Wallet" → choose Nightly (recommended). If not installed, the install page opens automatically.
3. **Swap quote**: Enter an amount in the swap interface — quote details (rate, route, price impact, fee, minimum received) should appear within ~250ms.
4. **Execute a swap**: With a wallet connected, click "Swap COOKIE → milk" — the multi-stage status should cycle through simulating → submitting → confirming → confirmed in <1 second (matching Cookie Chain's sub-second finality).
5. **Portfolio**: After connecting, the portfolio tab shows the wallet's real COOKIE balance from the RPC.
6. **Live activity feed**: Watch the activity feed — new transactions appear every ~5 seconds with a `.fade-in` entrance.
7. **Pools table**: Open the Pools tab — TVL and volume numbers should update every 15s with subtle jitter.
8. **Health probe**: `curl http://localhost:3000/api/health` should return `{"status":"ok", …}` even if the Cookie Chain RPC is unreachable.

---

## Roadmap

Possible future enhancements:

- **Real Cookieswap integration** — replace the simulated AMM with on-chain program calls once program IDs are published.
- **Token creation / mint** — let users deploy their own SPL token on Cookie Chain for a few cents.
- **Limit orders** — add a limit-order tab to the swap interface.
- **Yield farming** — stake LP tokens to earn COOKIE rewards.
- **cookie-mcp integration** — expose the dashboard's data through an MCP server so LLM agents can query on-chain state.

---

## License

MIT — open source. See [LICENSE](./LICENSE) for details.

---

## Resources

- **Cookie Chain homepage**: https://www.cookiechain.wtf
- **Cookie Chain docs**: https://docs.cookiechain.wtf
- **Cookie Chain API**: https://api.cookiescan.io
- **Cookie Chain RPC**: https://rpc.cookiescan.io
- **CookieScan Explorer**: https://cookiescan.io
- **Nightly Wallet**: https://nightly.app

---

Built with 🍪 for the Cookie Chain ecosystem.
