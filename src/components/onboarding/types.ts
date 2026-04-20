import type { WaterfallCompany, WaterfallPerson } from '@/lib/waterfall';
import type { PlacePhoto, ReviewInsight, ReviewAnalysis, GuestFeedbackReport } from '@/lib/types';

export type Step =
  // Shared
  | 'search'
  | 'mockup'
  | 'done'
  // Flow 1 (standard branding-led)
  | 'map-scanning'
  | 'photos-scanning'
  | 'website-prompt'
  | 'website-scanning'
  | 'confirm'
  // Flow 2 (feedback-led)
  | 'feedback-analysis'
  | 'feedback-confirm';

export interface BusinessData {
  name: string;
  logoUrl: string | null;
  domain: string;
  brandColors: string[];
  fonts?: string[];
  ogImage?: string | null;
  screenshot?: string | null;
  favicon?: string | null;
  websiteImages?: string[];
  instagramUsername?: string | null;
}

export interface FetchTiming {
  label: string;
  startedAt: number;
  finishedAt: number | null;
  durationMs: number | null;
  status: 'pending' | 'done' | 'error';
  errorMessage?: string;
  sseEvents?: string[];
}

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  countryCode?: string; // ISO 3166-1 alpha-2 lowercase (e.g. "us", "gb")
  lat: number;
  lng: number;
  userRatingCount?: number;
  rating?: number;
}

export interface ReviewItem {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface ReviewProgressEvent {
  placeId: string;
  displayName: string;
  reviewCount: number;
  sort: string;
}

export interface FeedPost {
  body: string;
  channel: string;
  platform: 'desktop' | 'mobile';
}

export interface GatheringData {
  reviews: ReviewItem[] | null;
  company: WaterfallCompany | null;
  persons: WaterfallPerson[] | null;
  photos: PlacePhoto[];
  reviewInsights: ReviewInsight[];
  reviewAnalysis: ReviewAnalysis | null;
  reviewAnalysisPreview: ReviewAnalysis | null;
  reviewProgress: ReviewProgressEvent[];
  feedPosts: FeedPost[] | null;
  guestFeedbackReport: GuestFeedbackReport | null;
  guestFeedbackReportPreview: GuestFeedbackReport | null;
}
