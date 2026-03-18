'use client';

import { motion } from 'framer-motion';
import {
  Home, TrendingUp, FileText, GraduationCap, CalendarDays,
  Users, Puzzle, MessageCircle, Bell, Settings,
  Heart, Eye, CornerDownLeft, SmilePlus, MoreVertical, Plus, MapPin, CalendarPlus,
} from 'lucide-react';
import { deriveBrandPalette, relativeLuminance, isTooLight } from '@/lib/colors';
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
          width: 740,
          height: 460,
          background: '#1a1a1a',
          padding: 10,
          borderRadius: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div className="absolute top-[3px] left-1/2 -translate-x-1/2 size-[4px] rounded-full bg-gray-600" />
        <div className="w-full h-full rounded-lg overflow-hidden">
          {children}
        </div>
      </div>
      <div style={{ width: 780, height: 14, background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)', borderRadius: '0 0 8px 8px' }} />
      <div className="mx-auto" style={{ width: 160, height: 3, background: '#333', borderRadius: '0 0 4px 4px' }} />
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
}: {
  businessName: string;
  logoUrl: string | null;
  primaryColor: string;
  headerColor: string;
  photos: PlacePhoto[];
}) {
  const storyPhoto1 = photos[2] ? `/api/places/photo?name=${encodeURIComponent(photos[2].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=400&fit=crop';
  const storyPhoto2 = photos[4] ? `/api/places/photo?name=${encodeURIComponent(photos[4].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop';
  const storyPhoto3 = photos[5] ? `/api/places/photo?name=${encodeURIComponent(photos[5].name)}&maxWidthPx=400` : 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop';
  const postPhoto = photos[0] ? `/api/places/photo?name=${encodeURIComponent(photos[0].name)}&maxWidthPx=600` : undefined;

  return (
    <div className="relative w-[390px] h-[844px] bg-white flex flex-col overflow-hidden" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Status bar + Header (single block, no gap) ─────── */}
      <div
        className="shrink-0 px-5 pb-5"
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
            <img src={logoUrl} alt="" className="h-11 object-contain" />
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
      </div>

      {/* ── Feed selector ─────────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-4 pb-2 flex gap-3.5 overflow-hidden items-start">
        {/* For you — circle with red border (selected) */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="relative">
            <div className="size-[72px] rounded-full overflow-hidden border-[3px] border-[#FA614C] p-[2px]">
              <img src={PEOPLE[0].avatar} alt="" className="w-full h-full rounded-full object-cover" />
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
      </div>

      {/* ── Broadcasts (horizontal scroll, 160×200 cards) ─────── */}
      <div className="shrink-0 pl-3 pb-4 pt-1 flex gap-3 overflow-hidden">
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
      </div>

      {/* ── Feed post (with photo) ────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden border-t border-gray-100">
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-start gap-3 mb-2">
            <img src={PEOPLE[1].avatar} alt="" className="size-11 rounded-xl object-cover shrink-0" />
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
      </div>

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
      <div className="shrink-0 h-6 bg-white" />
    </div>
  );
}

function PhoneMockup({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: 200, height: 432,
        borderRadius: 28,
        border: '4px solid #1a1a1a',
        backgroundColor: '#ffffff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.20), 0 8px 20px rgba(0,0,0,0.10)',
      }}
    >
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 rounded-full" style={{ width: 50, height: 14, backgroundColor: '#1a1a1a' }} />
      <div className="w-full h-full overflow-hidden rounded-[24px]">
        {children ?? (
          <div className="w-full h-full" style={{ background: 'linear-gradient(180deg, #fafafa 0%, #f0f0f2 100%)' }} />
        )}
      </div>
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full z-20" style={{ width: 60, height: 4, backgroundColor: '#1a1a1a', opacity:0.2 }} />
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

  // Pick the darkest usable brand color for the mobile header
  const usableColors = brandColors.filter((c) => !isTooLight(c));
  const darkestBrandColor = usableColors.length > 0
    ? usableColors.reduce((darkest, c) => relativeLuminance(c) < relativeLuminance(darkest) ? c : darkest)
    : primaryColor;

  const SCALE = 720 / 1200;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      <motion.div
        className="text-center mb-4"
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

      <div className="relative mb-8" style={{ width: 860, height: 500 }}>
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
          <PhoneMockup>
            <div style={{ width: 390, height: 844, transform: 'scale(0.493)', transformOrigin: 'top left' }}>
              <MobileFeedReplica
                businessName={businessName}
                logoUrl={logoUrl}
                primaryColor={primaryColor}
                headerColor={darkestBrandColor}
                photos={photos}
              />
            </div>
          </PhoneMockup>
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
