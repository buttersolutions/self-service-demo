"use client";

import { motion } from "framer-motion";
import { Palette, Paintbrush, Type } from "lucide-react";

interface BrandingAnimationProps {
  brandColors: { primary: string; secondary: string; accent: string };
  businessName: string;
  isActive: boolean;
}

export function BrandingAnimation({ brandColors, businessName, isActive }: BrandingAnimationProps) {
  const colors = [
    { label: "Primary", value: brandColors.primary },
    { label: "Secondary", value: brandColors.secondary },
    { label: "Accent", value: brandColors.accent },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-8 relative font-sans overflow-hidden">
      {/* Animated background — large brand color wash */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : {}}
        transition={{ delay: 0.3, duration: 1.5 }}
      >
        <div
          className="absolute top-0 right-0 w-[60%] h-full opacity-[0.04]"
          style={{ background: `linear-gradient(135deg, ${brandColors.primary}, ${brandColors.accent}, transparent)` }}
        />
      </motion.div>

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo / Brand mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isActive ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
          className="flex flex-col items-center mb-10"
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg mb-4"
            style={{ backgroundColor: brandColors.primary }}
          >
            <span className="text-3xl font-bold text-white">
              {businessName.charAt(0)}
            </span>
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="text-2xl font-bold tracking-tight"
            style={{ color: brandColors.primary }}
          >
            {businessName}
          </motion.h2>
        </motion.div>

        {/* Color palette — horizontal swatches */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] mb-4"
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Color Palette</span>
          </div>
          <div className="flex gap-3">
            {colors.map((color, i) => (
              <motion.div
                key={color.label}
                initial={{ opacity: 0, y: 15 }}
                animate={isActive ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.5 + i * 0.2, duration: 0.4 }}
                className="flex-1"
              >
                <div
                  className="w-full h-16 rounded-xl mb-2"
                  style={{ backgroundColor: color.value }}
                />
                <div className="text-xs font-medium text-foreground">{color.label}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {color.value}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Typography + style preview */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.2, duration: 0.5 }}
            className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Type className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Typography</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-lg font-bold" style={{ color: brandColors.primary }}>
                Heading
              </div>
              <div className="text-sm" style={{ color: brandColors.accent }}>
                Subheading
              </div>
              <div className="text-xs text-muted-foreground">
                Body text style
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.5, duration: 0.5 }}
            className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Paintbrush className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Style</span>
            </div>
            {/* Mini button previews */}
            <div className="space-y-2">
              <div
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white text-center"
                style={{ backgroundColor: brandColors.primary }}
              >
                Primary Button
              </div>
              <div
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-center border"
                style={{ borderColor: brandColors.primary, color: brandColors.primary }}
              >
                Secondary
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
