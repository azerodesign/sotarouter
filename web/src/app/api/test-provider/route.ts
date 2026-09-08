import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const body = await req.json();
    const { model, prompt } = body;

    // Use production gateway domain or custom override
    const gatewayUrl = process.env.SOTA_GATEWAY_URL || "https://sota.azero.my.id";
    
    const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "gemini-3.7-flash-high",
        messages: [{ role: "user", content: prompt || "Reply with 'OK' in one word." }],
        stream: false,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const latencyMs = Date.now() - start;
    const text = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const errMsg =
        data && typeof data === "object" && "error" in data
          ? typeof data.error === "object" && data.error !== null && "message" in data.error
            ? String((data.error as Record<string, unknown>).message)
            : JSON.stringify(data.error)
          : text.slice(0, 300) || `HTTP ${res.status}`;

      return NextResponse.json(
        {
          success: false,
          status: res.status,
          latencyMs,
          error: errMsg,
          data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      status: res.status,
      latencyMs,
      data,
    });
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    return NextResponse.json(
      {
        success: false,
        status: 502,
        latencyMs,
        error: err instanceof Error ? err.message : "Gateway test connection failed",
      },
      { status: 502 }
    );
  }
}
