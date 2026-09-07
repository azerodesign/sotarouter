import { NextResponse } from "next/server";

// In-memory provider storage for SotaRouter
let memoryProviders: any[] = [];

export async function GET() {
  return NextResponse.json({ success: true, count: memoryProviders.length, providers: memoryProviders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.action === "import_json") {
      // User pasted raw JSON (array of 9Router providerConnections or custom JSON)
      let items: any[] = [];
      if (Array.isArray(body.data)) {
        items = body.data;
      } else if (typeof body.data === "object" && body.data !== null) {
        items = body.data.providerConnections || body.data.providers || [body.data];
      }

      let importedCount = 0;
      items.forEach((p: any) => {
        let parsedData = {};
        if (typeof p.data === "string") {
          try { parsedData = JSON.parse(p.data); } catch (e) {}
        } else if (typeof p.data === "object" && p.data !== null) {
          parsedData = p.data;
        }

        const formatted = {
          id: p.id || "sota_prov_" + Math.random().toString(36).substring(2, 9),
          provider: p.provider || "openai",
          authType: p.authType || "apikey",
          name: p.name || p.email || p.displayName || p.provider,
          email: p.email || (parsedData as any).displayName || "",
          priority: p.priority || 1,
          isActive: p.isActive === undefined ? true : Boolean(p.isActive),
          testStatus: (parsedData as any).testStatus || p.testStatus || "active",
          lastError: (parsedData as any).lastError || null,
          data: parsedData,
          createdAt: p.createdAt || new Date().toISOString(),
        };

        const existingIdx = memoryProviders.findIndex(ex => ex.id === formatted.id);
        if (existingIdx >= 0) {
          memoryProviders[existingIdx] = formatted;
        } else {
          memoryProviders.push(formatted);
        }
        importedCount++;
      });

      return NextResponse.json({ success: true, message: `Successfully imported ${importedCount} provider connections!`, providers: memoryProviders });
    }

    if (body.action === "clear_all") {
      memoryProviders = [];
      return NextResponse.json({ success: true, message: "Cleared all providers", providers: [] });
    }

    // Single create / add
    const newProv = {
      id: "sota_prov_" + Math.random().toString(36).substring(2, 9),
      provider: body.provider || "openai",
      authType: body.authType || "apikey",
      name: body.name || body.provider,
      email: body.email || "",
      priority: body.priority || 1,
      isActive: true,
      testStatus: "active",
      lastError: null,
      data: { apiKey: body.apiKey || "" },
      createdAt: new Date().toISOString(),
    };
    memoryProviders.push(newProv);
    return NextResponse.json({ success: true, provider: newProv, providers: memoryProviders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (id) {
      memoryProviders = memoryProviders.filter(p => p.id !== id);
    }
    return NextResponse.json({ success: true, providers: memoryProviders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
