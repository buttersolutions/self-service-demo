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
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import type { FeedPost, LocationItem } from '../types';
import type { PlacePhoto, ReviewAnalysis } from '@/lib/types';

interface GatheringBrandedAppProps {
  businessName: string;
  logoUrl: string | null;
  locations: LocationItem[];
  photos: PlacePhoto[];
  isActive: boolean;
}

const AVATAR_COLORS = ['#625CE4', '#E45C7A', '#5CAE60', '#D4A03E', '#5C8DE4', '#E4835C'];

type Person = { name: string; initials: string; color: string };

const PEOPLE_BY_COUNTRY: Record<string, Person[]> = {
  dk: [
    { name: 'Sofie Nielsen', initials: 'SN', color: AVATAR_COLORS[0] },
    { name: 'Mikkel Hansen', initials: 'MH', color: AVATAR_COLORS[1] },
    { name: 'Ida Christensen', initials: 'IC', color: AVATAR_COLORS[2] },
    { name: 'Frederik Larsen', initials: 'FL', color: AVATAR_COLORS[3] },
  ],
  de: [
    { name: 'Lena Müller', initials: 'LM', color: AVATAR_COLORS[0] },
    { name: 'Max Weber', initials: 'MW', color: AVATAR_COLORS[1] },
    { name: 'Anna Schmidt', initials: 'AS', color: AVATAR_COLORS[2] },
    { name: 'Jonas Fischer', initials: 'JF', color: AVATAR_COLORS[3] },
  ],
  se: [
    { name: 'Elin Svensson', initials: 'ES', color: AVATAR_COLORS[0] },
    { name: 'Oscar Lindberg', initials: 'OL', color: AVATAR_COLORS[1] },
    { name: 'Maja Eriksson', initials: 'ME', color: AVATAR_COLORS[2] },
    { name: 'Axel Johansson', initials: 'AJ', color: AVATAR_COLORS[3] },
  ],
  no: [
    { name: 'Nora Berg', initials: 'NB', color: AVATAR_COLORS[0] },
    { name: 'Lars Haugen', initials: 'LH', color: AVATAR_COLORS[1] },
    { name: 'Ingrid Dahl', initials: 'ID', color: AVATAR_COLORS[2] },
    { name: 'Erik Olsen', initials: 'EO', color: AVATAR_COLORS[3] },
  ],
  nl: [
    { name: 'Sophie de Vries', initials: 'SV', color: AVATAR_COLORS[0] },
    { name: 'Bram Bakker', initials: 'BB', color: AVATAR_COLORS[1] },
    { name: 'Fleur Jansen', initials: 'FJ', color: AVATAR_COLORS[2] },
    { name: 'Daan Visser', initials: 'DV', color: AVATAR_COLORS[3] },
  ],
  es: [
    { name: 'Lucía García', initials: 'LG', color: AVATAR_COLORS[0] },
    { name: 'Carlos Martín', initials: 'CM', color: AVATAR_COLORS[1] },
    { name: 'María López', initials: 'ML', color: AVATAR_COLORS[2] },
    { name: 'Pablo Ruiz', initials: 'PR', color: AVATAR_COLORS[3] },
  ],
  fr: [
    { name: 'Camille Dupont', initials: 'CD', color: AVATAR_COLORS[0] },
    { name: 'Lucas Bernard', initials: 'LB', color: AVATAR_COLORS[1] },
    { name: 'Léa Martin', initials: 'LM', color: AVATAR_COLORS[2] },
    { name: 'Hugo Petit', initials: 'HP', color: AVATAR_COLORS[3] },
  ],
  it: [
    { name: 'Giulia Rossi', initials: 'GR', color: AVATAR_COLORS[0] },
    { name: 'Marco Bianchi', initials: 'MB', color: AVATAR_COLORS[1] },
    { name: 'Sara Colombo', initials: 'SC', color: AVATAR_COLORS[2] },
    { name: 'Luca Ferrari', initials: 'LF', color: AVATAR_COLORS[3] },
  ],
};

const DEFAULT_PEOPLE: Person[] = [
  { name: 'Sarah Mitchell', initials: 'SM', color: AVATAR_COLORS[0] },
  { name: 'James Chen', initials: 'JC', color: AVATAR_COLORS[1] },
  { name: 'Emma Rodriguez', initials: 'ER', color: AVATAR_COLORS[2] },
  { name: 'Alex Thompson', initials: 'AT', color: AVATAR_COLORS[3] },
];

function getPeople(countryCode?: string): Person[] {
  return PEOPLE_BY_COUNTRY[countryCode ?? ''] ?? DEFAULT_PEOPLE;
}

function AvatarCircle({ initials, color, size = 36 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <span className="text-white font-semibold" style={{ fontSize: size * 0.35 }}>{initials}</span>
    </div>
  );
}

const DEFAULT_CHANNELS = [
  { name: 'General', emoji: '💬' },
  { name: 'Announcements', emoji: '📢' },
  { name: 'Team Shoutouts', emoji: '🏆' },
  { name: 'New Starters', emoji: '👋' },
  { name: 'Ideas & Feedback', emoji: '💡' },
];

function buildFeedChannels(locations: LocationItem[]) {
  const locationChannels = locations.map((loc) => {
    const shortName = loc.name.split(' - ').pop()?.trim() ?? loc.name;
    return { name: shortName, emoji: '📍' };
  });
  return [...DEFAULT_CHANNELS, ...locationChannels];
}

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
  primaryColor,
  photos,
  locations,
  analysis,
  websiteImages,
  people,
  feedPosts,
  animate,
}: {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  photos: PlacePhoto[];
  locations: LocationItem[];
  analysis: ReviewAnalysis | null;
  websiteImages: string[];
  people: Person[];
  feedPosts: FeedPost[] | null;
  animate: boolean;
}) {
  const feedChannels = buildFeedChannels(locations);
  // Prefer firecrawl website images, fall back to Google Places photos
  const fcImg1 = websiteImages[0];
  const fcImg2 = websiteImages[1];
  const photo1 = fcImg1 ?? (photos[0] ? `/api/places/photo?name=${encodeURIComponent(photos[0].name)}&maxWidthPx=600` : undefined);
  const photo2 = fcImg2 ?? (photos[3] ? `/api/places/photo?name=${encodeURIComponent(photos[3].name)}&maxWidthPx=600` : undefined);
  const heroPhoto = photos[1] ? `/api/places/photo?name=${encodeURIComponent(photos[1].name)}&maxWidthPx=1200` : undefined;

  // Use Haiku-generated posts if available, fall back to analysis-derived, then generic
  const desktopPosts = feedPosts?.filter((p) => p.platform === 'desktop') ?? [];
  const post1Text = desktopPosts[0]?.body
    ?? (analysis?.strengths?.[0]
      ? `Great news! Customers consistently highlight "${analysis.strengths[0]}" across our locations. Keep up the amazing work, team!`
      : `Welcome to the ${businessName} team! We're excited to have everyone on board.`);
  const post1Channel = desktopPosts[0]?.channel ?? (analysis?.strengths?.[0] ? 'Team Shoutouts' : 'Announcements');

  const post2Text = desktopPosts[1]?.body
    ?? (analysis?.opportunities?.[0]
      ? `New training available: ${analysis.opportunities[0]}. This was identified as a key growth area from recent customer feedback. Check it out in Grow!`
      : `Quick snap from yesterday's team lunch! Great to see everyone together`);
  const post2Channel = desktopPosts[1]?.channel ?? (analysis?.opportunities?.[0] ? 'Announcements' : 'Office Life');

  return (
    <div className="w-[1200px] h-[750px] bg-white flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Top nav bar ─────────────────────────────────────────── */}
      <motion.nav
        className="h-[72px] w-full flex items-center justify-between px-6 shrink-0 bg-white"
        initial={fadeUp.initial}
        animate={animate ? fadeUp.visible : fadeUp.initial}
        transition={stagger(0.3, 0)}
      >
        {/* Logo */}
        <div className="flex items-center w-[200px]">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-8 object-contain rounded-lg" />
          ) : (
            <div className="h-8 w-24 rounded-md" style={{ backgroundColor: primaryColor }} />
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
          <AvatarCircle initials={people[0].initials} color={people[0].color} size={36} />
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
            {feedChannels.map((feed) => (
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
                <AvatarCircle initials={people[0].initials} color={people[0].color} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{people[0].name}</div>
                  <div className="text-xs text-gray-400 mb-2">General</div>
                  <div className="text-sm text-gray-400 h-5">Write something here...</div>
                </div>
              </div>
            </motion.div>

            {/* Post 1: with image */}
            <motion.div className="bg-white rounded-xl p-4" initial={fadeUp.initial} animate={animate ? fadeUp.visible : fadeUp.initial} transition={stagger(0.3, 4)} style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start gap-3 mb-3">
                <AvatarCircle initials={people[1].initials} color={people[1].color} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{people[1].name}</div>
                  <div className="text-xs text-gray-400">
                    11:28 in <span className="text-gray-400">{post1Channel}</span>
                  </div>
                </div>
                <MoreVertical className="size-4 text-gray-300 shrink-0" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line mb-3">
                {post1Text}
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
                    <AvatarCircle initials={people[2].initials} color={people[2].color} size={20} />
                    <AvatarCircle initials={people[3].initials} color={people[3].color} size={20} />
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
                <AvatarCircle initials={people[2].initials} color={people[2].color} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{people[2].name}</div>
                  <div className="text-xs text-gray-400">
                    09:15 in <span className="text-gray-400">{post2Channel}</span>
                  </div>
                </div>
                <MoreVertical className="size-4 text-gray-300 shrink-0" />
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {post2Text}
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
                        <AvatarCircle initials={people[2].initials} color={people[2].color} size={16} />
                        <span className="text-sm font-semibold text-gray-900 truncate">{people[2].name}</span>
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
  primaryColor,
  headerColor,
  photos,
  analysis,
  websiteImages,
  people,
  feedPosts,
  animate,
}: {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  headerColor: string;
  photos: PlacePhoto[];
  analysis: ReviewAnalysis | null;
  websiteImages: string[];
  people: Person[];
  feedPosts: FeedPost[] | null;
  animate: boolean;
}) {
  // Use Haiku-generated posts for mobile
  const mobilePosts = feedPosts?.filter((p) => p.platform === 'mobile') ?? [];
  const mobilePostText = mobilePosts[0]?.body
    ?? (analysis?.strengths?.[0]
      ? `Customers love "${analysis.strengths[0]}" across our locations. Keep it up!`
      : `Welcome to the ${businessName} team! We're excited to have everyone on board`);

  // Prefer firecrawl website images for stories, fall back to Google photos, then unsplash
  const storyPhoto1 = websiteImages[0] ?? (photos[2] ? `/api/places/photo?name=${encodeURIComponent(photos[2].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop');
  const storyPhoto2 = websiteImages[1] ?? (photos[4] ? `/api/places/photo?name=${encodeURIComponent(photos[4].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop');
  const storyPhoto3 = websiteImages[2] ?? (photos[5] ? `/api/places/photo?name=${encodeURIComponent(photos[5].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop');
  const postPhoto = websiteImages[3] ?? (photos[0] ? `/api/places/photo?name=${encodeURIComponent(photos[0].name)}&maxWidthPx=600` : undefined);

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
            <img src={logoUrl} alt="" className="h-11 object-contain rounded-lg" />
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
              <AvatarCircle initials={people[0].initials} color={people[0].color} size={40} />
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
            <AvatarCircle initials={people[1].initials} color={people[1].color} size={44} />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold text-[#1A2027]">{people[1].name}</div>
              <div className="text-[12px] text-[#7E7E7E]">09:03 in Announcements</div>
            </div>
            <MoreVertical className="size-5 text-[#C0C0C0] shrink-0 mt-1" />
          </div>
          <p className="text-[14px] text-[#1A2027] leading-relaxed mb-3">
            {mobilePostText}
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

const FALLBACK_CHECKLIST = [
  'Courses addressing your top review issues',
  'Channels set up for each of your locations',
  'Todo\'s created to boost your weakest areas',
  'Staff recognition based on customer feedback',
];

function buildChecklist(analysis: ReviewAnalysis | null, locationCount: number): string[] {
  if (!analysis || analysis.categoryBreakdown.length === 0) return FALLBACK_CHECKLIST;

  const items: string[] = [];

  // Course from top opportunity
  const topOpp = analysis.opportunities[0];
  if (topOpp) {
    items.push(`Course ready: "${topOpp}"`);
  } else {
    items.push('Courses addressing your top review issues');
  }

  // Channels from locations
  items.push(`${locationCount} location channel${locationCount === 1 ? '' : 's'} set up`);

  // Strength recognition
  const topStrength = analysis.strengths[0];
  if (topStrength) {
    items.push(`Staff recognised for "${topStrength}"`);
  } else {
    items.push('Staff recognition based on customer feedback');
  }

  // Category-specific todo
  const topCategory = analysis.categoryBreakdown[0];
  if (topCategory) {
    items.push(`${topCategory.allgravyModule} action items created`);
  } else {
    items.push('Todo\'s created to boost your weakest areas');
  }

  return items;
}

// ── Main component ──────────────────────────────────────────────────

export function GatheringBrandedApp({
  businessName,
  logoUrl,
  locations,
  photos,
  isActive,
}: GatheringBrandedAppProps) {
  const { brandColorMap, state } = useOnboarding();
  const primaryColor = brandColorMap.primaryColor;
  const darkestBrandColor = primaryColor;
  const analysis = state.gatheringData.reviewAnalysis;
  const feedPosts = state.gatheringData.feedPosts;
  const websiteImages = state.business?.websiteImages ?? [];
  const countryCode = state.selectedPlace?.countryCode ?? state.locations[0]?.countryCode;
  const people = getPeople(countryCode);
  const checklistItems = buildChecklist(analysis, locations.length);

  const [dialogOpen, setDialogOpen] = useState(false);

  const LAPTOP_SCALE = 780 / 1200;
  const PHONE_SCALE = 250 / 390;

  const MOCKUP_W = 900;
  const MOCKUP_H = 540;
  const [mockupScale, setMockupScale] = useState(0.85);
  const roRef = useRef<ResizeObserver | null>(null);

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

  return (
    <div className="w-full h-full p-4 bg-[#625CE4]">
      <motion.div
        className="w-full h-full flex rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={isActive ? { opacity: 1 } : {}}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        {/* Left sidebar */}
        <motion.div
          className="w-80 shrink-0 flex flex-col border-r border-gray-200/80 bg-gray-50 font-sans"
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
              {checklistItems.map((item, i) => (
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
        <div ref={mockupAreaRef} className="flex-1 relative min-w-0 flex flex-col items-center px-6 pt-12">
          <motion.h3
            className="text-3xl font-semibold text-gray-900 font-serif mb-12 shrink-0"
            initial={{ opacity: 0, y: 16 }}
            animate={isActive ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Your branded app is ready
          </motion.h3>
          <div style={{ width: MOCKUP_W * mockupScale, height: MOCKUP_H * mockupScale }}>
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
                    backgroundColor: primaryColor,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="w-full h-full object-cover" />
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
                    <FeedReplica businessName={businessName} logoUrl={logoUrl} primaryColor={primaryColor} photos={photos} locations={locations} analysis={analysis} websiteImages={websiteImages} people={people} feedPosts={feedPosts} animate={isActive} />
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
                      logoUrl={logoUrl}
                      primaryColor={primaryColor}
                      headerColor={darkestBrandColor}
                      photos={photos}
                      analysis={analysis}
                      websiteImages={websiteImages}
                      people={people}
                      feedPosts={feedPosts}
                      animate={isActive}
                    />
                  </div>
                </PhoneMockup>
              </motion.div>
            </div>
          </div>

          {/* Gradient overlay with header + button */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-center pb-8"
            style={{ background: 'linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)', height: 200 }}
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : {}}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <button
              onClick={() => setDialogOpen(true)}
              className="h-12 px-20 rounded-xl text-sm font-medium text-white bg-gradient-to-b from-[#6e69e8] to-[#625CE4] shadow-[0_2px_8px_rgba(98,92,228,0.35),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#7a76ec] hover:to-[#6e69e8] active:translate-y-[0.5px] transition-all cursor-pointer"
            >
              Get started
            </button>
          </motion.div>
        </div>

        <GetStartedDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </motion.div>
    </div>
  );
}
