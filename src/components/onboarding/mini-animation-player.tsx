"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import type { BusinessResult } from "@/lib/mock-data";
/** Local step type for the mini animation player (test page only) */
interface MiniPlayerStep {
  id: string;
  label: string;
  description: string;
  animationType: "map" | "reviews" | "insights" | "branding" | "competitors";
  searchQuery: string;
}
import { MapAnimation } from "./animations/map-animation";
import { ReviewsAnimation } from "./animations/reviews-animation";
import { BrandingAnimation } from "./animations/branding-animation";
import { InsightsAnimation } from "./animations/insights-animation";
import { CompetitorsAnimation } from "./animations/competitors-animation";

interface MiniAnimationPlayerProps {
  business: BusinessResult;
  currentStep: MiniPlayerStep | null;
  completedSteps: Set<string>;
  searchText: string;
}

function TypewriterMini({ text }: { text: string }) {
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
          className="inline-block w-[1.5px] h-3 bg-foreground ml-px align-middle"
        />
      )}
    </span>
  );
}

export function MiniAnimationPlayer({
  business,
  currentStep,
  completedSteps,
  searchText,
}: MiniAnimationPlayerProps) {
  if (!currentStep) return null;

  const isActive = !completedSteps.has(currentStep.id);

  const renderAnimation = () => {
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
        return <InsightsAnimation business={business} isActive={isActive} />;
      case "branding":
        return (
          <BrandingAnimation
            brandColors={business.brandColors}
            businessName={business.name}
            images={business.images}
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
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-6 right-6 z-50 w-[370px] h-[220px] rounded-2xl overflow-hidden border border-border bg-white"
      style={{
        boxShadow:
          "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      {/* Search bar */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`mini-search-${currentStep.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-2 left-2 right-2 z-30"
        >
          <div className="px-2.5 py-1.5 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm border border-border/50">
            <div className="flex items-center gap-2">
              <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-[11px] text-foreground truncate">
                <TypewriterMini text={searchText} />
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Scaled-down animation content */}
      <div className="w-[740px] h-[440px] origin-top-left" style={{ transform: "scale(0.5)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {renderAnimation()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Scan line */}
      {isActive && (
        <motion.div
          key={`scan-mini-${currentStep.id}`}
          className="absolute left-0 right-0 h-[1.5px] z-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(98, 92, 228, 0.5) 30%, rgba(98, 92, 228, 0.8) 50%, rgba(98, 92, 228, 0.5) 70%, transparent 100%)",
          }}
          initial={{ top: 0, opacity: 0 }}
          animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      )}
    </motion.div>
  );
}
