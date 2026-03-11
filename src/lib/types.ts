// --- Domain types ---

export interface PlaceSummary {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  websiteUri?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativePublishTimeDescription: string;
  profilePhotoUrl?: string;
}

export interface PlacePhoto {
  name: string; // resource name: places/{id}/photos/{ref}
  widthPx: number;
  heightPx: number;
}

export interface PlaceDetails extends PlaceSummary {
  reviews: PlaceReview[];
  photos: PlacePhoto[];
  rating?: number;
  userRatingCount?: number;
}

// --- API request/response types ---

export interface TextSearchRequest {
  query: string;
  websiteDomain?: string;
}

export interface TextSearchResponse {
  places: PlaceSummary[];
}

export interface PlaceDetailsRequest {
  placeIds: string[];
}

export interface PlaceDetailsResponse {
  details: PlaceDetails[];
}
