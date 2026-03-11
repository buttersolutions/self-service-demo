export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  duration: number; // ms to simulate
  animationType: "map" | "reviews" | "branding" | "website" | "competitors" | "info";
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "locations",
    label: "Finding locations",
    description: "Discovering all your business locations",
    duration: 6000,
    animationType: "map",
  },
  {
    id: "branding",
    label: "Extracting branding",
    description: "Identifying your brand colors, fonts & style",
    duration: 5500,
    animationType: "branding",
  },
  {
    id: "reviews",
    label: "Gathering reviews",
    description: "Analyzing customer sentiment across platforms",
    duration: 7000,
    animationType: "reviews",
  },
  {
    id: "website",
    label: "Scanning website",
    description: "Crawling your web presence for key info",
    duration: 5000,
    animationType: "website",
  },
  {
    id: "competitors",
    label: "Analyzing competitors",
    description: "Mapping your competitive landscape",
    duration: 5500,
    animationType: "competitors",
  },
  {
    id: "info",
    label: "Compiling business profile",
    description: "Assembling your complete business profile",
    duration: 4500,
    animationType: "info",
  },
];
