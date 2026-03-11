import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/google-places";
import type { TextSearchRequest, TextSearchResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body: TextSearchRequest = await request.json();

    if (!body.query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    const places = await searchPlaces(body.query, body.websiteDomain);

    return NextResponse.json({ places } satisfies TextSearchResponse);
  } catch (err) {
    console.error("places/search error:", err);
    return NextResponse.json(
      { error: "Failed to search places" },
      { status: 500 }
    );
  }
}
