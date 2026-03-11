"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { PlaceSummary, PlaceDetails } from "./types";

interface DemoFlowState {
  selectedPlace: PlaceSummary | null;
  chainLocations: PlaceSummary[];
  confirmedLocations: PlaceSummary[];
  locationDetails: PlaceDetails[];
}

type Action =
  | { type: "SET_SELECTED_PLACE"; payload: PlaceSummary }
  | { type: "SET_CHAIN_LOCATIONS"; payload: PlaceSummary[] }
  | { type: "SET_CONFIRMED_LOCATIONS"; payload: PlaceSummary[] }
  | { type: "SET_LOCATION_DETAILS"; payload: PlaceDetails[] }
  | { type: "RESET" };

const initialState: DemoFlowState = {
  selectedPlace: null,
  chainLocations: [],
  confirmedLocations: [],
  locationDetails: [],
};

function reducer(state: DemoFlowState, action: Action): DemoFlowState {
  switch (action.type) {
    case "SET_SELECTED_PLACE":
      return {
        ...initialState,
        selectedPlace: action.payload,
      };
    case "SET_CHAIN_LOCATIONS":
      return { ...state, chainLocations: action.payload };
    case "SET_CONFIRMED_LOCATIONS":
      return { ...state, confirmedLocations: action.payload };
    case "SET_LOCATION_DETAILS":
      return { ...state, locationDetails: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const DemoFlowContext = createContext<{
  state: DemoFlowState;
  dispatch: Dispatch<Action>;
} | null>(null);

export function DemoFlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <DemoFlowContext.Provider value={{ state, dispatch }}>
      {children}
    </DemoFlowContext.Provider>
  );
}

export function useDemoFlow() {
  const ctx = useContext(DemoFlowContext);
  if (!ctx) throw new Error("useDemoFlow must be used within DemoFlowProvider");
  return ctx;
}
