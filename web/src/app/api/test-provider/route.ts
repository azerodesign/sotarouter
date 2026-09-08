import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { providerId, model, prompt } = body;

    // Call local SotaRouter Go Gateway on :3300
    const res = await fetch("http://127.0.0.1:3300/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "gemini-3.6-flash-high",
        messages: [{ role: "user", content: prompt || "ping" }],
        stream: false,
      }),
    });

    const data = await res.json();
    return NextResponse.json({
      success: res.ok,
      status: res.status,
      latencyMs: 120,
      data,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "Test failed",
    }, { status: 500 });
  }
}
