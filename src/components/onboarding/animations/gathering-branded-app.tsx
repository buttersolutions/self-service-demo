'use client';

import { useRef, useState, useCallback } from 'react';
import { GetStartedDialog } from '../get-started-dialog';
import { motion } from 'framer-motion';
import {
  Home, TrendingUp, FileText, GraduationCap, CalendarDays,
  Users, Puzzle, MessageCircle, Bell, Settings,
  Heart, Eye, CornerDownLeft, SmilePlus, MoreVertical, Plus, MapPin, CalendarPlus,
  Check, Palmtree, Briefcase, Mail,
} from 'lucide-react';
import { OnboardingButton, OnboardingInput } from '../ui';
import { useOnboarding } from '@/lib/demo-flow-context';
import { resolveLogo } from '@/lib/safe-logo';
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import type { LocationItem } from '../types';
import type { PlacePhoto } from '@/lib/types';

interface GatheringBrandedAppProps {
  businessName: string;
  logoUrl: string | null;
  favicon: string | null;
  locations: LocationItem[];
  photos: PlacePhoto[];
  isActive: boolean;
}

const PEOPLE = [
  { name: 'Sarah Mitchell', bgColor: '#C4F0D5', textColor: '#1B7A3D' },
  { name: 'James Chen', bgColor: '#D8DAF9', textColor: '#3F3ABF' },
  { name: 'Emma Rodriguez', bgColor: '#F2C4E0', textColor: '#9B2D6B' },
  { name: 'Alex Thompson', bgColor: '#BEF5EF', textColor: '#1A7A6D' },
];

function InitialsAvatar({ person, size, className, style }: {
  person: typeof PEOPLE[number];
  size: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const initial = person.name.charAt(0).toUpperCase();
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2.6,
        backgroundColor: person.bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: '0.5px solid rgba(0,0,0,0.1)',
        ...style,
      }}
    >
      <span style={{ fontSize: size * 0.42, fontWeight: 600, lineHeight: 1, color: person.textColor }}>{initial}</span>
    </div>
  );
}

const FEED_CHANNELS = [
  { name: 'General', emoji: '💬' },
  { name: 'Announcements', emoji: '📢' },
  { name: 'Team Shoutouts', emoji: '🏆' },
  { name: 'Office Life', emoji: '🏢' },
  { name: 'New Starters', emoji: '👋' },
  { name: 'Ideas & Feedback', emoji: '💡' },
  { name: 'Social', emoji: '🎉' },
  { name: 'Events', emoji: '📅' },
  { name: 'Random', emoji: '🎲' },
];

const NAV_ITEMS: { label: string; icon: typeof Home }[] = [
  { label: 'Home', icon: Home },
  { label: 'Insights', icon: TrendingUp },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Grow', icon: GraduationCap },
  { label: 'Directory', icon: Users },
  { label: 'Agents', icon: Puzzle },
];

// ── Full-size feed replica (1200×750, scaled down via CSS transform) ──

const stagger = (base: number, i: number) => ({ delay: base + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] });
const fadeUp = { initial: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

function FeedReplica({
  businessName,
  logoUrl,
  logoIsSquare,
  primaryColor,
  photos,
  animate,
}: {
  businessName: string;
  logoUrl: string | null;
  /** When true, logoUrl is a logo.dev square asset — render in a fixed square frame. */
  logoIsSquare: boolean;
  primaryColor: string;
  photos: PlacePhoto[];
  animate: boolean;
}) {
  const photo1 = photos[0] ? `/api/places/photo?name=${encodeURIComponent(photos[0].name)}&maxWidthPx=600` : undefined;
  const photo2 = photos[3] ? `/api/places/photo?name=${encodeURIComponent(photos[3].name)}&maxWidthPx=600` : undefined;
  const heroPhoto = photos[1] ? `/api/places/photo?name=${encodeURIComponent(photos[1].name)}&maxWidthPx=1200` : undefined;

  return (
    <div className="w-[1200px] h-[750px] bg-white flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Top nav bar ─────────────────────────────────────────── */}
      <motion.nav
        className="h-[72px] w-full flex items-center justify-between px-6 shrink-0 bg-white"
        initial={fadeUp.initial}
        animate={animate ? fadeUp.visible : fadeUp.initial}
        transition={stagger(0.3, 0)}
      >
        {/* Logo. logo.dev fallback renders as a fixed square; the native
            Firecrawl logo renders wordmark-style with a height cap. */}
        <div className="flex items-center w-[200px]">
          {logoUrl ? (
            logoIsSquare ? (
              <div className="size-12 rounded-md bg-white border border-gray-200/80 overflow-hidden">
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <img src={logoUrl} alt="" className="h-10 w-auto max-w-[180px] object-contain" />
            )
          ) : (
            <div
              className="size-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {businessName.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
        </div>

        {/* Nav tabs */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === 0;
            return (
              <div
                key={item.label}
                className="flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded-xl"
                style={isActive ? { backgroundColor: '#f9fafb' } : {}}
              >
                <Icon
                  className="size-5"
                  style={{ color: isActive ? primaryColor : '#4b5563' }}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? primaryColor : '#4b5563' }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-2 w-[200px] justify-end">
          <div className="relative size-8 rounded-full bg-[#f0f0f0] flex items-center justify-center">
            <MessageCircle className="size-[16px] text-[#4b5563]" strokeWidth={2.5} />
            <div className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500">
              <span className="text-[9px] font-medium text-white">2</span>
            </div>
          </div>
          <div className="relative size-8 rounded-full bg-[#f0f0f0] flex items-center justify-center">
            <Bell className="size-[16px] text-[#4b5563]" strokeWidth={2.5} />
            <div className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500">
              <span className="text-[9px] font-medium text-white">2</span>
            </div>
          </div>
          <div className="size-8 rounded-full bg-[#f0f0f0] flex items-center justify-center">
            <Settings className="size-[16px] text-[#4b5563]" strokeWidth={2.5} />
          </div>
          <InitialsAvatar person={PEOPLE[0]} size={36} style={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
        </div>
      </motion.nav>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden px-6">
        {/* Hero image (commented out)
        {heroPhoto && (
          <div className="w-full h-48 rounded-xl overflow-hidden mt-1 mb-0">
            <img src={heroPhoto} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        */}

        <div className="flex gap-6 pb-6">
          {/* ── Left sidebar: Feeds ────────────────────────────── */}
          <motion.div
            className="w-48 shrink-0"
            initial={fadeUp.initial}
            animate={animate ? fadeUp.visible : fadeUp.initial}
            transition={stagger(0.3, 1)}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900">Feeds</span>
              <Plus className="size-4 text-gray-400" />
            </div>

            {/* For you — selected */}
            <div
              className="flex h-8 items-center gap-2 rounded-md px-3 py-1 text-sm font-medium shadow-sm mb-0.5 bg-white"
              style={{ color: primaryColor }}
            >
              <Heart className="size-4 mx-0.5" fill={primaryColor} style={{ color: primaryColor }} />
              For you
            </div>

            {/* Feed channels */}
            {FEED_CHANNELS.map((feed) => (
              <div key={feed.name} className="flex h-8 items-center gap-2 rounded-md px-3 py-1 text-sm text-gray-500 hover:bg-white/50">
                <span className="text-sm leading-none">{feed.emoji}</span>
                <span>{feed.name}</span>
              </div>
            ))}
          </motion.div>

          {/* ── Center: Feed ───────────────────────────────────── */}
          <div className="flex-1 max-w-2xl mx-auto space-y-3">
            {/* Posts header */}
            <motion.div
              className="flex items-center"
              initial={fadeUp.initial}
              animate={animate ? fadeUp.visible : fadeUp.initial}
              transition={stagger(0.3, 2)}
            >
              <span className="text-sm font-semibold text-gray-900">Posts</span>
            </motion.div>

            {/* Composer card */}
            <motion.div
              className="bg-white rounded-xl p-4 pb-2"
              initial={fadeUp.initial}
              animate={animate ? fadeUp.visible : fadeUp.initial}
              transition={stagger(0.3, 3)} style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start gap-3">
                <InitialsAvatar person={PEOPLE[0]} size={36} style={{ borderRadius: 12 }} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{PEOPLE[0].name}</div>
                  <div className="text-xs text-gray-400 mb-2">General</div>
                  <div className="text-sm text-gray-400 h-5">Write something here...</div>
                </div>
              </div>
            </motion.div>

            {/* Post 1: with image */}
            <motion.div className="bg-white rounded-xl p-4" initial={fadeUp.initial} animate={animate ? fadeUp.visible : fadeUp.initial} transition={stagger(0.3, 4)} style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start gap-3 mb-3">
                <InitialsAvatar person={PEOPLE[1]} size={36} style={{ borderRadius: 12 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{PEOPLE[1].name}</div>
                  <div className="text-xs text-gray-400">
                    11:28 in <span className="text-gray-400">Announcements</span>
                  </div>
                </div>
                <MoreVertical className="size-4 text-gray-300 shrink-0" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-3">
                Welcome to the {businessName} team! We&apos;re excited to have everyone on board. 🎉
              </p>
              {photo1 && (
                <div className="relative h-64 w-full overflow-hidden rounded-lg mb-1">
                  <img src={photo1} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              {/* Reactions bar */}
              <div className="py-3"><div className="w-full h-px bg-gray-100" /></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button className="flex items-center border border-gray-200 bg-gray-50 p-[7px] rounded-full">
                    <SmilePlus className="size-[15px] text-gray-900" />
                  </button>
                  <button className="flex items-center border border-blue-500/30 bg-blue-500/10 px-2 py-[6px] rounded-full">
                    <span className="text-xs">👍 4</span>
                  </button>
                  <button className="flex items-center border border-gray-200 bg-gray-50 px-2 py-[6px] rounded-full">
                    <span className="text-xs">🎉 2</span>
                  </button>
                  <button className="flex items-center border border-gray-200 bg-gray-50 px-2 py-[6px] rounded-full">
                    <span className="text-xs">❤️ 1</span>
                  </button>
                  <div className="flex items-center -space-x-1.5 ml-1">
                    <InitialsAvatar person={PEOPLE[2]} size={20} style={{ borderRadius: '50%', border: '2px solid white' }} />
                    <InitialsAvatar person={PEOPLE[3]} size={20} style={{ borderRadius: '50%', border: '2px solid white' }} />
                  </div>
                  <button className="px-3 py-[6px] rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-900">
                    5 comments
                  </button>
                  <button className="flex items-center gap-1 px-1 py-[6px] rounded-full text-xs text-gray-400">
                    <Eye className="size-[18px]" />
                    12
                  </button>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-[6px] rounded-full border border-gray-200 text-xs font-medium text-gray-700">
                  <CornerDownLeft className="size-4" />
                  Reply
                </button>
              </div>
            </motion.div>

            {/* Post 2: text only */}
            <motion.div className="bg-white rounded-xl p-4" initial={fadeUp.initial} animate={animate ? fadeUp.visible : fadeUp.initial} transition={stagger(0.3, 5)} style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start gap-3 mb-3">
                <InitialsAvatar person={PEOPLE[2]} size={36} style={{ borderRadius: 12 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{PEOPLE[2].name}</div>
                  <div className="text-xs text-gray-400">
                    09:15 in <span className="text-gray-400">Office Life</span>
                  </div>
                </div>
                <MoreVertical className="size-4 text-gray-300 shrink-0" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                Quick snap from yesterday&apos;s team lunch! Great to see everyone together 🍕
              </p>
              {/* Reactions bar */}
              <div className="py-3"><div className="w-full h-px bg-gray-100" /></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button className="flex items-center border border-gray-200 bg-gray-50 p-[7px] rounded-full">
                    <SmilePlus className="size-[15px] text-gray-900" />
                  </button>
                  <button className="px-3 py-[6px] rounded-full border border-gray-200 bg-gray-50 text-xs font-medium text-gray-900">
                    0 comments
                  </button>
                  <button className="flex items-center gap-1 px-1 py-[6px] rounded-full text-xs text-gray-400">
                    <Eye className="size-[18px]" />
                    5
                  </button>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-[6px] rounded-full border border-gray-200 text-xs font-medium text-gray-700">
                  <CornerDownLeft className="size-4" />
                  Reply
                </button>
              </div>
            </motion.div>
          </div>

          {/* ── Right sidebar ──────────────────────────────────── */}
          <motion.div
            className="w-52 shrink-0 space-y-6"
            initial={fadeUp.initial}
            animate={animate ? fadeUp.visible : fadeUp.initial}
            transition={stagger(0.3, 6)}
          >
            {/* Todo's */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Todo&apos;s</h2>
                <span className="text-xs text-gray-400 font-medium">View all</span>
              </div>
              <div className="space-y-2.5">
                {/* Time off request */}
                <div className="p-3 bg-white rounded-xl" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Palmtree className="size-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <InitialsAvatar person={PEOPLE[2]} size={16} style={{ borderRadius: '50%' }} />
                        <span className="text-sm font-semibold text-gray-900 truncate">{PEOPLE[2].name}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">🌴 Vacation · 5 days</p>
                    </div>
                  </div>
                </div>
                {/* Shift coverage */}
                <div className="p-3 bg-white rounded-xl" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
                  <div className="flex items-start gap-2.5">
                    <div className="size-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="size-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-900">Approve shift swap</span>
                      <p className="text-xs text-gray-400 mt-0.5">Fri evening · Floor staff</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Events</h2>
                <span className="text-xs text-gray-400 font-medium">View all</span>
              </div>
              <div className="space-y-2.5">
                <div className="p-3 bg-white rounded-xl" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
                  <p className="text-xs text-gray-400 mb-0.5">Today · 2:00 PM</p>
                  <h3 className="text-sm font-semibold text-gray-900">Pre-service briefing</h3>
                </div>
                <div className="p-3 bg-white rounded-xl" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
                  <p className="text-xs text-gray-400 mb-0.5">Tomorrow · 10:00 AM</p>
                  <h3 className="text-sm font-semibold text-gray-900">Health & Safety audit</h3>
                </div>
                <div className="p-3 bg-white rounded-xl" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
                  <p className="text-xs text-gray-400 mb-0.5">Fri · 6:00 PM</p>
                  <h3 className="text-sm font-semibold text-gray-900">Wine tasting evening</h3>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Device mockups ──────────────────────────────────────────────────

function LaptopMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Screen lid */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 810,
          height: 510,
          background: 'linear-gradient(180deg, #2c2c2c 0%, #1a1a1a 4%, #1a1a1a 100%)',
          padding: '20px 16px 16px',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -1px 0 0 rgba(255,255,255,0.05) inset, 0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Webcam */}
        <div className="absolute top-[7px] left-1/2 -translate-x-1/2 flex items-center justify-center">
          <div className="size-[6px] rounded-full bg-[#2a2a2a] ring-1 ring-[#333]" />
          <div className="absolute size-[2px] rounded-full bg-[#1a3a1a] opacity-60" />
        </div>
        {/* Screen bezel */}
        <div className="w-full h-full rounded-[4px] overflow-hidden bg-black">
          {children}
        </div>
        {/* Subtle screen reflection */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[16px]"
          style={{
            background: 'linear-gradient(115deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.01) 100%)',
          }}
        />
      </div>
      {/* Hinge */}
      <div
        style={{
          width: 810,
          height: 8,
          background: 'linear-gradient(180deg, #0f0f0f 0%, #2a2a2a 40%, #1f1f1f 100%)',
          borderRadius: '0 0 2px 2px',
          boxShadow: '0 1px 0 0 rgba(255,255,255,0.04) inset',
        }}
      />
      {/* Base / keyboard deck */}
      <div
        style={{
          width: 870,
          height: 14,
          background: 'linear-gradient(180deg, #2e2e2e 0%, #1c1c1c 100%)',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12), 0 1px 0 0 rgba(255,255,255,0.04) inset',
        }}
      />
      {/* Front lip notch */}
      <div className="mx-auto" style={{ width: 120, height: 4, background: 'linear-gradient(180deg, #333 0%, #222 100%)', borderRadius: '0 0 4px 4px', marginTop: -1 }} />
    </div>
  );
}

// ── Mobile feed replica (390×844, scaled to fit phone) ──────────────

const FEED_THUMBS = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=200&h=200&fit=crop',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&h=200&fit=crop',
];

function MobileFeedReplica({
  businessName,
  logoUrl,
  logoIsSquare,
  primaryColor,
  headerColor,
  photos,
  animate,
}: {
  businessName: string;
  logoUrl: string | null;
  /** When true, logoUrl is a logo.dev square asset — render in a fixed square frame. */
  logoIsSquare: boolean;
  primaryColor: string;
  headerColor: string;
  photos: PlacePhoto[];
  animate: boolean;
}) {
  const storyPhoto1 = photos[2] ? `/api/places/photo?name=${encodeURIComponent(photos[2].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop';
  const storyPhoto2 = photos[4] ? `/api/places/photo?name=${encodeURIComponent(photos[4].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop';
  const storyPhoto3 = photos[5] ? `/api/places/photo?name=${encodeURIComponent(photos[5].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop';
  const postPhoto = photos[0] ? `/api/places/photo?name=${encodeURIComponent(photos[0].name)}&maxWidthPx=600` : undefined;

  return (
    <div className="relative w-[390px] h-[870px] bg-white flex flex-col overflow-hidden" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Status bar + Header (single block, no gap) ─────── */}
      <motion.div
        className="shrink-0 px-5 pb-5"
        initial={fadeUp.initial}
        animate={animate ? fadeUp.visible : fadeUp.initial}
        transition={stagger(0.4, 0)}
        style={{
          backgroundColor: headerColor,
          borderRadius: '0 0 24px 24px',
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-1 pt-3 pb-3">
          <span className="text-[15px] font-semibold text-white">9:41</span>
          <div className="flex items-center gap-1.5">
            <svg width="17" height="12" viewBox="0 0 17 12" fill="none"><rect x="0" y="9" width="3" height="3" rx="0.5" fill="white"/><rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="white"/><rect x="9" y="3" width="3" height="9" rx="0.5" fill="white"/><rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="white"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 11.5a1 1 0 100-2 1 1 0 000 2z" fill="white"/><path d="M4.93 7.76a4.5 4.5 0 016.14 0" stroke="white" strokeWidth="1.2" strokeLinecap="round"/><path d="M2.1 4.93a8 8 0 0111.8 0" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
            <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="2" stroke="white" strokeOpacity="0.5"/><rect x="2" y="2" width="18" height="9" rx="1" fill="white"/><path d="M24 4.5v4a1.5 1.5 0 000-4z" fill="white" fillOpacity="0.5"/></svg>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {logoUrl ? (
            logoIsSquare ? (
              <div className="size-13 rounded-md bg-white overflow-hidden shrink-0">
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <img src={logoUrl} alt="" className="h-12 w-auto max-w-[200px] object-contain" />
            )
          ) : (
            <span className="text-[26px] font-black text-white">{businessName}</span>
          )}
          <div className="flex items-center">
            <div className="size-10 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 -4 28 28" fill="none"><path d="M19.75 13.1C19.37 14.71 18.54 16.19 17.37 17.36C16.19 18.54 14.72 19.36 13.1 19.75C11.49 20.14 9.8 20.07 8.22 19.56C6.64 19.05 5.24 18.11 4.16 16.85C3.08 15.58 2.37 14.05 2.11 12.41C1.85 10.77 2.05 9.09 2.68 7.56C3.32 6.02 4.37 4.7 5.71 3.72C7.05 2.74 8.64 2.16 10.29 2.03" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/><path d="M11 7.85L13.7 10.55L20 4.25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
            </div>
            <div className="size-10 flex items-center justify-center">
              <CalendarDays className="size-[22px] text-white" strokeWidth={2} />
            </div>
            <div className="size-10 flex items-center justify-center">
              <svg width="22" height="20" viewBox="0 0 26 23" fill="none"><path d="M7.85 9.63C11.32 6.41 13.24 6.34 16.89 9.63" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/><circle cx="12.37" cy="3.94" r="2.24" stroke="white" strokeWidth="2" fill="none"/><path d="M1.07 21.58C4.54 18.36 6.46 18.29 10.11 21.58" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/><circle cx="5.59" cy="15.89" r="2.24" stroke="white" strokeWidth="2" fill="none"/><path d="M15.03 21.58C18.5 18.36 20.42 18.29 24.07 21.58" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/><circle cx="19.55" cy="15.89" r="2.24" stroke="white" strokeWidth="2" fill="none"/></svg>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Feed selector ─────────────────────────────────────── */}
      <motion.div className="shrink-0 px-3 pt-4 pb-2 flex gap-3.5 overflow-hidden items-start" initial={fadeUp.initial} animate={animate ? fadeUp.visible : fadeUp.initial} transition={stagger(0.4, 1)}>
        {/* For you — circle with red border (selected) */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="relative">
            <div className="size-[72px] rounded-full overflow-hidden border-[3px] border-[#FA614C] p-[2px]">
              <InitialsAvatar person={PEOPLE[0]} size={66} style={{ borderRadius: '50%', width: '100%', height: '100%' }} />
            </div>
            <div className="absolute -top-1 -right-1 size-[20px] rounded-full bg-[#FA614C] flex items-center justify-center border-2 border-white">
              <span className="text-[9px] font-bold text-white">2</span>
            </div>
          </div>
          <span className="text-[11px] text-black text-center font-bold">For you</span>
        </div>

        {/* Feed circles */}
        {[
          { name: 'General', img: photos[6] ? `/api/places/photo?name=${encodeURIComponent(photos[6].name)}&maxWidthPx=200` : FEED_THUMBS[0], badge: 1 },
          { name: 'Customer\nlove', img: photos[7] ? `/api/places/photo?name=${encodeURIComponent(photos[7].name)}&maxWidthPx=200` : FEED_THUMBS[1] },
          { name: 'Product\nReleases', img: photos[8] ? `/api/places/photo?name=${encodeURIComponent(photos[8].name)}&maxWidthPx=200` : FEED_THUMBS[2] },
        ].map((feed) => (
          <div key={feed.name} className="shrink-0 flex flex-col items-center gap-1">
            <div className="relative">
              <div className="size-[72px] rounded-full overflow-hidden" style={{ border: '1px solid rgba(192,192,192,0.5)' }}>
                <img src={feed.img} alt="" className="w-full h-full object-cover" />
              </div>
              {feed.badge && (
                <div className="absolute -top-1 -right-1 size-[20px] rounded-full bg-[#FA614C] flex items-center justify-center border-2 border-white">
                  <span className="text-[9px] font-bold text-white">{feed.badge}</span>
                </div>
              )}
            </div>
            <span className="text-[11px] mt-1 text-black text-center leading-tight max-w-[75px] whitespace-pre-line">{feed.name}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Broadcasts (horizontal scroll, 160×200 cards) ─────── */}
      <motion.div className="shrink-0 pl-3 pb-4 pt-1 flex gap-3 overflow-hidden" initial={fadeUp.initial} animate={animate ? fadeUp.visible : fadeUp.initial} transition={stagger(0.4, 2)}>
        <div className="w-[148px] h-[200px] rounded-xl overflow-hidden relative shrink-0">
          <img src={storyPhoto1} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <p className="absolute bottom-4 left-4 text-white text-[15px] font-bold leading-tight">Summer Party</p>
        </div>
        <div className="w-[148px] h-[200px] rounded-xl overflow-hidden relative shrink-0">
          <img src={storyPhoto2} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <p className="absolute bottom-4 left-4 text-white text-[15px] font-bold leading-tight">Cocktails 101</p>
        </div>
        <div className="w-[148px] h-[200px] rounded-xl overflow-hidden relative shrink-0">
          <img src={storyPhoto3} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <p className="absolute bottom-4 left-4 text-white text-[15px] font-bold leading-tight">Team Lunch</p>
        </div>
      </motion.div>

      {/* ── Feed post (with photo) ────────────────────────────── */}
      <motion.div className="flex-1 min-h-0 overflow-hidden border-t border-gray-100" initial={fadeUp.initial} animate={animate ? fadeUp.visible : fadeUp.initial} transition={stagger(0.4, 3)}>
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-start gap-3 mb-2">
            <InitialsAvatar person={PEOPLE[1]} size={44} style={{ borderRadius: 12 }} />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-[#1A2027]">{PEOPLE[1].name}</div>
              <div className="text-[12px] text-[#7E7E7E]">09:03 in Announcements</div>
            </div>
            <MoreVertical className="size-5 text-[#C0C0C0] shrink-0 mt-1" />
          </div>
          <p className="text-[14px] text-[#1A2027] leading-relaxed mb-3">
            Welcome to the {businessName} team! We&apos;re excited to have everyone on board 🎉🚀
          </p>
          {postPhoto && (
            <div className="w-full h-44 rounded-xl overflow-hidden">
              <img src={postPhoto} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── FAB (60×60) ───────────────────────────────────────── */}
      <div
        className="absolute right-6 bottom-[96px] size-[60px] rounded-full flex items-center justify-center shadow-md"
        style={{ backgroundColor: headerColor }}
      >
        <Plus className="size-9 text-white" strokeWidth={2.5} />
      </div>

      {/* ── Bottom tab bar (83px, real SVG icons) ─────────────── */}
      <div className="shrink-0 flex items-center justify-around bg-white px-2 pt-3 pb-0" style={{ height: 56, borderTop: '1px solid #e5e7eb' }}>
        {[
          { label: 'Feed', icon: '/icons/comms-active.svg', active: true },
          { label: 'Chat', icon: '/icons/chat-inactive.svg', badge: 1 },
          { label: 'Schedule', icon: '/icons/schedule-inactive.svg' },
          { label: 'Hub', icon: '/icons/hub-inactive.svg' },
          { label: 'You', icon: '/icons/settings-inactive.svg', badge: 6 },
        ].map((tab) => (
          <div key={tab.label} className="flex flex-col items-center gap-0.5 relative w-14">
            <div className="relative">
              <img src={tab.icon} alt="" className="size-6" />
              {tab.badge && (
                <div className="absolute -top-1 -right-2 size-[18px] rounded-full bg-[#FA614C] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">{tab.badge}</span>
                </div>
              )}
            </div>
            <span className={`text-[10px] font-medium ${tab.active ? 'text-black' : 'text-[#7E7E7E]'}`}>
              {tab.label}
            </span>
          </div>
        ))}
      </div>

      {/* Safe area bottom spacer */}
      <div className="shrink-0 h-10 bg-white" />
    </div>
  );
}

function PhoneMockup({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Side buttons — left: silent switch + volume */}
      <div className="absolute -left-[2px] top-[80px] w-[3px] h-[8px] rounded-l-sm" style={{ background: 'linear-gradient(90deg, #333 0%, #1a1a1a 100%)' }} />
      <div className="absolute -left-[2px] top-[110px] w-[3px] h-[24px] rounded-l-sm" style={{ background: 'linear-gradient(90deg, #333 0%, #1a1a1a 100%)' }} />
      <div className="absolute -left-[2px] top-[142px] w-[3px] h-[24px] rounded-l-sm" style={{ background: 'linear-gradient(90deg, #333 0%, #1a1a1a 100%)' }} />
      {/* Side button — right: power */}
      <div className="absolute -right-[2px] top-[120px] w-[3px] h-[32px] rounded-r-sm" style={{ background: 'linear-gradient(270deg, #333 0%, #1a1a1a 100%)' }} />

      {/* Phone frame */}
      <div
        className="relative overflow-hidden"
        style={{
          width: 264, height: 570,
          borderRadius: 36,
          border: '9px solid #1a1a1a',
          backgroundColor: '#1a1a1a',
          boxShadow: '0 25px 70px rgba(0,0,0,0.25), 0 10px 25px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* Dynamic Island */}
        <div
          className="absolute top-[10px] left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
          style={{
            width: 72, height: 20,
            borderRadius: 20,
            backgroundColor: '#000',
          }}
        >
          <div className="absolute right-[8px] size-[6px] rounded-full bg-[#0a0a0a] ring-1 ring-[#1a1a1a]" />
        </div>
        {/* Screen content */}
        <div className="w-full h-full overflow-hidden rounded-[27px]">
          {children ?? (
            <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #fafafa 0%, #f0f0f2 100%)' }} />
          )}
        </div>
        {/* Screen reflection */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[27px]"
          style={{
            background: 'linear-gradient(125deg, rgba(255,255,255,0.06) 0%, transparent 35%, transparent 65%, rgba(255,255,255,0.02) 100%)',
          }}
        />
        {/* Home indicator */}
        <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 rounded-full z-20" style={{ width: 80, height: 4, backgroundColor: 'rgba(0,0,0,0.2)' }} />
      </div>
    </div>
  );
}

// ── Checklist items ──────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  'Chat groups for each location',
  'Feeds to post important updates',
  'Todo lists to streamline operations',
  'Courses that teach what\'s lacking',
];

// ── Main component ──────────────────────────────────────────────────

export function GatheringBrandedApp({
  businessName,
  logoUrl,
  favicon,
  locations,
  photos,
  isActive,
}: GatheringBrandedAppProps) {
  const { brandColorMap, state } = useOnboarding();
  const primaryColor = brandColorMap.primaryColor;
  const darkestBrandColor = primaryColor;
  // Logo resolution: src + whether to wrap in a colored pill (for near-white
  // logos) with wrapColor being the CTA button color (strongest brand signal).
  const logo = resolveLogo(state.business);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const LAPTOP_SCALE = 780 / 1200;
  const PHONE_SCALE = 250 / 390;

  const MOCKUP_W = 900;
  const MOCKUP_H = 540;
  const [mockupScale, setMockupScale] = useState(0.85);
  const roRef = useRef<ResizeObserver | null>(null);

  // Track the full outer container size for fullscreen scaling
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [outerSize, setOuterSize] = useState({ width: 0, height: 0 });
  const outerRoRef = useRef<ResizeObserver | null>(null);

  const outerMeasuredRef = useCallback((node: HTMLDivElement | null) => {
    if (outerRoRef.current) {
      outerRoRef.current.disconnect();
      outerRoRef.current = null;
    }
    outerRef.current = node;
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      setOuterSize({ width, height });
    });
    ro.observe(node);
    outerRoRef.current = ro;
  }, []);

  const mockupAreaRef = useCallback((node: HTMLDivElement | null) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      const s = Math.min(width / MOCKUP_W, height / MOCKUP_H) * 0.85;
      setMockupScale(Math.max(0.4, s));
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);

  const handleGetStarted = () => {
    setExpanded(true);
    setTimeout(() => setDialogOpen(true), 50);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setExpanded(false);
  };

  const FEED_W = 1200;
  const FEED_H = 750;
  const fullscreenScale = outerSize.width > 0
    ? Math.max(outerSize.width / FEED_W, outerSize.height / FEED_H)
    : 1;

  return (
    <div className="w-full h-full relative overflow-hidden" ref={outerMeasuredRef}>
      {/* ── Default view: sidebar + mockups ── */}
      <motion.div
        className="absolute inset-0"
        animate={expanded ? { opacity: 0, pointerEvents: 'none' as const } : { opacity: 1, pointerEvents: 'auto' as const }}
        transition={{ duration: 0.1 }}
      >
        <div className="w-full h-full p-2 sm:p-4 bg-[#625CE4]">
          <motion.div
            className="w-full h-full flex flex-col md:flex-row rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : {}}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {/* Left sidebar — hidden on mobile */}
            <motion.div
              className="hidden md:flex w-80 shrink-0 flex-col border-r border-gray-200/80 bg-gray-50 font-sans"
              initial={{ opacity: 0, x: -40 }}
              animate={isActive ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex-1 px-3.5 py-5">
                {/* Logo */}
                <div className="px-2.5 mb-5">
                  <AllgravyLogo className="w-24 text-gray-900" />
                </div>

                {/* Checklist */}
                <motion.p
                  className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-2.5 mb-3"
                  initial={{ opacity: 0 }}
                  animate={isActive ? { opacity: 1 } : {}}
                  transition={{ delay: 0.5 }}
                >
                  What&apos;s included
                </motion.p>

                <div className="space-y-3">
                  {CHECKLIST_ITEMS.map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-2.5 px-2.5"
                      initial={{ opacity: 0, x: -16 }}
                      animate={isActive ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 1.0 + i * 0.1, duration: 0.35 }}
                    >
                      <div className="shrink-0 mt-px">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={isActive ? { scale: 1 } : {}}
                          transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 1.0 + i * 0.1 }}
                          className="size-4 bg-[#625CE4] rounded-full flex items-center justify-center"
                        >
                          <Check className="size-2.5 text-white" strokeWidth={3} />
                        </motion.div>
                      </div>
                      <span className="text-[13px] font-medium text-gray-900">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right side — mockups with overlay button */}
            <div ref={mockupAreaRef} className="flex-1 relative min-w-0 flex flex-col items-center px-4 sm:px-6 pt-6 sm:pt-12">
              <motion.h3
                className="text-lg sm:text-2xl md:text-3xl font-semibold text-gray-900 font-serif mb-6 sm:mb-12 shrink-0 text-center px-2"
                initial={{ opacity: 0, y: 16 }}
                animate={isActive ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Here's how your team stays ahead of what guests are saying
              </motion.h3>

              {/* Mobile checklist — visible only on mobile */}
              <div className="md:hidden w-full max-w-xs mb-6 space-y-2">
                {CHECKLIST_ITEMS.map((item, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-2.5"
                    initial={{ opacity: 0, x: -16 }}
                    animate={isActive ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.35 }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={isActive ? { scale: 1 } : {}}
                      transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.5 + i * 0.1 }}
                      className="size-4 bg-[#625CE4] rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    >
                      <Check className="size-2.5 text-white" strokeWidth={3} />
                    </motion.div>
                    <span className="text-xs font-medium text-gray-900">{item}</span>
                  </motion.div>
                ))}
              </div>
              <div className="hidden md:block" style={{ width: MOCKUP_W * mockupScale, height: MOCKUP_H * mockupScale }}>
                <div
                  className="relative"
                  style={{
                    width: MOCKUP_W,
                    height: MOCKUP_H,
                    transform: `scale(${mockupScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {/* App icon */}
                  <motion.div
                    className="absolute z-10"
                    style={{ left: 0, bottom: 80 }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={isActive ? { opacity: 1, scale: 1, rotate: -6 } : {}}
                    transition={{ delay: 0.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div
                      className="flex items-center justify-center overflow-hidden"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 14,
                        backgroundColor: logo.isSquareFallback ? '#ffffff' : primaryColor,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      {logo.src ? (
                        <img
                          src={logo.src}
                          alt=""
                          className={`w-full h-full object-contain ${logo.isSquareFallback ? '' : 'p-1'}`}
                        />
                      ) : (
                        <span className="text-white text-2xl font-bold">{businessName.charAt(0)}</span>
                      )}
                    </div>
                  </motion.div>

                  {/* Laptop */}
                  <motion.div
                    className="absolute bottom-0 left-0"
                    initial={{ opacity: 0, y: 30, rotate: 0 }}
                    animate={isActive ? { opacity: 1, y: 0, rotate: 0 } : { rotate: 0 }}
                    transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <LaptopMockup>
                      <div style={{ width: 1200, height: 750, transform: `scale(${LAPTOP_SCALE})`, transformOrigin: 'top left' }}>
                        <FeedReplica businessName={businessName} logoUrl={logo.src} logoIsSquare={logo.isSquareFallback} primaryColor={primaryColor} photos={photos} animate={isActive} />
                      </div>
                    </LaptopMockup>
                  </motion.div>

                  <motion.div
                    className="absolute z-10"
                    style={{ right: -20, bottom: -15 }}
                    initial={{ opacity: 0, y: 40, scale: 0.85, rotate: 0 }}
                    animate={isActive ? { opacity: 1, y: 0, scale: 1, rotate: 3 } : {}}
                    transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <PhoneMockup>
                      <div style={{ width: 390, height: 870, transform: `scale(${PHONE_SCALE})`, transformOrigin: 'top left' }}>
                        <MobileFeedReplica
                          businessName={businessName}
                          logoUrl={logo.src}
                          logoIsSquare={logo.isSquareFallback}
                          primaryColor={primaryColor}
                          headerColor={darkestBrandColor}
                          photos={photos}
                          animate={isActive}
                        />
                      </div>
                    </PhoneMockup>
                  </motion.div>
                </div>
              </div>

              {/* Mobile-only phone mockup — top at ~35% of screen, overflows off bottom */}
              <motion.div
                className="md:hidden absolute left-1/2 -translate-x-1/2"
                style={{ top: '35%' }}
                initial={{ opacity: 0, y: 60 }}
                animate={isActive ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                  <PhoneMockup>
                    <div style={{ width: 390, height: 870, transform: `scale(${PHONE_SCALE})`, transformOrigin: 'top left' }}>
                      <MobileFeedReplica
                        businessName={businessName}
                        logoUrl={logo.src}
                        logoIsSquare={logo.isSquareFallback}
                        primaryColor={primaryColor}
                        headerColor={darkestBrandColor}
                        photos={photos}
                        animate={isActive}
                      />
                    </div>
                  </PhoneMockup>
                </div>
              </motion.div>

              {/* Desktop gradient overlay with button */}
              <motion.div
                className="hidden md:flex absolute bottom-0 left-0 right-0 z-20 items-end justify-center pb-8"
                style={{ background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)', height: 200 }}
                initial={{ opacity: 0 }}
                animate={isActive ? { opacity: 1 } : {}}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <button
                  onClick={handleGetStarted}
                  className="h-12 px-20 rounded-xl text-sm font-medium text-white bg-gradient-to-b from-[#6e69e8] to-[#625CE4] shadow-[0_2px_8px_rgba(98,92,228,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#7a76ec] hover:to-[#6e69e8] active:translate-y-[0.5px] transition-all cursor-pointer"
                >
                  Get started
                </button>
              </motion.div>

              {/* Mobile floating button — on top of the phone mockup */}
              <motion.div
                className="md:hidden absolute bottom-8 left-0 right-0 z-20 flex justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={isActive ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.0, duration: 0.5 }}
              >
                <button
                  onClick={handleGetStarted}
                  className="h-12 px-10 rounded-xl text-sm font-medium text-white bg-gradient-to-b from-[#6e69e8] to-[#625CE4] shadow-[0_4px_16px_rgba(98,92,228,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#7a76ec] hover:to-[#6e69e8] active:translate-y-[0.5px] transition-all cursor-pointer"
                >
                  Get started
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Expanded view: fullscreen FeedReplica (desktop) or phone mockup (mobile) + dialog ── */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={expanded ? { opacity: 1 } : { opacity: 0, pointerEvents: 'none' as const }}
        transition={{ duration: 0.1 }}
      >
        {/* Desktop: fullscreen feed */}
        <div
          className="hidden md:block"
          style={{
            width: FEED_W,
            height: FEED_H,
            transform: `scale(${fullscreenScale})`,
            transformOrigin: 'top left',
          }}
        >
          <FeedReplica
            businessName={businessName}
            logoUrl={logo.src}
            logoIsSquare={logo.isSquareFallback}
            primaryColor={primaryColor}
            photos={photos}
            animate={expanded}
          />
        </div>

        {/* Mobile: phone mockup as background behind dialog */}
        <div className="md:hidden w-full h-full flex justify-center bg-[#625CE4] pt-8">
          <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}>
            <PhoneMockup>
              <div style={{ width: 390, height: 870, transform: `scale(${PHONE_SCALE})`, transformOrigin: 'top left' }}>
                <MobileFeedReplica
                  businessName={businessName}
                  logoUrl={logo.src}
                  logoIsSquare={logo.isSquareFallback}
                  primaryColor={primaryColor}
                  headerColor={darkestBrandColor}
                  photos={photos}
                  animate={expanded}
                />
              </div>
            </PhoneMockup>
          </div>
        </div>
      </motion.div>

      <GetStartedDialog open={dialogOpen} onOpenChange={handleDialogChange} />
    </div>
  );
}
