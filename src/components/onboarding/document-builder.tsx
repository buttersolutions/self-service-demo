"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Plus, X, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessResult } from "@/lib/mock-data";
/** Local step type used only by the test page's document builder */
interface DocumentBuilderStep {
  id: string;
  label: string;
  description: string;
  animationType: "map" | "reviews" | "insights" | "branding" | "competitors";
  searchQuery: string;
  documentSection?: string;
}
import { DecryptedText } from "@/components/ui/decrypted-text";
import { CountUp } from "@/components/ui/count-up";
import { BounceCards } from "@/components/ui/bounce-cards";
import { InlineSectionLoader } from "./inline-section-loader";
import { MapAnimation } from "./animations/map-animation";
import { ReviewsAnimation } from "./animations/reviews-animation";
import { BrandingAnimation } from "./animations/branding-animation";
import { InsightsAnimation } from "./animations/insights-animation";
import { CompetitorsAnimation } from "./animations/competitors-animation";

interface DocumentBuilderProps {
  business: BusinessResult;
  currentStep: DocumentBuilderStep | null;
  completedSteps: Set<string>;
  revealedSections: Set<string>;
  searchText: string;
}

function EditableField({
  children,
  className = "",
  tag: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  tag?: "span" | "div";
}) {
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      className={`outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 rounded px-0.5 -mx-0.5 transition-colors cursor-text ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Types out text, then becomes an editable field */
function TypeThenEdit({
  text,
  className = "",
  speed = 35,
  delay = 400,
}: {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      started.current = true;
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, delay);
    return () => clearTimeout(delayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) {
    return <EditableField className={className}>{text}</EditableField>;
  }

  return (
    <span className={className}>
      {displayed}
      {!done && displayed.length > 0 && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-[2px] h-[0.85em] bg-current ml-0.5 align-middle"
        />
      )}
    </span>
  );
}

function SectionReveal({
  visible,
  delay = 0,
  children,
}: {
  visible: boolean;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GeneratedLogo({
  name,
  primaryColor,
  size = 48,
}: {
  name: string;
  primaryColor: string;
  size?: number;
}) {
  const seed = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }, [name]);

  const variant = seed % 4;
  const r = parseInt(primaryColor.slice(1, 3), 16) || 0;
  const g = parseInt(primaryColor.slice(3, 5), 16) || 0;
  const b = parseInt(primaryColor.slice(5, 7), 16) || 0;
  const textColor =
    (r * 299 + g * 587 + b * 114) / 1000 > 160 ? "#1a1a1a" : "#ffffff";

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill={primaryColor} />
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

/** Editable color swatch — large circle with hex underneath */
function ColorSwatch({
  label,
  initialColor,
}: {
  label: string;
  initialColor: string;
}) {
  const [color, setColor] = useState(initialColor);

  return (
    <label className="flex flex-col items-center gap-2 cursor-pointer group">
      <div className="relative">
        <div
          className="w-14 h-14 rounded-full ring-2 ring-white shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="sr-only"
        />
      </div>
      <div className="text-center">
        <div className="text-[10px] text-gray-400">{label}</div>
        <div className="text-[11px] font-mono text-gray-500">
          {color.toUpperCase()}
        </div>
      </div>
    </label>
  );
}

export function DocumentBuilder({
  business,
  currentStep,
  revealedSections,
  searchText,
}: DocumentBuilderProps) {
  const showHeader = revealedSections.has("header");
  const showImages = revealedSections.has("images");
  const showLocations = revealedSections.has("locations");
  const showInsights = revealedSections.has("insights");
  const showPainPoints = revealedSections.has("painPoints");
  const allDone =
    showHeader && showImages && showLocations && showInsights && showPainPoints;

  const isLoadingSection = (section: string) =>
    currentStep?.documentSection === section && !revealedSections.has(section);

  const city = business.address.split(",").slice(-2, -1)[0]?.trim() ?? "";

  const empParts = business.employeeEstimate.split("-").map(Number);
  const empMid = Math.round((empParts[0] + (empParts[1] ?? empParts[0])) / 2);
  const sizeLabel =
    empMid >= 40 ? "Mid-Market" : empMid >= 15 ? "Small Business" : "Micro Business";

  const [locations, setLocations] = useState(business.locations);
  const [painPoints, setPainPoints] = useState(business.painPoints);

  const removeLocation = (id: string) =>
    setLocations((prev) => prev.filter((l) => l.id !== id));

  const addLocation = () =>
    setLocations((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "New Location",
        address: "Enter address...",
        lat: 0,
        lng: 0,
        isMain: false,
      },
    ]);

  const removePainPoint = (index: number) =>
    setPainPoints((prev) => prev.filter((_, i) => i !== index));

  const addPainPoint = () =>
    setPainPoints((prev) => [...prev, "Describe a challenge..."]);

  return (
    <div
      className="h-full overflow-y-auto px-10 py-8"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-[760px] mx-auto space-y-12">
        {/* ── HEADER: Loading → Content ── */}
        {isLoadingSection("header") && (
          <InlineSectionLoader searchText={searchText} height={220}>
            <BrandingAnimation
              brandColors={business.brandColors}
              businessName={business.name}
              images={business.images}
              isActive={true}
            />
          </InlineSectionLoader>
        )}

        <SectionReveal visible={showHeader}>
          <div className="flex items-start gap-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                delay: 0.3,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <GeneratedLogo
                name={business.name}
                primaryColor={business.brandColors.primary}
                size={60}
              />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h1 className="text-4xl font-bold text-gray-900 leading-tight tracking-tight">
                <TypeThenEdit
                  text={business.name}
                  speed={35}
                  delay={400}
                  className=""
                />
              </h1>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-base text-gray-400 mt-1.5"
              >
                <EditableField>{business.category}</EditableField>
                {" · "}
                <EditableField>{city}</EditableField>
              </motion.div>
            </div>
          </div>

          {/* Brand color palette */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.4 }}
            className="flex items-end gap-8 mt-8"
          >
            {[
              { label: "Primary", value: business.brandColors.primary },
              { label: "Secondary", value: business.brandColors.secondary },
              { label: "Accent", value: business.brandColors.accent },
            ].map((color, i) => (
              <motion.div
                key={color.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 1.7 + i * 0.15,
                  type: "spring",
                  stiffness: 300,
                }}
              >
                <ColorSwatch
                  label={color.label}
                  initialColor={color.value}
                />
              </motion.div>
            ))}
          </motion.div>
        </SectionReveal>

        {/* ── IMAGES: Loading → BounceCards ── */}
        {isLoadingSection("images") && (
          <InlineSectionLoader searchText={searchText} height={220}>
            <ReviewsAnimation
              reviews={business.reviews}
              isActive={true}
              rating={business.rating}
              reviewCount={business.reviewCount}
            />
          </InlineSectionLoader>
        )}

        <SectionReveal visible={showImages} delay={0.1}>
          <div className="flex justify-center py-2">
            <BounceCards
              images={business.images}
              containerWidth={620}
              containerHeight={220}
              animationDelay={0.3}
              animationStagger={0.15}
              transformStyles={[
                { rotate: -8, translateX: -120, translateY: 6 },
                { rotate: -3, translateX: -50, translateY: -10 },
                { rotate: 1, translateX: 15, translateY: 4 },
                { rotate: 5, translateX: 80, translateY: -8 },
                { rotate: 9, translateX: 145, translateY: 10 },
              ]}
            />
          </div>
        </SectionReveal>

        {/* ── LOCATIONS: Loading → Content ── */}
        {isLoadingSection("locations") && (
          <InlineSectionLoader searchText={searchText} height={220}>
            <MapAnimation locations={business.locations} isActive={true} />
          </InlineSectionLoader>
        )}

        <SectionReveal visible={showLocations} delay={0.1}>
          <div>
            <div className="flex items-baseline gap-3 mb-5">
              <h2 className="text-2xl font-bold text-gray-900">Locations</h2>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-gray-400"
              >
                {locations.length} found
              </motion.span>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {locations.map((loc, i) => (
                  <motion.div
                    key={loc.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors group"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        loc.isMain ? "bg-primary" : "bg-gray-300"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        <EditableField>{loc.name}</EditableField>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        <EditableField>{loc.address}</EditableField>
                      </div>
                    </div>
                    {loc.isMain && (
                      <span className="text-[10px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        Main
                      </span>
                    )}
                    <button
                      onClick={() => removeLocation(loc.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-md"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={addLocation}
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-colors w-full text-sm text-gray-400 hover:text-gray-500"
              >
                <Plus className="w-4 h-4" />
                Add location
              </motion.button>
            </div>
          </div>
        </SectionReveal>

        {/* ── INSIGHTS: Loading → Content ── */}
        {isLoadingSection("insights") && (
          <InlineSectionLoader searchText={searchText} height={200}>
            <InsightsAnimation business={business} isActive={true} />
          </InlineSectionLoader>
        )}

        <SectionReveal visible={showInsights} delay={0.1}>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-5">
              Business insights
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-50/80 rounded-xl p-5"
              >
                <div className="text-xs text-gray-400 mb-1.5">Est. team size</div>
                <div className="text-2xl font-bold text-gray-900">
                  <EditableField>{business.employeeEstimate}</EditableField>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  <EditableField>{sizeLabel}</EditableField>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gray-50/80 rounded-xl p-5"
              >
                <div className="text-xs text-gray-400 mb-1.5">Growth score</div>
                <div className="text-2xl font-bold text-gray-900">
                  <CountUp to={business.growthScore} duration={1.2} delay={0.7} />
                  <span className="text-sm text-gray-300 font-normal"> / 50</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {business.growthScore >= 35
                    ? "High growth"
                    : business.growthScore >= 20
                    ? "Moderate"
                    : "Stable"}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gray-50/80 rounded-xl p-5"
              >
                <div className="text-xs text-gray-400 mb-1.5">Rating</div>
                <div className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {business.rating.toFixed(1)}
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {business.reviewCount} reviews
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {[
                { label: "Category", value: business.category },
                { label: "Price range", value: business.priceLevel },
                { label: "Hours", value: business.hours.split(",")[0] },
                { label: "Phone", value: business.phone },
              ].map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 + i * 0.12 }}
                  className="flex justify-between py-2 border-b border-gray-100/80"
                >
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <span className="text-xs text-gray-700">
                    <EditableField>{row.value}</EditableField>
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </SectionReveal>

        {/* ── WHAT WE FOUND: Loading → Content ── */}
        {isLoadingSection("painPoints") && (
          <InlineSectionLoader searchText={searchText} height={200}>
            <CompetitorsAnimation
              competitors={business.competitors}
              businessName={business.name}
              businessRating={business.rating}
              isActive={true}
            />
          </InlineSectionLoader>
        )}

        <SectionReveal visible={showPainPoints} delay={0.1}>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              What we found
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Based on reviews and public data, here are some areas AllGravy can help with.
            </p>

            <div className="space-y-3">
              <AnimatePresence>
                {painPoints.map((point, i) => (
                  <motion.div
                    key={`pain-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0 }}
                    transition={{ delay: 0.3 + i * 0.2, duration: 0.4 }}
                    className="flex items-start gap-3 py-3 px-4 rounded-xl bg-gray-50/80 border border-gray-100 group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700 leading-relaxed flex-1">
                      <EditableField>{point}</EditableField>
                    </span>
                    <button
                      onClick={() => removePainPoint(i)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-md flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={addPainPoint}
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-colors w-full text-sm text-gray-400 hover:text-gray-500"
              >
                <Plus className="w-4 h-4" />
                Add item
              </motion.button>
            </div>
          </div>
        </SectionReveal>

        {/* ── CTA: Get your branded experience ── */}
        <SectionReveal visible={allDone} delay={0.5}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
            className="text-center py-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 1,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-5"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Your profile is ready
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Review the details above, make any edits, then get your branded
              AllGravy experience.
            </p>
            <Button size="lg" className="gap-2.5 font-semibold text-base px-8">
              Get your branded experience
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </SectionReveal>

        {/* ── Empty state ── */}
        {!showHeader && !isLoadingSection("header") && (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-7 h-7 border-2 border-muted border-t-primary rounded-full mb-4"
            />
            <p className="text-sm text-muted-foreground">
              Building your business profile...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
