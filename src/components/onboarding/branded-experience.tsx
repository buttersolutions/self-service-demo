"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Star, Clock, MapPin, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessResult } from "@/lib/mock-data";

function isLightColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function GeneratedLogo({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const seed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }, [name]);

  const variant = seed % 4;
  const textColor = isLightColor(color) ? "#1a1a1a" : "#ffffff";

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={color} />
      {variant === 0 && (
        <>
          <circle cx="16" cy="12" r="5" fill={textColor} opacity="0.9" />
          <rect x="9" y="20" width="14" height="2.5" rx="1.25" fill={textColor} opacity="0.5" />
        </>
      )}
      {variant === 1 && <path d="M16 7L25 22H7L16 7Z" fill={textColor} opacity="0.85" />}
      {variant === 2 && (
        <>
          <rect x="7" y="7" width="8" height="8" rx="2.5" fill={textColor} opacity="0.85" />
          <rect x="17" y="7" width="8" height="8" rx="4" fill={textColor} opacity="0.6" />
          <rect x="7" y="17" width="18" height="8" rx="2.5" fill={textColor} opacity="0.4" />
        </>
      )}
      {variant === 3 && (
        <>
          <circle cx="16" cy="16" r="10" fill={textColor} opacity="0.15" />
          <text x="16" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill={textColor}>
            {name.charAt(0)}
          </text>
        </>
      )}
    </svg>
  );
}

export function BrandedExperience({ business }: { business: BusinessResult }) {
  const { brandColors, name } = business;
  const primaryTextColor = isLightColor(brandColors.primary) ? "#1a1a1a" : "#ffffff";

  const menuItems = [
    { label: "Today's Schedule", sub: "3 shifts assigned" },
    { label: "My Team", sub: `${business.locations.length * 8} members` },
    { label: "Time Off", sub: "Request & view" },
  ];

  return (
    <div className="h-full flex items-center justify-center p-8 font-sans relative overflow-hidden">
      {/* Background blobs */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[180px] opacity-[0.05]"
        style={{ backgroundColor: brandColors.primary }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2 }}
      />

      <div className="relative z-10 flex items-center gap-12">
        {/* iPhone mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: 280, perspective: "1000px" }}
        >
          <div className="relative rounded-[40px] border-[6px] border-gray-900 bg-gray-900 shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />
            <div className="rounded-[34px] overflow-hidden bg-white">
              {/* Status bar */}
              <div className="h-12 bg-white flex items-end justify-between px-6 pb-1">
                <span className="text-[10px] font-semibold text-gray-900">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2.5 border border-gray-900 rounded-sm relative">
                    <div className="absolute inset-[1px] right-[2px] bg-gray-900 rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* Branded header */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="px-5 pt-2 pb-5"
                style={{ backgroundColor: brandColors.primary }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <GeneratedLogo name={name} color={brandColors.secondary} size={36} />
                  <div>
                    <div className="text-sm font-bold" style={{ color: primaryTextColor }}>
                      {name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] font-medium" style={{ color: `${primaryTextColor}cc` }}>
                        Welcome back!
                      </span>
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.4 }}
                  className="flex gap-2"
                >
                  {[
                    { icon: Clock, label: "Clock In" },
                    { icon: MapPin, label: "Locations" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex-1 rounded-xl p-3 text-center"
                      style={{ backgroundColor: `${primaryTextColor}15` }}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: primaryTextColor }} />
                      <span className="text-[9px] font-medium" style={{ color: primaryTextColor }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Menu items */}
              <div className="px-5 pt-5">
                {menuItems.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.6 + i * 0.15, duration: 0.4 }}
                    className="flex items-center justify-between py-3.5 border-b border-gray-100"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{item.sub}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </motion.div>
                ))}
              </div>

              {/* Tab bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.2 }}
                className="mt-6 px-5 pb-2 flex justify-around"
              >
                {["Home", "Schedule", "Team", "Profile"].map((tab, i) => (
                  <div key={tab} className="flex flex-col items-center gap-1">
                    <div
                      className="w-5 h-5 rounded-md"
                      style={{
                        backgroundColor: i === 0 ? brandColors.primary : "#e5e7eb",
                        opacity: i === 0 ? 1 : 0.5,
                      }}
                    />
                    <span
                      className="text-[8px] font-medium"
                      style={{ color: i === 0 ? brandColors.primary : "#9ca3af" }}
                    >
                      {tab}
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* Home indicator */}
              <div className="flex justify-center py-2">
                <div className="w-28 h-1 bg-gray-300 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* CTA side */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="max-w-xs"
        >
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Your app is ready
          </h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {name}&apos;s branded AllGravy experience is set up with your
            colors, locations, and team structure. Get started now.
          </p>

          <div className="space-y-3 mb-8">
            {[
              `${business.locations.length} locations configured`,
              "Brand colors applied",
              "Team channels pre-created",
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.0 + i * 0.15 }}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {item}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5 }}
          >
            <Button size="lg" className="gap-2.5 px-8 text-base font-semibold">
              Get your branded app
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
