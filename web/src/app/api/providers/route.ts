import { NextResponse } from "next/server";

type JsonRecord = Record<string, unknown>;
type StoredProvider = {
  id: string;
  provider: string;
  authType: string;
  name: string;
  email: string;
  priority: number;
  isActive: boolean;
  testStatus: string;
  lastError: string | null;
  data: JsonRecord;
  createdAt: string;
};

const asRecord = (value: unknown): JsonRecord => (
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
);
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const integer = (value: unknown, fallback = 1) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Unexpected provider error";
const sensitiveKey = /(access.?token|refresh.?token|api.?key|secret|authorization|password)/i;
const publicProvider = (provider: StoredProvider) => ({
  ...provider,
  data: Object.fromEntries(Object.entries(provider.data).map(([key, value]) => [key, sensitiveKey.test(key) ? "[redacted]" : value])),
});
const publicProviders = () => memoryProviders.map(publicProvider);

let memoryProviders: StoredProvider[] = [];

export async function GET() {
  return NextResponse.json({ success: true, count: memoryProviders.length, providers: publicProviders() });
}

export async function POST(req: Request) {
  try {
    const body = asRecord(await req.json());

    if (body.action === "import_json") {
      const source = asRecord(body.data);
      const rawItems = Array.isArray(body.data)
        ? body.data
        : source.providerConnections ?? source.providers ?? [body.data];
      const items = Array.isArray(rawItems) ? rawItems : [];
      let importedCount = 0;

      items.forEach((item) => {
        const provider = asRecord(item);
        let data = asRecord(provider.data);
        if (typeof provider.data === "string") {
          try { data = asRecord(JSON.parse(provider.data)); } catch { data = {}; }
        }

        const formatted: StoredProvider = {
          id: text(provider.id, `sota_prov_${Math.random().toString(36).slice(2, 9)}`),
          provider: text(provider.provider, "openai"),
          authType: text(provider.authType, "apikey"),
          name: text(provider.name, text(provider.email, text(provider.displayName, text(provider.provider, "Provider")))),
          email: text(provider.email, text(data.displayName)),
          priority: integer(provider.priority),
          isActive: provider.isActive === undefined ? true : Boolean(provider.isActive),
          testStatus: text(data.testStatus, text(provider.testStatus, "active")),
          lastError: text(data.lastError) || text(provider.lastError) || null,
          data,
          createdAt: text(provider.createdAt, new Date().toISOString()),
        };

        const existingIdx = memoryProviders.findIndex((existing) => existing.id === formatted.id);
        if (existingIdx >= 0) memoryProviders[existingIdx] = formatted;
        else memoryProviders.push(formatted);
        importedCount++;
      });

      return NextResponse.json({ success: true, message: `Successfully imported ${importedCount} provider connections`, providers: publicProviders() });
    }

    if (body.action === "clear_all") {
      memoryProviders = [];
      return NextResponse.json({ success: true, message: "Cleared all providers", providers: [] });
    }

    const newProvider: StoredProvider = {
      id: `sota_prov_${Math.random().toString(36).slice(2, 9)}`,
      provider: text(body.provider, "openai"),
      authType: text(body.authType, "apikey"),
      name: text(body.name, text(body.provider, "Provider")),
      email: text(body.email),
      priority: integer(body.priority),
      isActive: true,
      testStatus: "active",
      lastError: null,
      data: { apiKey: text(body.apiKey) },
      createdAt: new Date().toISOString(),
    };
    memoryProviders.push(newProvider);
    return NextResponse.json({ success: true, provider: publicProvider(newProvider), providers: publicProviders() });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (id) memoryProviders = memoryProviders.filter((provider) => provider.id !== id);
    return NextResponse.json({ success: true, providers: publicProviders() });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
