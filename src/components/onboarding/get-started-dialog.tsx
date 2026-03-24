'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { OnboardingInput } from './ui/onboarding-input';
import { OnboardingButton } from './ui/onboarding-button';
import { useSelfServiceOnboarding } from '@/hooks/use-self-service-onboarding';

type DialogStep = 'email' | 'otp';

interface GetStartedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const { loading, error, sendOtp, verifyOtp, redirectToApp, clearError } = useSelfServiceOnboarding();
  const [step, setStep] = useState<DialogStep>('email');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const resetState = () => {
    setStep('email');
    setEmail('');
    setFullName('');
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

    const success = await sendOtp(email);
    if (success) setStep('otp');
  };

  const handleVerifyOtp = async () => {
    setLocalError(null);
    clearError();
    if (otp.length < 6) {
      setLocalError('Please enter the 6-character code.');
      return;
    }

    const result = await verifyOtp({ email, otp, fullName });
    if (result) {
      redirectToApp(result.code);
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
        className="sm:max-w-[520px] p-0 overflow-hidden bg-white font-sans"
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
                  Get started
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Enter your details to set up your account
                </p>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <OnboardingInput
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="!h-11 !rounded-xl !text-sm"
                  autoFocus
                />
                <OnboardingInput
                  type="email"
                  placeholder="Work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="!h-11 !rounded-xl !text-sm"
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
                  We sent a 6-digit code to <span className="text-gray-600 font-medium">{email}</span>
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
