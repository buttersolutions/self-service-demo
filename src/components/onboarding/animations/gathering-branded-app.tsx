'use client';

import { motion } from 'framer-motion';
import {
  Home, TrendingUp, FileText, GraduationCap, CalendarDays,
  Users, Puzzle, MessageCircle, Bell, Settings,
  Heart, Eye, CornerDownLeft, SmilePlus, MoreVertical, Plus, MapPin, CalendarPlus,
} from 'lucide-react';
import { deriveBrandPalette } from '@/lib/colors';
import { OnboardingButton } from '../ui';
import type { LocationItem } from '../types';
import type { PlacePhoto } from '@/lib/types';

interface GatheringBrandedAppProps {
  businessName: string;
  logoUrl: string | null;
  brandColors: string[];
  locations: LocationItem[];
  photos: PlacePhoto[];
  isActive: boolean;
}

const AVATARS = [
  'https://i.pravatar.cc/80?img=12',
  'https://i.pravatar.cc/80?img=32',
  'https://i.pravatar.cc/80?img=47',
  'https://i.pravatar.cc/80?img=5',
];

const PEOPLE = [
  { name: 'Sarah Mitchell', avatar: AVATARS[0] },
  { name: 'James Chen', avatar: AVATARS[1] },
  { name: 'Emma Rodriguez', avatar: AVATARS[2] },
  { name: 'Alex Thompson', avatar: AVATARS[3] },
];

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

function FeedReplica({
  businessName,
  logoUrl,
  primaryColor,
  photos,
}: {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  photos: PlacePhoto[];
}) {
  const photo1 = photos[0] ? `/api/places/photo?name=${encodeURIComponent(photos[0].name)}&maxWidthPx=600` : undefined;
  const photo2 = photos[3] ? `/api/places/photo?name=${encodeURIComponent(photos[3].name)}&maxWidthPx=600` : undefined;
  const heroPhoto = photos[1] ? `/api/places/photo?name=${encodeURIComponent(photos[1].name)}&maxWidthPx=1200` : undefined;

  return (
    <div className="w-[1200px] h-[750px] bg-white flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Top nav bar ─────────────────────────────────────────── */}
      <nav className="h-[72px] w-full flex items-center justify-between px-6 shrink-0 bg-white">
        {/* Logo */}
        <div className="flex items-center w-[200px]">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-8 object-contain" />
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
                style={isActive ? { backgroundColor: 'rgba(98, 92, 228, 0.1)' } : {}}
              >
                <Icon
                  className="size-5"
                  style={{ color: isActive ? '#625CE4' : '#4b5563' }}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? '#625CE4' : '#4b5563' }}
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
          <img src={PEOPLE[0].avatar} alt="" className="size-9 rounded-xl object-cover border border-[#e5e7eb]" />
        </div>
      </nav>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden px-6">
        {/* Hero image */}
        {heroPhoto && (
          <div className="w-full h-48 rounded-xl overflow-hidden mt-1 mb-0">
            <img src={heroPhoto} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex gap-6 py-6">
          {/* ── Left sidebar: Feeds ────────────────────────────── */}
          <div className="w-48 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900">Feeds</span>
              <Plus className="size-4 text-gray-400" />
            </div>

            {/* For you — selected */}
            <div
              className="flex h-8 items-center gap-2 rounded-md px-3 py-1 text-sm font-medium shadow-sm mb-0.5 bg-white"
              style={{ color: '#625CE4' }}
            >
              <Heart className="size-4 mx-0.5" fill="#625CE4" style={{ color: '#625CE4' }} />
              For you
            </div>

            {/* Feed channels */}
            {FEED_CHANNELS.map((feed) => (
              <div key={feed.name} className="flex h-8 items-center gap-2 rounded-md px-3 py-1 text-sm text-gray-500 hover:bg-white/50">
                <span className="text-sm leading-none">{feed.emoji}</span>
                <span>{feed.name}</span>
              </div>
            ))}
          </div>

          {/* ── Center: Feed ───────────────────────────────────── */}
          <div className="flex-1 max-w-2xl mx-auto space-y-3">
            {/* Posts header */}
            <div className="flex items-center">
              <span className="text-sm font-semibold text-gray-900">Posts</span>
            </div>

            {/* Composer card */}
            <div className="bg-white rounded-xl p-4 pb-2" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start gap-3">
                <img src={PEOPLE[0].avatar} alt="" className="size-9 rounded-xl object-cover shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{PEOPLE[0].name}</div>
                  <div className="text-xs text-gray-400 mb-2">General</div>
                  <div className="text-sm text-gray-400 h-5">Write something here...</div>
                </div>
              </div>
            </div>

            {/* Post 1: with image */}
            <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start gap-3 mb-3">
                <img src={PEOPLE[1].avatar} alt="" className="size-9 rounded-xl object-cover shrink-0" />
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
                    <img src={PEOPLE[2].avatar} alt="" className="size-5 rounded-full border-2 border-white object-cover" />
                    <img src={PEOPLE[3].avatar} alt="" className="size-5 rounded-full border-2 border-white object-cover" />
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
            </div>

            {/* Post 2: text only */}
            <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 1px 2px -1px rgba(0,0,0,0.06), 0px 2px 4px 0px rgba(0,0,0,0.03)' }}>
              <div className="flex items-start gap-3 mb-3">
                <img src={PEOPLE[2].avatar} alt="" className="size-9 rounded-xl object-cover shrink-0" />
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
            </div>
          </div>

          {/* ── Right sidebar ──────────────────────────────────── */}
          <div className="w-52 shrink-0 space-y-6">
            {/* Events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Events</h2>
                <span className="text-xs text-gray-400 font-medium">View all</span>
              </div>
              <div className="flex flex-col items-center text-center space-y-3 py-3 px-3 bg-gray-100/50 rounded-lg">
                <p className="text-xs text-gray-400">No upcoming events</p>
                <div className="flex items-center justify-center gap-2 w-full h-8 text-xs text-gray-500 border border-gray-200 rounded-lg bg-white">
                  <CalendarPlus className="size-3.5" />
                  Add event
                </div>
              </div>
            </div>

            {/* Shortcuts */}
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Shortcuts</h2>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {[
                  { label: 'Payslips', color: 'bg-blue-500' },
                  { label: 'Benefits', color: 'bg-emerald-500' },
                  { label: 'Handbook', color: 'bg-orange-500' },
                  { label: 'Time Off', color: 'bg-purple-500' },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-2 p-2 rounded-xl">
                    <div className={`size-12 rounded-full ${s.color} flex items-center justify-center text-white font-bold text-xl shadow-md`}>
                      {s.label.charAt(0)}
                    </div>
                    <span className="text-xs text-gray-400">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Device mockups ──────────────────────────────────────────────────

function LaptopMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative overflow-hidden"
        style={{
          width: 780,
          height: 490,
          background: '#e2e3e5',
          padding: 10,
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div className="absolute top-[3px] left-1/2 -translate-x-1/2 size-[4px] rounded-full bg-gray-400/60" />
        <div className="w-full h-full rounded-sm overflow-hidden">
          {children}
        </div>
      </div>
      <div style={{ width: 820, height: 8, background: 'linear-gradient(180deg, #d1d5db 0%, #c4c8ce 100%)', borderRadius: '0 0 6px 6px' }} />
      <div className="mx-auto" style={{ width: 160, height: 3, background: '#b8bcc3', borderRadius: '0 0 4px 4px' }} />
    </div>
  );
}

function PhoneMockup() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 200, height: 400, borderRadius: 32,
        border: '5px solid #e2e3e5', backgroundColor: '#f0f1f3',
        boxShadow: '0 20px 60px rgba(0,0,0,0.10), 0 8px 20px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
      }}
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 rounded-b-2xl" style={{ width: 90, height: 20, backgroundColor: '#e2e3e5' }} />
      <div className="w-full h-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #fafafa 0%, #f0f0f2 100%)' }} />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full z-10" style={{ width: 80, height: 4, backgroundColor: '#d4d5d8' }} />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function GatheringBrandedApp({
  businessName,
  logoUrl,
  brandColors,
  locations,
  photos,
  isActive,
}: GatheringBrandedAppProps) {
  const palette = deriveBrandPalette(brandColors);
  const primaryColor = palette.primary;
  const SCALE = 760 / 1200;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 16 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h3 className="text-2xl font-semibold text-gray-900 font-serif mb-2">
          Your branded app is ready
        </h3>
        <p className="text-sm text-gray-400">
          {businessName} — powered by Allgravy
        </p>
      </motion.div>

      <div className="relative mb-10" style={{ width: 860, height: 560 }}>
        <motion.div
          className="absolute bottom-0 left-0"
          initial={{ opacity: 0, y: 30, scale: 0.92 }}
          animate={isActive ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <LaptopMockup>
            <div style={{ width: 1200, height: 750, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
              <FeedReplica businessName={businessName} logoUrl={logoUrl} primaryColor={primaryColor} photos={photos} />
            </div>
          </LaptopMockup>
        </motion.div>

        <motion.div
          className="absolute z-10"
          style={{ right: -20, bottom: 30 }}
          initial={{ opacity: 0, y: 40, scale: 0.85 }}
          animate={isActive ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <PhoneMockup />
        </motion.div>
      </div>

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={isActive ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        <OnboardingButton active>
          Get in
        </OnboardingButton>
      </motion.div>
    </div>
  );
}
