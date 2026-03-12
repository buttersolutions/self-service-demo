"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessResult } from "@/lib/mock-data";
import { ProgressPanel } from "./progress-panel";
import { DocumentBuilder } from "./document-builder";

/** Legacy step definitions used only by this test page */
interface LegacyStep {
  id: string;
  label: string;
  description: string;
  animationType: "map" | "reviews" | "insights" | "branding" | "competitors";
  searchQuery: string;
  documentSection: string;
  duration: number;
}

const legacySteps: LegacyStep[] = [
  { id: "brand", label: "Brand Identity", description: "Analyzing brand colors and visual identity", animationType: "branding", searchQuery: "{name} brand logo colors", documentSection: "header", duration: 5000 },
  { id: "locations", label: "Locations", description: "Finding your business locations", animationType: "map", searchQuery: "{name} locations in {city}", documentSection: "images", duration: 5500 },
  { id: "reviews", label: "Reviews", description: "Analyzing customer reviews", animationType: "reviews", searchQuery: "{name} customer reviews", documentSection: "locations", duration: 4000 },
  { id: "insights", label: "Insights", description: "Gathering business insights", animationType: "insights", searchQuery: "{name} company size and headcount", documentSection: "insights", duration: 5000 },
  { id: "competitors", label: "Competitors", description: "Identifying competitors", animationType: "competitors", searchQuery: "{name} competitors nearby {city}", documentSection: "painPoints", duration: 4500 },
];

interface OnboardingPageProps {
  business: BusinessResult;
}

function resolveSearchQuery(template: string, business: BusinessResult): string {
  const city = business.address.split(",").slice(-2, -1)[0]?.trim() ?? "";
  return template.replace("{name}", business.name).replace("{city}", city);
}

export function OnboardingPageTest({ business }: OnboardingPageProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = useMemo(
    () =>
      currentStepIndex < legacySteps.length
        ? legacySteps[currentStepIndex]
        : null,
    [currentStepIndex]
  );

  const advanceStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev >= legacySteps.length) return prev;

      const step = legacySteps[prev];
      setCompletedSteps((cs) => new Set([...cs, step.id]));
      setRevealedSections((rs) => new Set([...rs, step.documentSection]));

      const nextIndex = prev + 1;
      return nextIndex;
    });
  }, []);

  // Auto-advance through steps
  useEffect(() => {
    if (!currentStep) return;

    autoAdvanceTimer.current = setTimeout(() => {
      advanceStep();
    }, currentStep.duration);

    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [currentStep, advanceStep]);

  const searchText = currentStep
    ? resolveSearchQuery(currentStep.searchQuery, business)
    : "";

  if (showDashboard) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="min-h-screen bg-background font-sans flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
            className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-3">You&apos;re all set!</h1>
          <p className="text-muted-foreground mb-8">
            {business.name} has been successfully onboarded. Your dashboard is ready.
          </p>
          <Button size="lg" className="gap-2 font-sans">
            Go to Dashboard
          </Button>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>{business.locations.length} locations imported</span>
            <span>·</span>
            <span>{business.reviewCount} reviews analyzed</span>
            <span>·</span>
            <span>Brand kit ready</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background font-sans p-4 gap-4">
      {/* Left sidebar */}
      <div className="relative z-10 w-64 flex-shrink-0">
        <ProgressPanel
          steps={legacySteps}
          currentStepIndex={currentStepIndex}
          completedSteps={completedSteps}
          businessName={business.name}
        />
      </div>

      {/* Right: Moodboard */}
      <div className="flex-1 overflow-hidden">
        <DocumentBuilder
          business={business}
          currentStep={currentStep}
          completedSteps={completedSteps}
          revealedSections={revealedSections}
          searchText={searchText}
        />
      </div>
    </div>
  );
}
