"use client";

import { motion } from "framer-motion";
import { Star, TrendingUp, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CompetitorsAnimationProps {
  competitors: { name: string; rating: number; distance: string }[];
  businessName: string;
  businessRating: number;
  isActive: boolean;
}

export function CompetitorsAnimation({
  competitors,
  businessName,
  businessRating,
  isActive,
}: CompetitorsAnimationProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 0.3 }}
          className="text-center text-xs uppercase tracking-wider text-muted-foreground"
        >
          Competitive Landscape
        </motion.p>

        {/* Your business */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isActive ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card className="bg-primary text-primary-foreground p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{businessName}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-sm opacity-80">{businessRating}</span>
                </div>
              </div>
              <Badge variant="secondary" className="gap-1.5 font-sans">
                <TrendingUp className="w-3 h-3" />
                Your business
              </Badge>
            </div>
          </Card>
        </motion.div>

        {/* Competitors */}
        <div className="space-y-2">
          {competitors.map((comp, i) => (
            <motion.div
              key={comp.name}
              initial={{ opacity: 0, x: 30 }}
              animate={isActive ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 1.0 + i * 0.4, duration: 0.4 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{comp.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs text-muted-foreground">{comp.rating}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{comp.distance}</span>
                      </span>
                    </div>
                  </div>
                  <div className="w-20">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-muted-foreground/30 rounded-full"
                        initial={{ width: "0%" }}
                        animate={isActive ? { width: `${(comp.rating / businessRating) * 100}%` } : {}}
                        transition={{ delay: 1.5 + i * 0.4, duration: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 2.5, duration: 0.4 }}
        >
          <Card className="bg-secondary border-primary/20 p-3 text-center">
            <span className="text-xs text-primary font-medium">
              You outrank {competitors.filter((c) => c.rating < businessRating).length} of{" "}
              {competitors.length} nearby competitors
            </span>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
