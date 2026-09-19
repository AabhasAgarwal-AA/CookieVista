import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    return NextResponse.json(
        {
            status: "ok",
            service: "cookeivista",
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
    );
}