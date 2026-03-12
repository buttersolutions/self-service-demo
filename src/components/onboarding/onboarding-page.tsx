"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BusinessResult } from "@/lib/mock-data";
import { onboardingSteps, gatheringSubSteps } from "@/lib/onboarding-steps";
import { ProgressPanel } from "./progress-panel";
import { AnimationViewport } from "./animation-viewport";
import { LocationsEditor } from "./locations-editor";
import { BrandedExperience } from "./branded-experience";

interface OnboardingPageProps {
  business: BusinessResult;
}

export function OnboardingPage({ business }: OnboardingPageProps) {
  // 0 = gathering, 1 = clarifying, 2 = ready
  const [mainStepIndex, setMainStepIndex] = useState(0);
  const [completedMainSteps, setCompletedMainSteps] = useState<Set<string>>(
    new Set()
  );

  // Sub-step state for the gathering phase
  const [subStepIndex, setSubStepIndex] = useState(0);
  const [completedSubSteps, setCompletedSubSteps] = useState<Set<string>>(
    new Set()
  );
  const subStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSubStep =
    subStepIndex < gatheringSubSteps.length
      ? gatheringSubSteps[subStepIndex]
      : null;

  // Auto-advance sub-steps during gathering phase
  useEffect(() => {
    if (mainStepIndex !== 0 || !currentSubStep) return;

    subStepTimer.current = setTimeout(() => {
      setCompletedSubSteps((prev) => new Set([...prev, currentSubStep.id]));

      const nextIdx = subStepIndex + 1;
      if (nextIdx >= gatheringSubSteps.length) {
        // All sub-steps done — complete "gathering" and move to "clarifying"
        setCompletedMainSteps((prev) => new Set([...prev, "gathering"]));
        setMainStepIndex(1);
      } else {
        setSubStepIndex(nextIdx);
      }
    }, currentSubStep.duration);

    return () => {
      if (subStepTimer.current) clearTimeout(subStepTimer.current);
    };
  }, [mainStepIndex, subStepIndex, currentSubStep]);

  // Build a description for the gathering step based on current sub-step
  const gatheringDescription = currentSubStep
    ? resolveSearchQuery(currentSubStep.searchQuery, business)
    : "Finishing up...";

  const handleLocationsConfirm = useCallback(() => {
    setCompletedMainSteps((prev) => new Set([...prev, "clarifying"]));
    setMainStepIndex(2);
  }, []);

  // Build the right-side content based on current main step
  const renderContent = () => {
    switch (mainStepIndex) {
      case 0: {
        // Gathering: show animation viewport with auto-cycling sub-steps
        // Map sub-step to the format AnimationViewport expects
        const fakeStep = currentSubStep
          ? {
              id: currentSubStep.id,
              animationType: currentSubStep.animationType as
                | "map"
                | "reviews"
                | "insights"
                | "branding",
              searchQuery: currentSubStep.searchQuery,
              label: "",
              description: "",
            }
          : null;

        return (
          <div className="flex-1 rounded-2xl border border-border bg-gray-50 overflow-hidden">
            <AnimationViewport
              business={business}
              currentStep={fakeStep}
              completedSteps={completedSubSteps}
            />
          </div>
        );
      }
      case 1:
        return (
          <div className="flex-1 rounded-2xl border border-border bg-card overflow-hidden">
            <LocationsEditor
              locations={business.locations}
              businessName={business.name}
              onConfirm={handleLocationsConfirm}
            />
          </div>
        );
      case 2:
        return (
          <div className="flex-1 rounded-2xl border border-border bg-gray-50 overflow-hidden">
            <BrandedExperience business={business} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background font-sans p-4 gap-4">
      {/* Left sidebar */}
      <div className="relative z-10 w-64 flex-shrink-0">
        <ProgressPanel
          steps={onboardingSteps}
          currentStepIndex={mainStepIndex}
          completedSteps={completedMainSteps}
          businessName={business.name}
          activeDescription={mainStepIndex === 0 ? gatheringDescription : undefined}
        />
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col gap-3">
        {renderContent()}
      </div>
    </div>
  );
}

function resolveSearchQuery(template: string, business: BusinessResult): string {
  const city = business.address.split(",").slice(-2, -1)[0]?.trim() ?? "";
  return template.replace("{name}", business.name).replace("{city}", city);
}
