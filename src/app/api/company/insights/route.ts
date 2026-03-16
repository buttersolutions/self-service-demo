import { NextResponse } from "next/server";
import { getCompanyInsights } from "@/lib/saber";

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "domain is required" },
        { status: 400 }
      );
    }

    const insights = await getCompanyInsights(domain);

    const allFailed = insights.length > 0 && insights.every((i) => i.error);
    if (allFailed) {
      const firstError = insights.find((i) => i.error)?.error ?? "All signals failed";
      return NextResponse.json(
        { error: firstError, insights },
        { status: 502 },
      );
    }

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("company/insights error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch company insights";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
