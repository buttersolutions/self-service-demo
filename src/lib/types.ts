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

// --- Guest Feedback Report types (v2) ---

export type ReportCategoryId =
  // Tier 1: AG-addressable
  | 'SVC_CONSISTENCY' | 'STAFF_KNOWLEDGE' | 'STAFF_ATTITUDE'
  | 'WAIT_TIMES' | 'COMMUNICATION' | 'ONBOARDING_SIGNALS'
  | 'MULTI_LOCATION' | 'MGMT_RESPONSE' | 'BOTTLENECK_SIGNALS'
  // Tier 2: General
  | 'FOOD_QUALITY' | 'AMBIANCE' | 'VALUE' | 'BOOKING';

export type PillarId = 'P1' | 'P2' | 'P3' | 'P4';

export interface CategorizedReview {
  review_id: string;
  text: string;
  rating: number;
  date: string;
  reviewer_name: string;
  response_from_owner: string | null;
  categories: {
    id: ReportCategoryId;
    sentiment: 'positive' | 'negative' | 'mixed';
    evidence: string;
    pillars: PillarId[];
  }[];
  severity: number;
  is_recurring_signal: boolean;
  turnover_signal: boolean;
}

export interface ReportAggregates {
  category_summary: Record<string, {
    total: number;
    negative: number;
    mixed: number;
    positive: number;
    avg_severity: number;
  }>;
  pillar_summary: Record<string, {
    reviews_impacted: number;
    pct_of_negative: number;
    top_categories: string[];
  }>;
  trend: {
    recent_sample_avg: number; // average of newest reviews scraped
    overall_lifetime_avg: number; // Google Places lifetime average
    sample_size: number; // how many recent reviews informed the comparison
    direction: 'improving' | 'declining' | 'stable';
  };
  owner_response_rate: number;
  turnover_signal_count: number;
}

export interface ReportQuote {
  text: string;
  rating: number;
  date: string;
  reviewer_name?: string;
}

export interface ReportFinding {
  title: string;
  category_id: ReportCategoryId;
  pattern: string;
  quotes: ReportQuote[];
  root_cause: string;
  impact: string;
  how_addressed: string;
  current_vs_desired: { current: string; desired: string }[];
}

export interface ReportStrength {
  title: string;
  commentary: string;
  quotes: ReportQuote[];
}

export interface ReportRecommendation {
  priority: number;
  title: string;
  description: string;
  category_ids: ReportCategoryId[];
  pillar_ids: PillarId[];
}

export interface ReportCitation {
  id: number;
  source: string;
  finding: string;
}

export interface GuestFeedbackReport {
  executive_summary: string;
  citations?: ReportCitation[];
  quantitative_overview: {
    rating_distribution: Record<string, number>;
    trend: ReportAggregates['trend'];
    category_heatmap: {
      id: ReportCategoryId;
      label: string;
      total: number;
      negative: number;
      avg_severity: number;
    }[];
    pillar_summary: {
      id: PillarId;
      label: string;
      reviews_impacted: number;
      pct_of_negative: number;
      top_categories: string[];
    }[];
    owner_response_rate: number;
  };
  strengths: ReportStrength[];
  findings: ReportFinding[];
  trend_analysis: string;
  recommendations: ReportRecommendation[];
  methodology: string;
  metadata: {
    business_name: string;
    total_reviews: number;
    average_rating: number;
    rating_distribution: Record<string, number>;
    reviews_analyzed: number;
    locations_sampled: number;
    locations_total: number;
    analysis_date: string;
    report_type: 'full' | 'preliminary';
    pipeline_duration_seconds?: number;
  };
  categorized_reviews: CategorizedReview[];
  aggregates: ReportAggregates;
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
