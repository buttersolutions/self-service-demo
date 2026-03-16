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
  "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.location,places.userRatingCount";

export async function textSearch(body: Record<string, unknown>): Promise<PlaceSummary[]> {
  const data = await placesRequest("/places:searchText", FIELD_MASK, body);
  return (data.places ?? []).map(mapPlace);
}

export function brandFilter(websiteDomain: string, queryDisplayName: string) {
  const brandName = websiteDomain.split(".")[0]; // e.g. "maharani-hamburg"
  // Extract meaningful brand words (drop city/generic suffixes, short words)
  const brandWords = brandName
    .split(/[-_]/)
    .filter((w) => w.length > 2)
    .map((w) => w.toLowerCase());
  const queryWords = queryDisplayName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return (p: PlaceSummary) => {
    // Check 1: website domain contains the brand name (original logic)
    if (p.websiteUri) {
      try {
        const hostname = new URL(p.websiteUri).hostname.replace("www.", "");
        if (hostname.includes(brandName)) return true;
        // Check 1b: shared domain root (e.g. maharani-hamburg / maharaja-hamburg
        // share the city segment and have similar structure)
        const hostParts = hostname.split(".")[0].split(/[-_]/).filter((w) => w.length > 2);
        const sharedWords = hostParts.filter((w) => brandWords.includes(w));
        if (sharedWords.length > 0 && hostParts.length > 0) return true;
      } catch {
        // ignore
      }
    }

    // Check 2: display name shares significant words with the query
    // (catches sister brands like Maharani/Maharaja under same business)
    const nameLower = p.displayName.toLowerCase();
    const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 2);
    const sharedNameWords = queryWords.filter((w) => nameWords.includes(w));
    if (sharedNameWords.length > 0) return true;

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
  return {
    placeId: raw.id ?? raw.name?.split("/").pop() ?? "",
    displayName:
      typeof raw.displayName === "string"
        ? raw.displayName
        : raw.displayName?.text ?? "",
    formattedAddress: raw.formattedAddress ?? "",
    websiteUri: raw.websiteUri,
    userRatingCount: raw.userRatingCount ?? 0,
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
