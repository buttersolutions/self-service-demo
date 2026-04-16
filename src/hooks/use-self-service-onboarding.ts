import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useOnboarding } from '@/lib/demo-flow-context';
import type { LocationItem, GatheringData } from '@/components/onboarding/types';

/* ── Config ─────────────────────────────────────────────────────────── */

const API_BASE = process.env.NEXT_PUBLIC_ONBOARDING_API_URL || 'http://localhost:8080';
const REDIRECT_BASE_URL = process.env.NEXT_PUBLIC_ORG_ADMIN_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE}/self-service-onboarding`,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Types ──────────────────────────────────────────────────────────── */

interface SendOtpRequest {
  email: string;
}

interface SendOtpResponse {
  success: boolean;
}

interface ThemeColors {
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  highlight: string;
}

interface ThemeBranding {
  logoURL?: string;
  squareLogoURL?: string;
}

interface VerifyOtpRequest {
  email: string;
  otp: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  termsAndConditions: boolean;
  companyName: string;
  locations: { name: string; countryCode: string }[];
  feeds: { name: string; posts: { contentPlainText: string }[] }[];
  theme: {
    colors: ThemeColors;
    branding?: ThemeBranding;
  };
}

interface VerifyOtpResponse {
  code: string;
  isNewUser: boolean;
  accountId?: string;
  orgId?: string;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

const SUPPORTED_COUNTRY_CODES = new Set(['DK', 'GB-ENG', 'NO', 'SE', 'NL', 'DE', 'BE']);

function toApiCountryCode(isoCode?: string): string {
  if (!isoCode) return 'GB-ENG';
  const upper = isoCode.toUpperCase();
  if (upper === 'GB' || upper === 'UK') return 'GB-ENG';
  if (SUPPORTED_COUNTRY_CODES.has(upper)) return upper;
  return 'GB-ENG';
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message[0];
    return err.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const STANDARD_FEEDS: { name: string; post: string }[] = [
  { name: '💬 General', post: 'The go-to feed for company-wide updates and everyday communication.' },
  { name: '📢 Announcements', post: 'Important announcements from leadership and management.' },
  { name: '🏆 Team Shoutouts', post: 'Celebrate wins, recognize great work, and shout out your teammates!' },
  { name: '👋 New Starters', post: 'Welcome new team members and help them feel at home from day one.' },
  { name: '💡 Ideas & Feedback', post: 'Got an idea to improve how we work? Share it here.' },
  { name: '🐦 Social', post: 'Off-topic chat, memes, and everything in between.' },
  { name: '📅 Events', post: 'Upcoming events, team outings, and social gatherings.' },
  { name: '🎲 Random', post: 'For anything and everything that doesn\'t fit elsewhere.' },
];

function buildFeeds(
  locations: LocationItem[],
  gatheringData: GatheringData,
): VerifyOtpRequest['feeds'] {
  const insights = gatheringData.reviewInsights ?? [];

  const locationFeeds = locations.map((loc) => {
    const locInsights = insights.filter((i) => i.locationName === loc.name);
    const positive = locInsights.find((i) => i.sentiment === 'positive');

    const post = positive
      ? `Welcome to ${loc.name}! Here's what your guests are saying: "${positive.relevantExcerpt}" — keep it up!`
      : `Welcome to ${loc.name}! This is your team's feed — share updates, celebrate wins, and stay connected.`;

    return { name: `📍 ${loc.name}`, posts: [{ contentPlainText: post }] };
  });

  const standardFeeds = STANDARD_FEEDS.map((f) => ({
    name: f.name,
    posts: [{ contentPlainText: f.post }],
  }));

  const menuFeed = {
    name: '📜 Menu Changes',
    posts: [
      {
        contentPlainText:
          'This feed is for sharing menu updates with your team — new dishes, seasonal changes, items removed, and pricing updates.',
      },
    ],
  };

  return [...standardFeeds, menuFeed, ...(locations.length > 1 ? locationFeeds : [])];
}

/* ── Hook ───────────────────────────────────────────────────────────── */

export function useSelfServiceOnboarding() {
  const { state, brandColorMap } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async (email: string) => {
    setError(null);
    setLoading(true);
    try {
      await api.post<SendOtpResponse>('/send-otp', { email } satisfies SendOtpRequest);
      return true;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send code. Please try again.'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (params: {
    email: string;
    otp: string;
    fullName: string;
    phoneNumber?: string;
  }) => {
    setError(null);
    setLoading(true);
    try {
      const nameParts = params.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const payload: VerifyOtpRequest = {
        email: params.email,
        otp: params.otp,
        firstName,
        lastName,
        phoneNumber: params.phoneNumber || undefined,
        termsAndConditions: true,
        companyName: state.business?.name || 'My Company',
        locations: state.locations.map((l) => ({
          name: l.name,
          countryCode: toApiCountryCode(l.countryCode),
        })),
        feeds: buildFeeds(state.locations, state.gatheringData),
        theme: {
          colors: {
            primary: brandColorMap.primaryColor,
            primaryText: brandColorMap.primaryTextColor,
            secondary: brandColorMap.secondaryColor,
            secondaryText: brandColorMap.secondaryTextColor,
            highlight: brandColorMap.highlightColor,
          },
          branding: {
            logoURL: state.business?.logoUrl || undefined,
            squareLogoURL: state.business?.logoUrl || undefined,
          },
        },
      };

      const { data } = await api.post<VerifyOtpResponse>('/verify-otp', payload);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid code. Please try again.'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const redirectToApp = (code: string) => {
    window.location.href = `${REDIRECT_BASE_URL}/welcome?code=${code}`;
  };

  const redirectToSignIn = () => {
    window.location.href = `${REDIRECT_BASE_URL}/signin`;
  };

  const clearError = () => setError(null);

  return { loading, error, sendOtp, verifyOtp, redirectToApp, redirectToSignIn, clearError };
}
