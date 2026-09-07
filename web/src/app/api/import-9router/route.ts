import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { NextResponse } from "next/server";

type ProviderRow = {
  id: string;
  provider: string;
  authType: string;
  name: string;
  email: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
};

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Import failed";

export async function GET() {
  const sqlitePath = "/root/.9router/db/data.sqlite";
  if (!existsSync(sqlitePath)) {
    return NextResponse.json({ success: false, error: `9Router SQLite database not found at ${sqlitePath}` }, { status: 404 });
  }

  try {
    const query = "SELECT id, provider, authType, name, email, priority, isActive, createdAt FROM providerConnections;";
    const output = execFileSync("sqlite3", [sqlitePath, query], { encoding: "utf-8" });
    const providers: ProviderRow[] = output.trim().split("\n").filter(Boolean).map((line) => {
      const parts = line.split("|");
      return {
        id: parts[0] || "",
        provider: parts[1] || "",
        authType: parts[2] || "apikey",
        name: parts[3] || parts[4] || parts[1] || "Provider",
        email: parts[4] || "",
        priority: Number.parseInt(parts[5] || "1", 10),
        isActive: parts[6] === "1",
        createdAt: parts[7] || "",
      };
    });

    return NextResponse.json({ success: true, count: providers.length, providers });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
