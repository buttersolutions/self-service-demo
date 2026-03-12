"use client";

import { useState } from "react";
import { SearchPage } from "@/components/onboarding/search-page";
import { OnboardingPageTest } from "@/components/onboarding/onboarding-page-test";
import type { BusinessResult } from "@/lib/mock-data";

export default function Test1() {
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);

  if (selectedBusiness) {
    return <OnboardingPageTest business={selectedBusiness} />;
  }

  return <SearchPage onSelectBusiness={setSelectedBusiness} />;
}
