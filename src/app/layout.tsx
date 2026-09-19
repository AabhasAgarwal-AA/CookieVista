import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * IBM Plex rather than a default grotesque: the sans has enough character to
 * read as a chosen typeface, and the mono is drawn as its companion — so
 * addresses, slots and balances sit on the same skeleton as the labels
 * beside them instead of looking pasted in from another system.
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CookieVista — Cookie Chain Dashboard",
  description:
    "Analytics, swaps, and portfolio tracking on Cookie Chain. Real-time RPC data, AMM trading, and liquidity pools on the SVM.",
  keywords: [
    "Cookie Chain",
    "SVM",
    "Solana",
    "DeFi",
    "Dashboard",
    "Cookieswap",
    "Cookiebox",
  ],
  authors: [{ name: "CookieVista" }],
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${plexSans.variable} ${plexMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
