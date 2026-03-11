"use client";

import { useState } from "react";
import { SearchPage } from "@/components/onboarding/search-page";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";
import type { BusinessResult } from "@/lib/mock-data";

export default function Home() {
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);

  if (selectedBusiness) {
    return <OnboardingPage business={selectedBusiness} />;
  }

  return <SearchPage onSelectBusiness={setSelectedBusiness} />;
}
