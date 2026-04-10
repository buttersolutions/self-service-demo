'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Palette, Loader2 } from 'lucide-react';
import { TypewriterSearch } from '../ui/typewriter-search';
import { ProgressBar } from '../ui/progress-bar';
import { useOnboarding } from '@/lib/demo-flow-context';

const MIN_DURATION_MS = 3000;
const SHOW_RESULT_MS = 2500;
const MAX_DURATION_MS = 15000;

interface StepWebsiteScanningProps {
  onComplete: () => void;
}

export function StepWebsiteScanning({ onComplete }: StepWebsiteScanningProps) {
  const { state } = useOnboarding();
  const { business } = state;
  const completedRef = useRef(false);
  const [minElapsed, setMinElapsed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showResultElapsed, setShowResultElapsed] = useState(false);

  const domain = business?.domain || null;
  const businessName = business?.name ?? '';
  const instagramUsername = business?.instagramUsername ?? null;
  const isInstagram = !!instagramUsername;

  const screenshot = business?.screenshot ?? null;
  const ogImage = business?.ogImage ?? null;
  const logoUrl = business?.logoUrl ?? null;

  const heroImage = isInstagram
    ? logoUrl
    : (screenshot && screenshot !== 'null' ? screenshot : null)
      || (ogImage && ogImage !== 'null' ? ogImage : null);

  const brandReady =
    business !== null &&
    business.brandColors.length > 0 &&
    !(business.brandColors.length === 1 && business.brandColors[0] === '#FFFFFF');

  const dataReady = brandReady;

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!dataReady) return;
    if (heroImage && !imageLoaded) return;
    const timer = setTimeout(() => setShowResultElapsed(true), SHOW_RESULT_MS);
    return () => clearTimeout(timer);
  }, [dataReady, heroImage, imageLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, MAX_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    if (minElapsed && showResultElapsed && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [minElapsed, showResultElapsed, onComplete]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const searchText = isInstagram
    ? `Extracting colours from @${instagramUsername}...`
    : domain
      ? `Scanning ${domain} for branding...`
      : `Scanning ${businessName} for branding...`;

  // ── Instagram mode: logo scanning animation ──
  if (isInstagram) {
    return (
      <motion.div
        className="relative w-full h-dvh flex items-center justify-center bg-gray-50/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute top-4 z-30 w-full max-w-md px-6 left-1/2 -translate-x-1/2">
          <TypewriterSearch text={searchText} />
        </div>

        <div className="flex flex-col items-center gap-8">
          {/* Phase 1: Spinner while waiting for logo */}
          {!logoUrl && (
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="size-40 rounded-3xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                <Loader2 className="size-8 text-[#625CE4] animate-spin" />
              </div>
              <span className="text-sm text-gray-500">Getting your logo...</span>
            </motion.div>
          )}

          {/* Phase 2: Logo loaded — scanning animation */}
          {logoUrl && (
            <motion.div
              className="flex flex-col items-center gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="relative">
                <motion.img
                  src={logoUrl}
                  alt={businessName}
                  className="size-40 rounded-3xl object-cover shadow-2xl border-2 border-white/80"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: imageLoaded ? 1 : 0, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  onLoad={handleImageLoad}
                />

                {/* Scan line over logo */}
                <motion.div
                  className="absolute left-0 right-0 h-[2px] z-10 pointer-events-none rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(98, 92, 228, 0.6) 30%, rgba(98, 92, 228, 0.9) 50%, rgba(98, 92, 228, 0.6) 70%, transparent 100%)',
                    boxShadow: '0 0 12px 3px rgba(98, 92, 228, 0.2)',
                  }}
                  initial={{ top: 0, opacity: 0 }}
                  animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />

                {/* Palette icon badge */}
                <motion.div
                  className="absolute -bottom-3 -right-3 size-10 rounded-xl bg-white shadow-lg border border-gray-200 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Palette className="size-5 text-[#625CE4]" />
                </motion.div>
              </div>

              {/* Extracted colors */}
              {brandReady && business && (
                <motion.div
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  {business.brandColors.slice(0, 4).map((color, i) => (
                    <motion.div
                      key={i}
                      className="size-10 rounded-full border-2 border-white ring-1 ring-black/[0.08] shadow-sm"
                      style={{ backgroundColor: color }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.15, type: 'spring', stiffness: 400, damping: 20 }}
                    />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        <div className="absolute bottom-6 z-30 w-full px-8 left-1/2 -translate-x-1/2 max-w-xl">
          <ProgressBar current={1} />
        </div>
      </motion.div>
    );
  }

  // ── Website mode: browser window animation ──
  return (
    <motion.div
      className="relative w-full h-dvh flex items-center justify-center bg-gray-50/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute top-4 z-30 w-full max-w-md px-6 left-1/2 -translate-x-1/2">
        <TypewriterSearch text={searchText} />
      </div>

      <motion.div
        className="relative w-full max-w-2xl mx-auto px-6"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border-b border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-full bg-red-400/60" />
              <div className="size-3 rounded-full bg-yellow-400/60" />
              <div className="size-3 rounded-full bg-green-400/60" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-500 max-w-xs w-full">
                <Globe className="size-3 shrink-0 text-gray-400" />
                <span className="truncate">{domain || businessName}</span>
              </div>
            </div>
          </div>

          <div className="relative aspect-[16/10] bg-gray-50 overflow-hidden">
            {heroImage ? (
              <motion.img
                src={heroImage}
                alt={businessName}
                className="w-full h-full object-cover object-top"
                initial={{ opacity: 0 }}
                animate={{ opacity: imageLoaded ? 1 : 0 }}
                transition={{ duration: 0.6 }}
                onLoad={handleImageLoad}
              />
            ) : null}

            {(!heroImage || !imageLoaded) && (
              <div className="absolute inset-0 flex flex-col gap-4 p-8">
                <motion.div
                  className="h-8 w-48 rounded-lg bg-gray-200"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="h-4 w-72 rounded bg-gray-200"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                />
                <motion.div
                  className="h-4 w-56 rounded bg-gray-200"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="flex-1 rounded-lg bg-gray-200 mt-4"
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                />
              </div>
            )}

            <motion.div
              className="absolute left-0 right-0 h-[2px] z-20 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(98, 92, 228, 0.5) 30%, rgba(98, 92, 228, 0.8) 50%, rgba(98, 92, 228, 0.5) 70%, transparent 100%)',
                boxShadow: '0 0 20px 4px rgba(98, 92, 228, 0.15)',
              }}
              initial={{ top: 0, opacity: 0 }}
              animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </div>

        {brandReady && business && (
          <motion.div
            className="mt-6 flex items-center justify-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {business.logoUrl && (
              <img
                src={business.logoUrl}
                alt={businessName}
                className="size-10 rounded-lg border border-gray-200 object-cover"
              />
            )}
            <div className="flex items-center gap-2">
              {business.brandColors.slice(0, 4).map((color, i) => (
                <motion.div
                  key={i}
                  className="size-8 rounded-full border-2 border-white ring-1 ring-black/[0.08]"
                  style={{ backgroundColor: color }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1, type: 'spring', stiffness: 400, damping: 20 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      <div className="absolute bottom-6 z-30 w-full px-8 left-1/2 -translate-x-1/2 max-w-xl">
        <ProgressBar current={1} />
      </div>
    </motion.div>
  );
}
