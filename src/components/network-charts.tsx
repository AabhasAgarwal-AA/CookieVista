"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";

function generateTpsSeries() {
  const now = Date.now();
  const data: { time: string; tps: number; txs: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now - i * 60 * 60 * 1000);
    const baseTps = 1500;
    const dayFactor =
      Math.sin((t.getHours() / 24) * Math.PI * 2 - Math.PI / 2) * 600;
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * 80;
    const tps = Math.max(400, Math.round(baseTps + dayFactor + noise));
    data.push({
      time: `${String(t.getHours()).padStart(2, "0")}:00`,
      tps,
      txs: tps * 3600,
    });
  }
  return data;
}

function generateFeeSeries() {
  const data: { hour: string; fee: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const t = new Date(Date.now() - i * 60 * 60 * 1000);
    const base = 0.00042;
    const variance = Math.sin(i * 0.8) * 0.00008;
    data.push({
      hour: `${String(t.getHours()).padStart(2, "0")}:00`,
      fee: parseFloat((base + variance).toFixed(6)),
    });
  }
  return data;
}

/** Sorted descending so the bars form a ranking rather than an arbitrary order. */
const PROGRAM_USAGE = [
  { name: "Cookieswap", value: 38 },
  { name: "Cookiebox", value: 22 },
  { name: "Transfers", value: 18 },
  { name: "NFT / Mint", value: 12 },
  { name: "Staking", value: 7 },
  { name: "Other", value: 3 },
].sort((a, b) => b.value - a.value);

/* Axis and grid styling. Pulled out so all three charts stay identical —
   inconsistent axes between panels is what makes a dashboard look assembled
   rather than designed. */
const AXIS = {
  stroke: "var(--muted-foreground)",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

const GRID = {
  stroke: "var(--border)",
  vertical: false,
} as const;

/** Flat tooltip — opaque, hairline border, no blur and no drop shadow. */
function TooltipBox({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; name?: string; value?: number }[];
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-2 text-xs">
      <div className="eyebrow mb-1.5">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-3">
          <span className="text-muted-foreground">{p.name}</span>
          <span className="ml-auto font-mono font-medium tnum">
            {formatter && p.value !== undefined
              ? formatter(p.value)
              : p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Panel header: label on the left, the current reading on the right.
 * The headline number is the point of the panel, so it is set larger than
 * the title — the chart behind it is context for that number.
 */
function PanelHeader({
  title,
  detail,
  value,
  valueLabel,
  mono,
}: {
  title: string;
  detail: string;
  value: React.ReactNode;
  valueLabel: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4">
      <div>
        <h3 className="text-[13px] font-medium tracking-tight">{title}</h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
      </div>
      <div className="text-right">
        <div
          className={`text-lg font-medium leading-none tnum ${mono ? "font-mono" : ""}`}
        >
          {value}
        </div>
        <div className="eyebrow mt-1.5">{valueLabel}</div>
      </div>
    </div>
  );
}

export function NetworkCharts() {
  // Initialize with empty arrays to avoid hydration mismatches —
  // generateTpsSeries/generateFeeSeries use Date.now() and Math.random(),
  // which produce different output on server vs client. Populate client-side only.
  const [tpsData, setTpsData] = React.useState<
    { time: string; tps: number; txs: number }[]
  >([]);
  const [feeData, setFeeData] = React.useState<{ hour: string; fee: number }[]>(
    []
  );

  // Populate initial data client-side only (avoids hydration mismatch)
  React.useEffect(() => {
    setTpsData(generateTpsSeries());
    setFeeData(generateFeeSeries());
  }, []);

  React.useEffect(() => {
    if (tpsData.length === 0) return;
    const interval = setInterval(() => {
      setTpsData((prev) => {
        const last = prev[prev.length - 1];
        const newTps = Math.max(
          400,
          Math.round(last.tps + (Math.random() - 0.5) * 200)
        );
        const t = new Date();
        return [
          ...prev.slice(1),
          {
            time: `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`,
            tps: newTps,
            txs: newTps * 60,
          },
        ];
      });
      setFeeData((prev) => [
        ...prev.slice(1),
        {
          hour: `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
          fee: parseFloat((0.0004 + (Math.random() - 0.5) * 0.0001).toFixed(6)),
        },
      ]);
    }, 30000);
    return () => clearInterval(interval);
  }, [tpsData.length]);

  const topProgram = PROGRAM_USAGE[0];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Throughput — single series, so it wears the one accent colour and
          needs no legend: the title names it. */}
      <Card className="lg:col-span-2">
        <PanelHeader
          title="Network throughput"
          detail="Transactions per second · last 24h"
          value={
            tpsData.length > 0
              ? tpsData[tpsData.length - 1].tps.toLocaleString()
              : "—"
          }
          valueLabel="current tps"
        />
        <div className="px-1">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={tpsData}
              margin={{ top: 4, right: 12, left: -18, bottom: 0 }}
            >
              <CartesianGrid {...GRID} />
              <XAxis dataKey="time" {...AXIS} interval={3} />
              <YAxis
                {...AXIS}
                width={48}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                content={<TooltipBox />}
                cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="tps"
                name="TPS"
                stroke="var(--primary)"
                strokeWidth={1.5}
                fill="var(--primary)"
                fillOpacity={0.12}
                isAnimationActive={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: "var(--primary)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Program mix — a ranking of shares. Bars beat a donut here: six
          slices can't be compared by angle, and every bar carries its own
          label so nothing depends on matching a colour to a legend. */}
      <Card>
        <PanelHeader
          title="Program mix"
          detail="Share of on-chain calls · 24h"
          value={`${topProgram.value}%`}
          valueLabel={topProgram.name}
        />
        <div className="space-y-2.5 px-4">
          {PROGRAM_USAGE.map((p) => (
            <div key={p.name}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
                <span className="truncate text-foreground/80">{p.name}</span>
                <span className="font-mono text-muted-foreground tnum">
                  {p.value}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-primary/80"
                  style={{ width: `${p.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Gas fees */}
      <Card className="lg:col-span-3">
        <PanelHeader
          title="Gas fees"
          detail="Average fee per transaction · COOKIE-denominated · 24h"
          value={
            feeData.length > 0
              ? feeData[feeData.length - 1].fee.toFixed(6)
              : "—"
          }
          valueLabel="avg / tx"
          mono
        />
        <div className="px-1">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart
              data={feeData}
              margin={{ top: 4, right: 12, left: -6, bottom: 0 }}
            >
              <CartesianGrid {...GRID} />
              <XAxis dataKey="hour" {...AXIS} interval={3} />
              <YAxis
                {...AXIS}
                width={56}
                tickFormatter={(v) => `${(v * 1000).toFixed(2)}m`}
                domain={["dataMin - 0.00005", "dataMax + 0.00005"]}
              />
              <Tooltip
                content={
                  <TooltipBox formatter={(v: number) => `${v.toFixed(6)} COOKIE`} />
                }
                cursor={{ fill: "var(--accent)" }}
              />
              <Bar
                dataKey="fee"
                name="Fee"
                fill="var(--primary)"
                fillOpacity={0.75}
                radius={[2, 2, 0, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
