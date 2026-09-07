import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";

export async function GET() {
  const sqlitePath = "/root/.9router/db/data.sqlite";

  if (!fs.existsSync(sqlitePath)) {
    return NextResponse.json({ success: false, error: "9Router SQLite database not found at " + sqlitePath }, { status: 404 });
  }

  try {
    // Run sqlite3 CLI directly to avoid glibc / native node-sqlite3 version mismatch
    const command = `sqlite3 ${sqlitePath} "SELECT id, provider, authType, name, email, priority, isActive, createdAt FROM providerConnections;"`;
    const output = execSync(command, { encoding: "utf-8" });

    const lines = output.trim().split("\n").filter(Boolean);
    const providers = lines.map((line) => {
      const parts = line.split("|");
      return {
        id: parts[0],
        provider: parts[1],
        authType: parts[2],
        name: parts[3] || parts[4] || parts[1],
        email: parts[4] || "",
        priority: parseInt(parts[5] || "1", 10),
        isActive: parts[6] === "1",
        createdAt: parts[7] || "",
      };
    });

    return NextResponse.json({
      success: true,
      count: providers.length,
      providers,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
