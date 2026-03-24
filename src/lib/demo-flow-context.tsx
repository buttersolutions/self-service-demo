"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import type { PlaceSummary, StaffMention, StaffAnalysis } from "./types";
import type {
  BusinessData,
  FetchTiming,
  GatheringData,
  LocationItem,
  ReviewItem,
  Step,
} from "@/components/onboarding/types";
import { deriveBrandColorMap, type BrandColorMap } from "./colors";

/* ── State ──────────────────────────────────────────────────────────── */

export interface OnboardingState {
  step: Step;
  loading: boolean;
  selectedPlace: PlaceSummary | null;
  business: BusinessData | null;
  locations: LocationItem[];
  gatheringData: GatheringData;
  fetchTimings: Record<string, FetchTiming>;
}

const initialGatheringData: GatheringData = {
  reviews: null,
  insights: null,
  company: null,
  persons: null,
  photos: [],
  staffMentions: [],
  staffAnalysis: null,
};

const initialState: OnboardingState = {
  step: "search",
  loading: false,
  selectedPlace: null,
  business: null,
  locations: [],
  gatheringData: initialGatheringData,
  fetchTimings: {},
};

/* ── Actions ────────────────────────────────────────────────────────── */

export type OnboardingAction =
  | { type: "SET_STEP"; payload: Step }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SELECTED_PLACE"; payload: PlaceSummary }
  | { type: "SET_BUSINESS"; payload: BusinessData }
  | { type: "UPDATE_BUSINESS"; payload: Partial<BusinessData> }
  | { type: "SET_LOCATIONS"; payload: LocationItem[] }
  | { type: "UPDATE_GATHERING_DATA"; payload: Partial<GatheringData> }
  | { type: "MERGE_REVIEWS"; payload: ReviewItem[] }
  | { type: "APPEND_STAFF_MENTIONS"; payload: StaffMention[] }
  | { type: "SET_STAFF_ANALYSIS"; payload: StaffAnalysis }
  | { type: "TRACK_FETCH_START"; payload: { key: string; label: string } }
  | { type: "TRACK_FETCH_END"; payload: { key: string; status: "done" | "error"; errorMessage?: string } }
  | { type: "TRACK_SSE_EVENT"; payload: { key: string; event: string } }
  | { type: "SET_STAFF_ANALYSIS_FALLBACK"; payload: StaffAnalysis }
  | { type: "RESET" };

/* ── Reducer ────────────────────────────────────────────────────────── */

function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_SELECTED_PLACE":
      return { ...state, selectedPlace: action.payload };
    case "SET_BUSINESS":
      return { ...state, business: action.payload };
    case "UPDATE_BUSINESS":
      return state.business
        ? { ...state, business: { ...state.business, ...action.payload } }
        : state;
    case "SET_LOCATIONS":
      return { ...state, locations: action.payload };
    case "UPDATE_GATHERING_DATA":
      return { ...state, gatheringData: { ...state.gatheringData, ...action.payload } };
    case "MERGE_REVIEWS": {
      const existing = state.gatheringData.reviews ?? [];
      const seen = new Set(existing.map((r) => `${r.author}:${(r.text ?? "").slice(0, 50)}`));
      const merged = [...existing];
      for (const review of action.payload) {
        const key = `${review.author}:${(review.text ?? "").slice(0, 50)}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(review);
        }
      }
      return { ...state, gatheringData: { ...state.gatheringData, reviews: merged } };
    }
    case "APPEND_STAFF_MENTIONS":
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          staffMentions: [...state.gatheringData.staffMentions, ...action.payload],
        },
      };
    case "SET_STAFF_ANALYSIS":
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          staffAnalysis: action.payload,
          staffMentions: action.payload.mentions,
        },
      };
    case "TRACK_FETCH_START": {
      const { key, label } = action.payload;
      return {
        ...state,
        fetchTimings: {
          ...state.fetchTimings,
          [key]: { label, startedAt: Date.now(), finishedAt: null, durationMs: null, status: "pending" },
        },
      };
    }
    case "TRACK_FETCH_END": {
      const { key, status, errorMessage } = action.payload;
      const existing = state.fetchTimings[key];
      if (!existing) return state;
      const finishedAt = Date.now();
      return {
        ...state,
        fetchTimings: {
          ...state.fetchTimings,
          [key]: { ...existing, finishedAt, durationMs: finishedAt - existing.startedAt, status, errorMessage },
        },
      };
    }
    case "TRACK_SSE_EVENT": {
      const { key, event } = action.payload;
      const existing = state.fetchTimings[key];
      if (!existing) return state;
      const elapsed = ((Date.now() - existing.startedAt) / 1000).toFixed(1);
      const entry = `+${elapsed}s ${event}`;
      return {
        ...state,
        fetchTimings: {
          ...state.fetchTimings,
          [key]: { ...existing, sseEvents: [...(existing.sseEvents ?? []), entry] },
        },
      };
    }
    case "SET_STAFF_ANALYSIS_FALLBACK":
      if (state.gatheringData.staffAnalysis !== null) return state;
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          staffAnalysis: { ...action.payload, mentions: state.gatheringData.staffMentions },
        },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

/* ── Context ────────────────────────────────────────────────────────── */

interface OnboardingContextValue {
  state: OnboardingState;
  dispatch: Dispatch<OnboardingAction>;
  brandColorMap: BrandColorMap;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const brandColorMap = useMemo(
    () => deriveBrandColorMap(state.business?.brandColors ?? []),
    [state.business?.brandColors],
  );

  const value = useMemo(
    () => ({ state, dispatch, brandColorMap }),
    [state, dispatch, brandColorMap],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
