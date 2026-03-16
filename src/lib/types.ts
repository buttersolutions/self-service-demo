// --- Domain types ---

export interface PlaceSummary {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  websiteUri?: string;
  types?: string[];
  userRatingCount?: number;
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

// --- Staff analysis types ---

export interface StaffMention {
  reviewAuthor: string;
  reviewText: string;
  reviewRating: number;
  reviewDate: string;
  sentiment: "positive" | "negative";
  staffNames: string[];
  relevantExcerpt: string;
  locationName: string;
}

export interface StaffAnalysis {
  headline: string;
  body: string;
  standoutEmployee: string | null;
  mentions: StaffMention[];
  totalReviewsAnalyzed: number;
  positiveCount: number;
  negativeCount: number;
  namedEmployees: string[];
}

export interface ScanResult {
  place: PlaceSummary;
  locations: PlaceSummary[];
  locationDetails: PlaceDetails[];
  staffAnalysis: StaffAnalysis | null;
}

// --- API request/response types ---

export interface TextSearchRequest {
  query: string;
  websiteDomain?: string;
  locationBias?: {
    lat: number;
    lng: number;
    radiusMeters?: number;
  };
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
