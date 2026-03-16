import { searchPlaces } from "@/lib/google-places";

export const maxDuration = 60;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const { displayName, websiteUri } = await request.json();

  if (!displayName) {
    return Response.json({ error: "displayName required" }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        // Build query and domain filter
        const query = displayName;
        let websiteDomain: string | undefined;
        if (websiteUri) {
          try {
            websiteDomain = new URL(websiteUri).hostname.replace("www.", "");
          } catch { /* ignore */ }
        }

        controller.enqueue(encoder.encode(sseEvent("searching", { query })));

        const places = await searchPlaces(query, websiteDomain);

        controller.enqueue(encoder.encode(sseEvent("locations", places)));
        controller.enqueue(encoder.encode(sseEvent("done", {})));
      } catch (err) {
        controller.enqueue(
          encoder.encode(sseEvent("error", { message: String(err) }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
