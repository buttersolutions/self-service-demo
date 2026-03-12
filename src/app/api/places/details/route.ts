import { NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/google-places";
import type { PlaceDetailsRequest, PlaceDetailsResponse } from "@/lib/types";

const MAX_PLACES = 10;

export async function POST(request: Request) {
  try {
    const body: PlaceDetailsRequest = await request.json();

    if (!body.placeIds?.length) {
      return NextResponse.json(
        { error: "placeIds is required" },
        { status: 400 }
      );
    }

    const ids = body.placeIds.slice(0, MAX_PLACES);
    const details = await Promise.all(ids.map(getPlaceDetails));

    return NextResponse.json({ details } satisfies PlaceDetailsResponse);
  } catch (err) {
    console.error("places/details error:", err);
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}
