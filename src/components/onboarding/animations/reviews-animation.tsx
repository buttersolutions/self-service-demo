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

const rotations = [-2.5, 1.8, -1.2, 3, -0.8];

export function ReviewsAnimation({ reviews, isActive }: ReviewsAnimationProps) {
  return (
    <div className="w-full h-full overflow-hidden font-sans flex items-center justify-center">
      <div className="max-w-lg mx-auto px-6 relative" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        {reviews.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 40 }}
            animate={isActive ? { opacity: 1, y: 0, rotate: rotations[i % rotations.length] } : {}}
            transition={{ delay: 0.4 + i * 0.7, duration: 0.5, ease: "easeOut" }}
            className="bg-white rounded-2xl p-6 shadow-sm relative"
            style={{
              marginTop: i === 0 ? 0 : "-1.5rem",
              zIndex: reviews.length + i,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Colored avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-semibold"
                style={{
                  backgroundColor: `hsl(${(i * 47 + 20) % 360}, 55%, 88%)`,
                  color: `hsl(${(i * 47 + 20) % 360}, 45%, 38%)`,
                }}
              >
                {review.avatar}
              </div>
              <div className="flex-1 min-w-0">
                {/* Name + stars row */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-foreground">{review.author}</span>
                    <p className="text-xs text-muted-foreground">{review.date}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        className={`w-4 h-4 ${
                          si < review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {/* Review text */}
                <p className="text-sm text-foreground mt-3 leading-relaxed">
                  {review.text.length > 200 ? (
                    <>
                      {review.text.slice(0, 200)}...{" "}
                      <span className="text-primary font-medium">More</span>
                    </>
                  ) : (
                    review.text
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
