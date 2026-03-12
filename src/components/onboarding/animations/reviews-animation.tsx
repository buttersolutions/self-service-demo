"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Review } from "@/lib/mock-data";

interface ReviewsAnimationProps {
  reviews: Review[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
}

const scales = [1, 0.97, 0.94, 0.98, 0.95, 0.96, 0.93];
const rotations = [-1.5, 1.2, -0.8, 1.8, -1, 0.6, -1.3];

export function ReviewsAnimation({ reviews, isActive }: ReviewsAnimationProps) {
  return (
    <div className="w-full h-full overflow-hidden font-sans flex items-center justify-center p-8">
      <div className="grid grid-cols-2 gap-4 max-w-2xl w-full auto-rows-min">
        {reviews.map((review, i) => (
          <motion.div
            key={review.id}
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
              <img
                src={review.avatar}
                alt={review.author}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground block truncate">{review.author}</span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star
                      key={si}
                      className={`w-3.5 h-3.5 ${
                        si < review.rating
                          ? "fill-amber-400 text-amber-400"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                  <span className="text-[11px] text-muted-foreground ml-1">{review.date}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {review.text}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
