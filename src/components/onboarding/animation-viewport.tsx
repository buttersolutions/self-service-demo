"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { BusinessResult } from "@/lib/mock-data";
import { MapAnimation } from "./animations/map-animation";
import { ReviewsAnimation } from "./animations/reviews-animation";
import { BrandingAnimation } from "./animations/branding-animation";
import { InsightsAnimation } from "./animations/insights-animation";
interface AnimationStep {
  id: string;
  animationType: "map" | "reviews" | "insights" | "branding";
  searchQuery: string;
}

interface AnimationViewportProps {
  business: BusinessResult;
  currentStep: AnimationStep | null;
  completedSteps: Set<string>;
}

function resolveSearchQuery(template: string, business: BusinessResult): string {
  const city = business.address.split(",").slice(-2, -1)[0]?.trim() ?? "";
  return template.replace("{name}", business.name).replace("{city}", city);
}

function TypewriterSearch({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 45);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[2px] h-4 bg-foreground ml-px align-middle"
        />
      )}
    </span>
  );
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
        return <MapAnimation locations={business.locations} isActive={isActive} />;
      case "reviews":
        return (
          <ReviewsAnimation
            reviews={business.reviews}
            isActive={isActive}
            rating={business.rating}
            reviewCount={business.reviewCount}
          />
        );
      case "insights":
        return (
          <InsightsAnimation business={business} isActive={isActive} />
        );
      case "branding":
        return (
          <BrandingAnimation
            brandColors={business.brandColors}
            businessName={business.name}
            images={business.images}
            isActive={isActive}
          />
        );
      default:
        return null;
    }
  };

  const searchText = currentStep ? resolveSearchQuery(currentStep.searchQuery, business) : "";

  return (
    <div className="h-full bg-gray-50 relative overflow-hidden">
      {/* Global search bar with AnimatePresence + typewriter */}
      <AnimatePresence mode="wait">
        {currentStep && (
          <motion.div
            key={`search-${currentStep.id}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-6"
          >
            <Card className="px-4 py-2.5 shadow-lg backdrop-blur-sm bg-white/95">
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate">
                  <TypewriterSearch text={searchText} />
                </span>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content fills full height — search bar floats on top */}
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

      {/* Scan line overlay */}
      {currentStep && !completedSteps.has(currentStep.id) && (
        <motion.div
          key={`scan-${currentStep.id}`}
          className="absolute left-0 right-0 h-[2px] z-20 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(98, 92, 228, 0.5) 30%, rgba(98, 92, 228, 0.8) 50%, rgba(98, 92, 228, 0.5) 70%, transparent 100%)",
            boxShadow: "0 0 20px 4px rgba(98, 92, 228, 0.15)",
          }}
          initial={{ top: 0, opacity: 0 }}
          animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  );
}
