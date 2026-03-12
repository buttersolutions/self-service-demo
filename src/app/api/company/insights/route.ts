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

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("company/insights error:", err);
    return NextResponse.json(
      { error: "Failed to fetch company insights" },
      { status: 500 }
    );
  }
}
