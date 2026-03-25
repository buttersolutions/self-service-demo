// --- Domain types ---

export interface PlaceSummary {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  websiteUri?: string;
  types?: string[];
  countryCode?: string; // ISO 3166-1 alpha-2 lowercase (e.g. "us", "gb")
  userRatingCount?: number;
  rating?: number;
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

// --- Review analysis types ---

export type InsightCategory = 'service-attitude' | 'speed-efficiency' | 'training-knowledge' | 'consistency' | 'dietary-safety' | 'staffing';

export interface ReviewInsight {
  reviewAuthor: string;
  reviewText: string;
  reviewRating: number;
  reviewDate: string;
  sentiment: "positive" | "negative";
  category: InsightCategory;
  relevantExcerpt: string;
  locationName: string;
  allgravyModule: string;
}

export interface CategoryBreakdown {
  category: string;
  allgravyModule: string;
  percentage: number;
  count: number;
  sentiment: 'mostly-positive' | 'mostly-negative' | 'mixed';
}

export interface ReviewAnalysis {
  headline: string;
  body: string;
  insights: ReviewInsight[];
  totalReviewsAnalyzed: number;
  positiveCount: number;
  negativeCount: number;
  categoryBreakdown: CategoryBreakdown[];
  strengths: string[];
  opportunities: string[];
}

export interface ScanResult {
  place: PlaceSummary;
  locations: PlaceSummary[];
  locationDetails: PlaceDetails[];
  reviewAnalysis: ReviewAnalysis | null;
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
