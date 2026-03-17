import type { CompanyInsight } from '@/lib/saber';
import type { WaterfallCompany, WaterfallPerson } from '@/lib/waterfall';
import type { PlacePhoto, StaffMention, StaffAnalysis } from '@/lib/types';

export interface LocationItem {
  id: string;
  name: string;
  address: string;
  countryCode?: string; // ISO 3166-1 alpha-2 lowercase (e.g. "us", "gb")
  lat: number;
  lng: number;
}

export interface ReviewItem {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface GatheringData {
  reviews: ReviewItem[] | null;
  insights: CompanyInsight[] | null;
  company: WaterfallCompany | null;
  persons: WaterfallPerson[] | null;
  photos: PlacePhoto[];
  staffMentions: StaffMention[];
  staffAnalysis: StaffAnalysis | null;
}
