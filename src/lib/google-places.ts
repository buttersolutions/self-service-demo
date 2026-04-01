import type { PlaceSummary, PlaceDetails, PlaceReview, PlacePhoto } from "./types";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
const BASE = "https://places.googleapis.com/v1";

async function placesRequest(path: string, fieldMask: string, body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Places API error (${res.status}): ${text}`);
  }

  return res.json();
}

// --- Text Search: find chain locations ---

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.location,places.addressComponents,places.userRatingCount,places.rating";

export async function textSearch(body: Record<string, unknown>): Promise<PlaceSummary[]> {
  const data = await placesRequest("/places:searchText", FIELD_MASK, body);
  return (data.places ?? []).map(mapPlace);
}

export function brandFilter(websiteDomain: string, queryDisplayName: string) {
  // Use full domain with TLD for strict matching (e.g. "picopizza.dk", not just "picopizza")
  const fullDomain = websiteDomain.toLowerCase();
  const brandName = fullDomain.split(".")[0]; // e.g. "picopizza"

  const queryWords = queryDisplayName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return (p: PlaceSummary) => {
    // Check 1: place's website domain matches the full domain (including TLD)
    if (p.websiteUri) {
      try {
        const hostname = new URL(p.websiteUri).hostname.replace("www.", "").toLowerCase();
        // Exact domain match (strongest signal)
        if (hostname === fullDomain) return true;
        // Subdomain of the same domain (e.g. order.picopizza.dk)
        if (hostname.endsWith(`.${fullDomain}`)) return true;
      } catch {
        // ignore
      }
    }

    // Check 2: display name matches AND place has no website (or website unavailable)
    // This catches locations that Google doesn't have a website for but clearly belong
    // to the same chain based on name. Require ALL significant query words to match,
    // not just one (avoids "Pico" or "Pizza" alone matching unrelated places).
    if (!p.websiteUri) {
      const nameLower = p.displayName.toLowerCase();
      const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 2);
      const allQueryWordsMatch = queryWords.length > 0 && queryWords.every((w) => nameWords.includes(w));
      if (allQueryWordsMatch) return true;
    }

    return false;
  };
}

export async function searchPlaces(
  query: string,
  websiteDomain?: string,
  locationBias?: { lat: number; lng: number; radiusMeters?: number }
): Promise<PlaceSummary[]> {
  const body: Record<string, unknown> = { textQuery: query, maxResultCount: 20 };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.lat, longitude: locationBias.lng },
        radius: locationBias.radiusMeters ?? 500000,
      },
    };
  }

  if (!websiteDomain) {
    return textSearch(body);
  }

  // For chain discovery: run parallel regional searches to overcome
  // Google's tendency to return few results for short global queries.
  // Extract country from the selected place's address if available,
  // but also run a global search. Dedupe by placeId.
  const filter = brandFilter(websiteDomain, query);

  // Run the query both as-is and with just the brand name, across regions.
  // Google Text Search returns inconsistent results for short chain names,
  // so we cast a wide net and filter by domain.
  const brandName = websiteDomain.split(".")[0];
  const queries = [query, brandName !== query.toLowerCase() ? brandName : null].filter(Boolean) as string[];

  const regions = [
    {}, // global
    { locationRestriction: { rectangle: { low: { latitude: 35, longitude: -11 }, high: { latitude: 71, longitude: 40 } } } }, // Europe
  ];

  const searches = queries.flatMap((q) =>
    regions.map((region) =>
      textSearch({ ...body, ...region, textQuery: q }).catch(() => [] as PlaceSummary[])
    )
  );

  const results = await Promise.all(searches);

  const seen = new Set<string>();
  const deduped: PlaceSummary[] = [];
  for (const batch of results) {
    for (const place of batch) {
      if (!seen.has(place.placeId)) {
        seen.add(place.placeId);
        deduped.push(place);
      }
    }
  }

  return deduped.filter(filter).filter((p) => (p.userRatingCount ?? 0) > 0);
}

// --- Place Details: reviews + photos ---

export async function getPlaceDetails(
  placeId: string
): Promise<PlaceDetails> {
  const data = await placesRequest(
    `/places/${placeId}`,
    "id,displayName,formattedAddress,websiteUri,location,rating,userRatingCount,reviews,photos"
  );

  return {
    ...mapPlace(data),
    rating: data.rating,
    userRatingCount: data.userRatingCount,
    reviews: (data.reviews ?? []).map(mapReview),
    photos: (data.photos ?? []).map(mapPhoto),
  };
}

// --- Photo URL ---

export function getPhotoUrl(photoName: string, maxWidthPx = 400): string {
  return `${BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${API_KEY}`;
}

// --- Mappers ---

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPlace(raw: any): PlaceSummary {
  const components: any[] = raw.addressComponents ?? [];
  const country = components.find((c: any) =>
    (c.types ?? []).includes("country")
  );
  const countryCode = country?.shortText?.toLowerCase() as string | undefined;

  return {
    placeId: raw.id ?? raw.name?.split("/").pop() ?? "",
    displayName:
      typeof raw.displayName === "string"
        ? raw.displayName
        : raw.displayName?.text ?? "",
    formattedAddress: raw.formattedAddress ?? "",
    websiteUri: raw.websiteUri,
    ...(countryCode && { countryCode }),
    userRatingCount: raw.userRatingCount ?? 0,
    ...(raw.rating != null && { rating: raw.rating }),
    location: {
      lat: raw.location?.latitude ?? 0,
      lng: raw.location?.longitude ?? 0,
    },
  };
}

function mapReview(raw: any): PlaceReview {
  return {
    authorName: raw.authorAttribution?.displayName ?? "Anonymous",
    rating: raw.rating ?? 0,
    text:
      typeof raw.text === "string"
        ? raw.text
        : raw.text?.text ?? "",
    relativePublishTimeDescription:
      raw.relativePublishTimeDescription ?? "",
    profilePhotoUrl: raw.authorAttribution?.photoUri,
  };
}

function mapPhoto(raw: any): PlacePhoto {
  return {
    name: raw.name ?? "",
    widthPx: raw.widthPx ?? 0,
    heightPx: raw.heightPx ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
