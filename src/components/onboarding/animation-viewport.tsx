"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { BusinessResult } from "@/lib/mock-data";
import type { OnboardingStep } from "@/lib/onboarding-steps";
import { MapAnimation } from "./animations/map-animation";
import { ReviewsAnimation } from "./animations/reviews-animation";
import { BrandingAnimation } from "./animations/branding-animation";
import { WebsiteAnimation } from "./animations/website-animation";
import { CompetitorsAnimation } from "./animations/competitors-animation";
import { InfoAnimation } from "./animations/info-animation";

interface AnimationViewportProps {
  business: BusinessResult;
  currentStep: OnboardingStep | null;
  completedSteps: Set<string>;
}

export function AnimationViewport({ business, currentStep, completedSteps }: AnimationViewportProps) {
  const renderAnimation = () => {
    if (!currentStep) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center h-full"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-muted border-t-primary rounded-full mx-auto"
            />
            <p className="text-sm text-muted-foreground mt-4">Getting ready...</p>
          </div>
        </motion.div>
      );
    }

    const isActive = !completedSteps.has(currentStep.id) || currentStep.id === [...completedSteps].pop();

    switch (currentStep.animationType) {
      case "map":
        return <MapAnimation locations={business.locations} isActive={isActive} businessName={business.name} />;
      case "reviews":
        return (
          <ReviewsAnimation
            reviews={business.reviews}
            isActive={isActive}
            rating={business.rating}
            reviewCount={business.reviewCount}
          />
        );
      case "branding":
        return (
          <BrandingAnimation
            brandColors={business.brandColors}
            businessName={business.name}
            isActive={isActive}
          />
        );
      case "website":
        return (
          <WebsiteAnimation
            website={business.website}
            businessName={business.name}
            isActive={isActive}
          />
        );
      case "competitors":
        return (
          <CompetitorsAnimation
            competitors={business.competitors}
            businessName={business.name}
            businessRating={business.rating}
            isActive={isActive}
          />
        );
      case "info":
        return (
          <InfoAnimation business={business} isActive={isActive} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-gray-50 relative overflow-hidden">
      {/* Step label */}
      {currentStep && (
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-3 left-4 z-10"
        >
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {currentStep.label}
          </span>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep?.id ?? "loading"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="h-full"
        >
          {renderAnimation()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
