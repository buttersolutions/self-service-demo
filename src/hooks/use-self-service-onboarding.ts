import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useOnboarding } from '@/lib/demo-flow-context';

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
        termsAndConditions: true,
        companyName: state.business?.name || 'My Company',
        locations: state.locations.map((l) => ({
          name: l.name,
          countryCode: toApiCountryCode(l.countryCode),
        })),
        feeds: [],
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

  const clearError = () => setError(null);

  return { loading, error, sendOtp, verifyOtp, redirectToApp, clearError };
}
