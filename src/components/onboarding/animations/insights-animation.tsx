"use client";

import { motion } from "framer-motion";
import { Star, MapPin, Users, TrendingUp, Building2, Clock, DollarSign } from "lucide-react";
import type { BusinessResult } from "@/lib/mock-data";

interface InsightsAnimationProps {
  business: BusinessResult;
  isActive: boolean;
}

const scales = [1, 0.97, 0.95, 0.98, 0.96, 0.94, 0.97];
const rotations = [-1.2, 1.5, -0.6, 1.0, -1.8, 0.8, -1.4];

interface FactCard {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail?: string;
}

export function InsightsAnimation({ business, isActive }: InsightsAnimationProps) {
  const empParts = business.employeeEstimate.split("-").map(Number);
  const empMid = Math.round((empParts[0] + (empParts[1] ?? empParts[0])) / 2);
  const sizeLabel =
    empMid >= 40 ? "Mid-Market" : empMid >= 15 ? "Small Business" : "Micro Business";

  const score = business.growthScore;
  const growthLabel = score >= 35 ? "High Growth" : score >= 20 ? "Moderate Growth" : "Stable";

  const topCompetitor = business.competitors[0];

  const facts: FactCard[] = [
    {
      icon: Users,
      title: "Team Size",
      value: `${business.employeeEstimate} employees`,
      detail: sizeLabel,
    },
    {
      icon: Star,
      title: "Customer Rating",
      value: `${business.rating} / 5.0`,
      detail: `Based on ${business.reviewCount} reviews`,
    },
    {
      icon: MapPin,
      title: "Locations",
      value: `${business.locations.length} location${business.locations.length !== 1 ? "s" : ""}`,
      detail: business.locations.map((l) => l.name.split(" - ")[1] || l.name).join(", "),
    },
    {
      icon: TrendingUp,
      title: "Growth Score",
      value: `${score} / 50`,
      detail: growthLabel,
    },
    {
      icon: Building2,
      title: "Top Competitor",
      value: topCompetitor ? topCompetitor.name : "None found",
      detail: topCompetitor
        ? `${topCompetitor.rating} stars · ${topCompetitor.distance} away`
        : undefined,
    },
    {
      icon: Clock,
      title: "Operating Hours",
      value: business.hours.split(",")[0],
    },
    {
      icon: DollarSign,
      title: "Price Level",
      value: business.priceLevel,
      detail: business.category,
    },
  ];

  return (
    <div className="w-full h-full overflow-hidden font-sans flex items-center justify-center p-8">
      <div className="grid grid-cols-2 gap-4 max-w-2xl w-full auto-rows-min">
        {facts.map((fact, i) => {
          const Icon = fact.icon;
          return (
            <motion.div
              key={fact.title}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={
                isActive
                  ? {
                      opacity: 1,
                      scale: scales[i % scales.length],
                      rotate: rotations[i % rotations.length],
                    }
                  : {}
              }
              transition={{
                delay: 0.2 + i * 0.18,
                type: "spring",
                stiffness: 400,
                damping: 22,
                mass: 0.8,
              }}
              className="bg-white rounded-3xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <span className="text-sm font-semibold text-foreground">{fact.title}</span>
              </div>
              <p className="text-lg font-semibold text-foreground leading-snug">{fact.value}</p>
              {fact.detail && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{fact.detail}</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
