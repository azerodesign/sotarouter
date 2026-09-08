import { NextResponse } from "next/server";

export async function GET() {
  const gatewayUrl = process.env.SOTA_GATEWAY_URL || "https://sota.azero.my.id";
  try {
    const res = await fetch(`${gatewayUrl}/v1/models`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // Fallback if offline
  }

  return NextResponse.json({
    object: "list",
    data: [],
  });
}
