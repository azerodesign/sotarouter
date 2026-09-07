import { NextResponse } from "next/server";

// In-memory / Persistent Provider State
let memoryProviders: any[] = [
  { id: "prov_1", provider: "openai", authType: "apikey", name: "Primary OpenAI Pool", priority: 10, isActive: true },
  { id: "prov_2", provider: "anthropic", authType: "apikey", name: "Anthropic Claude Pool", priority: 10, isActive: true },
  { id: "prov_3", provider: "gemini", authType: "apikey", name: "Gemini Flash Pool", priority: 5, isActive: true },
];

export async function GET() {
  return NextResponse.json({ success: true, count: memoryProviders.length, providers: memoryProviders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (Array.isArray(body.providers)) {
      // Bulk import from 9Router
      body.providers.forEach((p: any) => {
        if (!memoryProviders.find(existing => existing.id === p.id)) {
          memoryProviders.push(p);
        }
      });
      return NextResponse.json({ success: true, message: `Imported ${body.providers.length} providers`, providers: memoryProviders });
    }

    // Single create
    const newProv = {
      id: "prov_" + Date.now(),
      provider: body.provider || "openai",
      authType: body.authType || "apikey",
      name: body.name || body.provider,
      priority: body.priority || 10,
      isActive: true,
    };
    memoryProviders.push(newProv);
    return NextResponse.json({ success: true, provider: newProv });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
