import { NextResponse } from "next/server";

export async function GET() {
  const gatewayUrl = process.env.SOTA_GATEWAY_URL || "https://sota.azero.my.id";
  try {
    const res = await fetch(`${gatewayUrl}/api/logs`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // Gateway offline or unroutable
  }

  return NextResponse.json({
    success: true,
    logs: [],
  });
}
