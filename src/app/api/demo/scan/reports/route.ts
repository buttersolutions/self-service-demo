import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const REPORTS_DIR = path.join(process.cwd(), "reports");

export async function GET() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    const files = await fs.readdir(REPORTS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();
    
    const reports = await Promise.all(
      jsonFiles.map(async (filename) => {
        const content = await fs.readFile(path.join(REPORTS_DIR, filename), "utf-8");
        return { filename, report: JSON.parse(content) };
      })
    );
    
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ reports: [] });
  }
}
