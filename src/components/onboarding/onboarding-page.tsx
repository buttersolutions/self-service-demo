"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessResult } from "@/lib/mock-data";
import { onboardingSteps } from "@/lib/onboarding-steps";
import { ProgressPanel } from "./progress-panel";
import { AnimationViewport } from "./animation-viewport";

interface OnboardingPageProps {
  business: BusinessResult;
}

export function OnboardingPage({ business }: OnboardingPageProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (currentStepIndex >= onboardingSteps.length) {
      setTimeout(() => setShowDashboard(true), 1500);
      return;
    }

    const step = onboardingSteps[currentStepIndex];
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => new Set([...prev, step.id]));
      setCurrentStepIndex((prev) => prev + 1);
    }, step.duration);

    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  const currentStep =
    currentStepIndex < onboardingSteps.length
      ? onboardingSteps[currentStepIndex]
      : onboardingSteps[onboardingSteps.length - 1];

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
      {/* Floating left panel */}
      <div className="relative z-10 w-64 flex-shrink-0">
        <ProgressPanel
          steps={onboardingSteps}
          currentStepIndex={currentStepIndex}
          completedSteps={completedSteps}
          businessName={business.name}
        />
      </div>

      {/* Right content area */}
      <div className="flex-1 rounded-2xl border border-border bg-gray-50 overflow-hidden">
        <AnimationViewport
          business={business}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      </div>
    </div>
  );
}
