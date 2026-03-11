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

export async function searchPlaces(
  query: string,
  websiteDomain?: string
): Promise<PlaceSummary[]> {
  const data = await placesRequest(
    "/places:searchText",
    "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.location",
    { textQuery: query }
  );

  const places: PlaceSummary[] = (data.places ?? []).map(mapPlace);

  if (websiteDomain) {
    return places.filter((p) => {
      if (!p.websiteUri) return false;
      try {
        const domain = new URL(p.websiteUri).hostname.replace("www.", "");
        return domain === websiteDomain || domain.endsWith(`.${websiteDomain}`);
      } catch {
        return false;
      }
    });
  }

  return places;
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
