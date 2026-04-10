"use client";

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
  type Dispatch,
} from "react";
import type { PlaceSummary, ReviewInsight, ReviewAnalysis, GuestFeedbackReport } from "./types";
import type {
  BusinessData,
  FeedPost,
  FetchTiming,
  GatheringData,
  LocationItem,
  ReviewItem,
  ReviewProgressEvent,
  Step,
} from "@/components/onboarding/types";
import { deriveBrandColorMap, type BrandColorMap } from "./colors";

/* ── State ──────────────────────────────────────────────────────────── */

export type PipelineStageStatus = 'pending' | 'active' | 'done';

export interface PipelineStage {
  id: string;
  label: string;
  status: PipelineStageStatus;
}

export interface OnboardingState {
  step: Step;
  loading: boolean;
  selectedPlace: PlaceSummary | null;
  business: BusinessData | null;
  locations: LocationItem[];
  gatheringData: GatheringData;
  fetchTimings: Record<string, FetchTiming>;
  chainDiscoveryDone: boolean;
  pipelineStages: PipelineStage[];
}

const initialGatheringData: GatheringData = {
  reviews: null,
  company: null,
  persons: null,
  photos: [],
  reviewInsights: [],
  reviewAnalysis: null,
  reviewAnalysisPreview: null,
  reviewProgress: [],
  feedPosts: null,
  guestFeedbackReport: null,
  guestFeedbackReportPreview: null,
};

const initialState: OnboardingState = {
  step: "search",
  loading: false,
  selectedPlace: null,
  business: null,
  locations: [],
  gatheringData: initialGatheringData,
  fetchTimings: {},
  chainDiscoveryDone: false,
  pipelineStages: [],
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
  | { type: "APPEND_REVIEW_INSIGHTS"; payload: ReviewInsight[] }
  | { type: "SET_REVIEW_ANALYSIS"; payload: ReviewAnalysis }
  | { type: "SET_REVIEW_ANALYSIS_PREVIEW"; payload: ReviewAnalysis }
  | { type: "APPEND_REVIEW_PROGRESS"; payload: ReviewProgressEvent }
  | { type: "SET_FEED_POSTS"; payload: FeedPost[] }
  | { type: "TRACK_FETCH_START"; payload: { key: string; label: string } }
  | { type: "TRACK_FETCH_END"; payload: { key: string; status: "done" | "error"; errorMessage?: string } }
  | { type: "TRACK_SSE_EVENT"; payload: { key: string; event: string } }
  | { type: "SET_REVIEW_ANALYSIS_FALLBACK"; payload: ReviewAnalysis }
  | { type: "SET_GUEST_FEEDBACK_REPORT"; payload: GuestFeedbackReport }
  | { type: "SET_GUEST_FEEDBACK_REPORT_PREVIEW"; payload: GuestFeedbackReport }
  | { type: "SET_CHAIN_DISCOVERY_DONE" }
  | { type: "INIT_PIPELINE_STAGES"; payload: PipelineStage[] }
  | { type: "UPDATE_PIPELINE_STAGE"; payload: { id: string; status: PipelineStageStatus; label?: string } }
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
    case "APPEND_REVIEW_INSIGHTS":
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          reviewInsights: [...state.gatheringData.reviewInsights, ...action.payload],
        },
      };
    case "SET_REVIEW_ANALYSIS":
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          reviewAnalysis: action.payload,
          reviewInsights: action.payload.insights,
        },
      };
    case "SET_REVIEW_ANALYSIS_PREVIEW":
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          reviewAnalysisPreview: action.payload,
        },
      };
    case "APPEND_REVIEW_PROGRESS":
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          reviewProgress: [...state.gatheringData.reviewProgress, action.payload],
        },
      };
    case "SET_FEED_POSTS":
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          feedPosts: action.payload,
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
    case "SET_REVIEW_ANALYSIS_FALLBACK":
      if (state.gatheringData.reviewAnalysis !== null) return state;
      return {
        ...state,
        gatheringData: {
          ...state.gatheringData,
          reviewAnalysis: { ...action.payload, insights: state.gatheringData.reviewInsights },
        },
      };
    case "SET_GUEST_FEEDBACK_REPORT":
      return {
        ...state,
        gatheringData: { ...state.gatheringData, guestFeedbackReport: action.payload },
      };
    case "SET_GUEST_FEEDBACK_REPORT_PREVIEW":
      return {
        ...state,
        gatheringData: { ...state.gatheringData, guestFeedbackReportPreview: action.payload },
      };
    case "SET_CHAIN_DISCOVERY_DONE":
      return { ...state, chainDiscoveryDone: true };
    case "INIT_PIPELINE_STAGES":
      return { ...state, pipelineStages: action.payload };
    case "UPDATE_PIPELINE_STAGE":
      return {
        ...state,
        pipelineStages: state.pipelineStages.map((s) =>
          s.id === action.payload.id
            ? { ...s, status: action.payload.status, label: action.payload.label ?? s.label }
            : s
        ),
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
