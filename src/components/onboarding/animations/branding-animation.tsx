"use client";

import { motion } from "framer-motion";
import { BounceCards } from "@/components/ui/bounce-cards";

interface BrandingAnimationProps {
  brandColors: { primary: string; secondary: string; accent: string };
  businessName: string;
  images: string[];
  isActive: boolean;
}

export function BrandingAnimation({
  brandColors,
  businessName,
  images,
  isActive,
}: BrandingAnimationProps) {
  const colors = [
    { label: "Primary", value: brandColors.primary },
    { label: "Secondary", value: brandColors.secondary },
    { label: "Accent", value: brandColors.accent },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative font-sans overflow-hidden bg-[#FAFAFA]">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Color blob background */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[150px] opacity-[0.06]"
        style={{ backgroundColor: brandColors.primary }}
        initial={{ scale: 0 }}
        animate={isActive ? { scale: 1 } : {}}
        transition={{ delay: 0.5, duration: 2 }}
      />

      {/* BounceCards with business images */}
      <div className="relative z-10">
        {isActive && (
          <BounceCards
            images={images}
            containerWidth={600}
            containerHeight={340}
            animationDelay={0.4}
            animationStagger={0.18}
            transformStyles={[
              { rotate: -8, translateX: -160, translateY: 8 },
              { rotate: -3, translateX: -70, translateY: -18 },
              { rotate: 2, translateX: 20, translateY: 6 },
              { rotate: 6, translateX: 110, translateY: -12 },
              { rotate: 10, translateX: 195, translateY: 14 },
            ]}
          />
        )}
      </div>

      {/* Brand color palette underneath */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 2.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex items-center gap-3 mt-6"
      >
        {colors.map((color, i) => (
          <motion.div
            key={color.label}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isActive ? { opacity: 1, scale: 1 } : {}}
            transition={{
              delay: 2.4 + i * 0.15,
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="bg-white rounded-xl shadow-sm px-3 py-2.5 flex items-center gap-2.5"
          >
            <div
              className="w-10 h-10 rounded-lg"
              style={{ backgroundColor: color.value }}
            />
            <div>
              <div className="text-[10px] font-medium text-gray-500">{color.label}</div>
              <div className="text-xs font-mono text-gray-800">
                {color.value.toUpperCase()}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
