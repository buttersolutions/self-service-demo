export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "gathering",
    label: "Gathering information",
    description: "Researching your business online",
  },
  {
    id: "clarifying",
    label: "Clarifying questions",
    description: "Confirm your locations and details",
  },
  {
    id: "ready",
    label: "Your branded experience is ready",
    description: "Preview your AllGravy app",
  },
];

/** Sub-animations that auto-play during the "gathering" step */
export interface GatheringSubStep {
  id: string;
  animationType: "branding" | "map" | "reviews" | "insights";
  searchQuery: string;
  duration: number;
}

export const gatheringSubSteps: GatheringSubStep[] = [
  {
    id: "brand",
    animationType: "branding",
    searchQuery: "{name} brand logo colors",
    duration: 5000,
  },
  {
    id: "locations",
    animationType: "map",
    searchQuery: "{name} locations in {city}",
    duration: 5500,
  },
  {
    id: "reviews",
    animationType: "reviews",
    searchQuery: "{name} customer reviews",
    duration: 4000,
  },
  {
    id: "insights",
    animationType: "insights",
    searchQuery: "{name} business insights {city}",
    duration: 6000,
  },
];
