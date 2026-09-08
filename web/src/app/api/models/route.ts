import { NextResponse } from "next/server";

const gatewayUrl = () => process.env.SOTA_GATEWAY_URL || "https://sota.azero.my.id";

type GatewayModel = {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
};

export async function GET(req: Request) {
  const provider = new URL(req.url).searchParams.get("provider")?.toLowerCase();
  const upstream = `${gatewayUrl()}/v1/models`;

  try {
    const res = await fetch(upstream, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    const text = await res.text();
    let payload: { object?: string; data?: GatewayModel[]; error?: unknown };
    try {
      payload = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { object: "list", data: [], error: `Gateway returned non-JSON (${res.status})` },
        { status: 502 }
      );
    }

    if (!res.ok || !Array.isArray(payload.data)) {
      return NextResponse.json(
        { object: "list", data: [], error: payload.error || `Gateway model discovery failed (${res.status})` },
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    const data = payload.data
      .filter((model) => typeof model.id === "string" && model.id.trim())
      .filter((model) => !provider || String(model.owned_by || "").toLowerCase() === provider)
      .map((model) => ({
        id: model.id,
        object: model.object || "model",
        created: model.created || 0,
        owned_by: model.owned_by || "unknown",
      }));

    return NextResponse.json({
      object: "list",
      data,
      count: data.length,
      source: upstream,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model discovery request failed";
    return NextResponse.json({ object: "list", data: [], error: message }, { status: 504 });
  }
}
