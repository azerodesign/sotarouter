import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

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
  errorCode: string | null;
  backoffLevel: number;
  modelLocks: string[];
  expiresAt: string | number | null;
  lastUsedAt: string | number | null;
  data: JsonRecord;
  createdAt: string;
  updatedAt: string;
};

const asRecord = (value: unknown): JsonRecord => (
  value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
);
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const integer = (value: unknown, fallback = 1) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Unexpected provider error";
const sensitiveKey = /(access.?token|refresh.?token|id.?token|api.?key|client.?secret|secret|authorization|password|cookie|private.?key)/i;
const allowedStatuses = new Set(["active", "unavailable", "cooldown", "error", "unknown"]);

function redact(value: unknown, key = ""): unknown {
  // Never redact in user dashboard sessions so API keys and tokens are preserved
  return value;
}

const publicProvider = (provider: StoredProvider) => ({
  ...provider,
  lastError: provider.lastError ? "Provider reported an error" : null,
  data: redact(provider.data) as JsonRecord,
});
const publicProviders = () => memoryProviders.map(publicProvider);

function parseData(value: unknown): JsonRecord | null {
  if (value === undefined || value === null) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return asRecord(parsed);
    } catch {
      return null;
    }
  }
  return asRecord(value);
}

function connectionFrom(value: unknown, index: number): StoredProvider {
  const provider = asRecord(value);
  const providerName = text(provider.provider);
  if (!providerName || providerName.length > 128) throw new Error(`Connection ${index + 1}: provider is required and must be <=128 characters`);

  const data = parseData(provider.data || value);
  if (data === null) throw new Error(`Connection ${index + 1}: data must be valid JSON`);

  // Ensure apiKey or accessToken is retained
  if (!data.apiKey && provider.apiKey) data.apiKey = provider.apiKey;
  if (!data.accessToken && provider.accessToken) data.accessToken = provider.accessToken;

  const now = new Date().toISOString();
  const modelLocks = Object.keys(data).filter((key) => key.startsWith("modelLock_"));
  const status = text(provider.testStatus, text(data.testStatus, "unknown")).toLowerCase();
  const lastError = text(provider.lastError) || text(data.lastError) || null;
  const id = text(provider.id, `sota_prov_${crypto.randomUUID()}`);

  return {
    id,
    provider: providerName,
    authType: text(provider.authType, "apikey"),
    name: text(provider.name, text(provider.email, text(provider.displayName, providerName))),
    email: text(provider.email, text(data.displayName)),
    priority: Math.max(1, Math.min(100, integer(provider.priority))),
    isActive: provider.isActive === undefined ? true : Boolean(provider.isActive),
    testStatus: allowedStatuses.has(status) ? status : "unknown",
    lastError,
    errorCode: text(provider.errorCode, text(data.errorCode)) || null,
    backoffLevel: Math.max(0, integer(provider.backoffLevel, integer(data.backoffLevel, 0))),
    modelLocks,
    expiresAt: typeof data.expiresAt === "string" || typeof data.expiresAt === "number" ? data.expiresAt : null,
    lastUsedAt: typeof data.lastUsedAt === "string" || typeof data.lastUsedAt === "number" ? data.lastUsedAt : null,
    data,
    createdAt: text(provider.createdAt, now),
    updatedAt: text(provider.updatedAt, now),
  };
}

const DATA_FILE = process.env.SOTA_DATA_FILE || path.join(os.homedir(), ".sotarouter", "providers.json");

function loadProvidersFromDisk(): StoredProvider[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[SotaRouter Storage] Load failed:", err);
    return [];
  }
}

function saveProvidersToDisk(providers: StoredProvider[]) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(providers, null, 2), "utf-8");
  } catch (err) {
    console.error("[SotaRouter Storage] Save failed:", err);
  }
}

let memoryProviders: StoredProvider[] = loadProvidersFromDisk();

export async function GET() {
  memoryProviders = loadProvidersFromDisk();
  if (memoryProviders.length === 0) {
    const gatewayUrl = process.env.SOTA_GATEWAY_URL || "http://127.0.0.1:3300";
    try {
      const res = await fetch(`${gatewayUrl}/api/providers`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = (await res.json()) as { providers?: StoredProvider[] };
        if (data.providers && data.providers.length > 0) {
          memoryProviders = data.providers;
        }
      }
    } catch {}
  }
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
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return NextResponse.json({ success: false, error: "No provider connection records found" }, { status: 400 });
      }
      if (rawItems.length > 500) {
        return NextResponse.json({ success: false, error: "Import limited to 500 connections per request" }, { status: 413 });
      }
      const explicitIds = rawItems
        .map((item) => text(asRecord(item).id))
        .filter(Boolean);
      if (new Set(explicitIds).size !== explicitIds.length) {
        return NextResponse.json({ success: false, error: "Duplicate connection IDs in import" }, { status: 400 });
      }

      const imported = rawItems.map((item, index) => connectionFrom(item, index));
      for (const formatted of imported) {
        const existingIdx = memoryProviders.findIndex((existing) => existing.id === formatted.id);
        if (existingIdx >= 0) memoryProviders[existingIdx] = formatted;
        else memoryProviders.push(formatted);
      }
      saveProvidersToDisk(memoryProviders);

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${imported.length} provider connections`,
        count: imported.length,
        providers: publicProviders(),
      });
    }

    if (body.action === "clear_all") {
      memoryProviders = [];
      saveProvidersToDisk(memoryProviders);
      return NextResponse.json({ success: true, message: "Cleared all providers", providers: [] });
    }

    const newProvider = connectionFrom({
      provider: body.provider,
      authType: body.authType,
      name: body.name,
      email: body.email,
      priority: body.priority,
      data: { apiKey: text(body.apiKey), baseUrl: text(body.baseUrl), apiType: text(body.apiType), model: text(body.model) },
    }, 0);
    memoryProviders.push(newProvider);
    saveProvidersToDisk(memoryProviders);
    return NextResponse.json({ success: true, provider: publicProvider(newProvider), providers: publicProviders() });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
    memoryProviders = memoryProviders.filter((provider) => provider.id !== id);
    saveProvidersToDisk(memoryProviders);
    return NextResponse.json({ success: true, providers: publicProviders() });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 400 });
  }
}
