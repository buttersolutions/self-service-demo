"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface BounceCardsProps {
  images: string[];
  containerWidth?: number;
  containerHeight?: number;
  animationDelay?: number;
  animationStagger?: number;
  easeType?: string;
  transformStyles?: { rotate: number; translateX: number; translateY: number }[];
  className?: string;
}

const defaultTransforms = [
  { rotate: -3, translateX: -15, translateY: 0 },
  { rotate: 2, translateX: 10, translateY: -8 },
  { rotate: -1, translateX: 25, translateY: 4 },
  { rotate: 4, translateX: -5, translateY: -12 },
  { rotate: -2, translateX: 20, translateY: 6 },
];

export function BounceCards({
  images,
  containerWidth = 400,
  containerHeight = 200,
  animationDelay = 0,
  animationStagger = 0.12,
  transformStyles = defaultTransforms,
  className = "",
}: BounceCardsProps) {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasStarted(true), animationDelay * 1000);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
    >
      {images.slice(0, 5).map((src, i) => {
        const t = transformStyles[i % transformStyles.length];
        return (
          <motion.div
            key={i}
            className="absolute rounded-xl overflow-hidden shadow-lg border-2 border-white"
            style={{
              width: containerHeight * 0.7,
              height: containerHeight * 0.85,
              zIndex: i,
            }}
            initial={{
              opacity: 0,
              y: 80,
              rotate: 0,
              x: 0,
              scale: 0.7,
            }}
            animate={
              hasStarted
                ? {
                    opacity: 1,
                    y: t.translateY,
                    x: t.translateX,
                    rotate: t.rotate,
                    scale: 1,
                  }
                : {}
            }
            transition={{
              delay: i * animationStagger,
              type: "spring",
              stiffness: 200,
              damping: 18,
              mass: 0.8,
            }}
          >
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
