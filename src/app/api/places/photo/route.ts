import { type NextRequest, NextResponse } from "next/server";
import { getPhotoUrl } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const maxWidthPx = parseInt(
    request.nextUrl.searchParams.get("maxWidthPx") ?? "400",
    10
  );

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const url = getPhotoUrl(name, maxWidthPx);
    const res = await fetch(url, { redirect: "follow" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch photo" },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (err) {
    console.error("places/photo error:", err);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}
