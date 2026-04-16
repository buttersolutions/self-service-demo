'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, User, Mail, ChevronDown, Search } from 'lucide-react';
import Cal, { getCalApi } from '@calcom/embed-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { OnboardingInput } from './ui/onboarding-input';
import { OnboardingButton } from './ui/onboarding-button';
import { useSelfServiceOnboarding } from '@/hooks/use-self-service-onboarding';
import { toast } from 'sonner';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { COUNTRY_CODES, DEFAULT_COUNTRY, type CountryCode } from '@/lib/country-codes';
import { useOnboarding } from '@/lib/demo-flow-context';

type DialogStep = 'email' | 'booking' | 'otp';

const CALCOM_BOOKING_LINK = process.env.NEXT_PUBLIC_CALCOM_BOOKING_LINK;
// Optional override for non-default cal.com regions (e.g. EU cloud at app.cal.eu).
// Leave unset for the default cal.com instance.
const CALCOM_ORIGIN = process.env.NEXT_PUBLIC_CALCOM_ORIGIN;
const CALCOM_EMBED_JS_URL = CALCOM_ORIGIN ? `${CALCOM_ORIGIN}/embed/embed.js` : undefined;

interface GetStartedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ── Inline searchable country picker ──────────────────────────────── */

function CountryCodePicker({
  value,
  onChange,
}: {
  value: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const filtered = search
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRY_CODES;

  // Position the dropdown below the trigger
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      setOpen(false);
      setSearch('');
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const select = useCallback(
    (c: CountryCode) => {
      onChange(c);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  return (
    <div className="shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 h-11 pl-3 pr-1.5 cursor-pointer rounded-l-xl"
      >
        <span className="text-base leading-none">{value.flag}</span>
        <span className="text-sm text-gray-900">{value.dial}</span>
        <ChevronDown className="size-3.5 text-gray-400" />
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed w-72 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden font-sans"
            style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
              <Search className="size-3.5 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
              />
            </div>
            {/* List */}
            <div className="max-h-[220px] overflow-y-auto overscroll-contain">
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">No results</div>
              )}
              {filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => select(c)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors cursor-pointer ${
                    c.code === value.code ? 'bg-gray-50 font-medium' : ''
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 text-gray-900 truncate">{c.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{c.dial}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

const stepVariants = {
  enter: {
    y: 30,
    opacity: 0,
  },
  center: {
    y: 0,
    opacity: 1,
  },
  exit: {
    y: -20,
    opacity: 0,
  },
};

const stepTransition = {
  type: 'tween' as const,
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export function GetStartedDialog({ open, onOpenChange }: GetStartedDialogProps) {
  const { loading, error, sendOtp, verifyOtp, redirectToApp, redirectToSignIn, clearError } = useSelfServiceOnboarding();
  const { state } = useOnboarding();
  const [step, setStep] = useState<DialogStep>('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>(() => {
    const locCode = state.locations[0]?.countryCode?.toUpperCase();
    if (locCode) {
      const match = COUNTRY_CODES.find((c) => c.code === locCode || (locCode === 'UK' && c.code === 'GB'));
      if (match) return match;
    }
    return DEFAULT_COUNTRY;
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const resetState = () => {
    setStep('email');
    setEmail('');
    setFullName('');
    setCountryCode(DEFAULT_COUNTRY);
    setPhoneNumber('');
    setOtp('');
    setLocalError(null);
    clearError();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleSendOtp = async () => {
    setLocalError(null);
    clearError();
    if (!email || !fullName) {
      setLocalError('Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (phoneNumber) {
      const full = `${countryCode.dial}${phoneNumber}`;
      if (!isValidPhoneNumber(full)) {
        setLocalError('Please enter a valid phone number.');
        return;
      }
    }

    const success = await sendOtp(email);
    if (success) setStep(CALCOM_BOOKING_LINK ? 'booking' : 'otp');
  };

  const handleAdvanceToOtp = () => {
    setLocalError(null);
    clearError();
    setStep('otp');
  };

  // Wire cal.com bookingSuccessful event → auto-advance to OTP step
  useEffect(() => {
    if (step !== 'booking' || !CALCOM_BOOKING_LINK) return;
    let cancelled = false;
    (async () => {
      try {
        const cal = CALCOM_EMBED_JS_URL ? await getCalApi(CALCOM_EMBED_JS_URL) : await getCalApi();
        if (cancelled) return;
        cal('on', {
          action: 'bookingSuccessful',
          callback: () => {
            toast.success('Demo booked — see you then!');
            setStep('otp');
          },
        });
      } catch {
        /* ignore — manual button is the fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  const handleVerifyOtp = async () => {
    setLocalError(null);
    clearError();
    if (otp.length < 6) {
      setLocalError('Please enter the 6-character code.');
      return;
    }

    let fullPhone: string | undefined;
    if (phoneNumber) {
      const parsed = parsePhoneNumber(`${countryCode.dial}${phoneNumber}`);
      fullPhone = parsed?.format('E.164');
    }
    const result = await verifyOtp({ email, otp, fullName, phoneNumber: fullPhone });
    if (result) {
      // Fire lead webhook (non-blocking)
      const webhookUrl = process.env.NEXT_PUBLIC_LEAD_WEBHOOK_URL;
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            fullName,
            phoneNumber: fullPhone,
            countryCode: countryCode.code,
            business: state.business ? {
              name: state.business.name,
              domain: state.business.domain,
            } : undefined,
            locationCount: state.locations.length,
            reportId: state.reportId,
            accountId: result.accountId ?? result.orgId,
            isNewUser: result.isNewUser,
            source: 'self-service',
          }),
          keepalive: true,
        }).catch(() => {});
      }

      if (result.isNewUser === false) {
        toast.info('Account already exists — redirecting to log in...');
        setTimeout(() => {
          redirectToSignIn();
        }, 2000);
      } else {
        redirectToApp(result.code);
      }
    }
  };

  const handleResendCode = async () => {
    setLocalError(null);
    clearError();
    const success = await sendOtp(email);
    if (success) setLocalError('Code resent! Check your inbox.');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`p-0 overflow-hidden bg-white font-sans ${step === 'booking' ? 'sm:max-w-[760px]' : 'sm:max-w-[520px]'}`}
        showCloseButton
      >
        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"

              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 font-sans">
                  Almost there!
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Just a few details so we can set up your app and get you started.
                </p>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <OnboardingInput
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="!h-11 !rounded-xl !text-sm"
                  icon={<User className="size-4" strokeWidth={2.5} />}
                  autoFocus
                />

                {/* Phone number with inline country code picker */}
                <div className="relative w-full flex items-center h-11 rounded-xl bg-white border border-gray-200 shadow-xs transition-all duration-200 focus-within:border-gray-300">
                  <CountryCodePicker value={countryCode} onChange={setCountryCode} />
                  <div className="w-px h-5 bg-gray-200 shrink-0" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                    className="flex-1 h-full bg-transparent px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none rounded-r-xl"
                  />
                </div>

                <OnboardingInput
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="!h-11 !rounded-xl !text-sm"
                  icon={<Mail className="size-4" strokeWidth={2.5} />}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                />
              </div>

              {displayError && (
                <p className="text-xs text-red-500 mb-3">{displayError}</p>
              )}

              <OnboardingButton
                onClick={handleSendOtp}
                loading={loading}
                loadingText="Sending code..."
                active
                disabled={!email || !fullName}
                className="!h-11 !rounded-xl !text-sm"
              >
                <span className="flex items-center justify-center gap-2">
                  Continue
                  <ArrowRight className="size-4" />
                </span>
              </OnboardingButton>
            </motion.div>
          )}

          {step === 'booking' && CALCOM_BOOKING_LINK && (
            <motion.div
              key="booking"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="p-6"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 font-sans">
                  Code on its way — book a walkthrough while you wait
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  We sent a 6-digit code to <span className="text-gray-600 font-medium">{email}</span>. Pick a time for a 30-min demo, or skip ahead.
                </p>
              </div>

              <div className="overflow-hidden mb-4">
                <Cal
                  calLink={CALCOM_BOOKING_LINK}
                  calOrigin={CALCOM_ORIGIN}
                  embedJsUrl={CALCOM_EMBED_JS_URL}
                  style={{ width: '100%', height: '420px', overflow: 'scroll' }}
                  config={{ layout: 'month_view', theme: 'light', hideEventTypeDetails: '1' }}
                />
              </div>

              <OnboardingButton
                onClick={handleAdvanceToOtp}
                active
                className="!h-11 !rounded-xl !text-sm"
              >
                <span className="flex items-center justify-center gap-2">
                  Continue to verification
                  <ArrowRight className="size-4" />
                </span>
              </OnboardingButton>

              <button
                onClick={handleAdvanceToOtp}
                className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"

              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stepTransition}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 font-sans">
                  Check your email
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  We sent a 6-digit code to your email <span className="text-gray-600 font-medium">{email}</span>
                </p>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  maxLength={6}
                  inputMode="text"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  className="w-full h-14 rounded-xl bg-white border border-gray-200 text-center text-2xl font-mono tracking-[0.5em] text-gray-900 placeholder:text-gray-300 outline-none focus:border-[#625CE4]/40 focus:ring-2 focus:ring-[#625CE4]/20 transition-all"
                />
              </div>

              {displayError && (
                <p className={`text-xs mb-3 ${displayError.includes('resent') ? 'text-emerald-500' : 'text-red-500'}`}>
                  {displayError}
                </p>
              )}

              <OnboardingButton
                onClick={handleVerifyOtp}
                loading={loading}
                loadingText="Verifying..."
                active
                disabled={otp.length < 6}
                className="!h-11 !rounded-xl !text-sm"
              >
                Verify & Get Started
              </OnboardingButton>

              <button
                onClick={handleResendCode}
                disabled={loading}
                className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Didn&apos;t receive a code? Resend
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
