'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { OnboardingInput, OnboardingButton, ProgressBar } from '../ui';
import { stepVariants, childVariants } from '../constants';
import { isValidUrl } from '@/lib/mock-data-v2';

interface StepWebsitePromptProps {
  direction: number;
  loading: boolean;
  onSubmit: (url: string) => void;
  onSkip: () => void;
}

export function StepWebsitePrompt({ direction, loading, onSubmit, onSkip }: StepWebsitePromptProps) {
  const [url, setUrl] = useState('');
  const valid = isValidUrl(url);

  const handleSubmit = () => {
    if (valid && !loading) onSubmit(url.trim());
  };

  return (
    <>
      <motion.div
        className="flex flex-col items-center w-full max-w-[640px] mx-auto px-8"
        custom={direction}
        variants={stepVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.h1
          className="text-[24px] font-bold text-gray-900 mb-3 tracking-[-0.01em] w-full text-center font-serif"
          variants={childVariants}
        >
          What's your website?
        </motion.h1>

        <motion.p
          className="text-sm text-gray-500 mb-6 w-full text-center max-w-md"
          variants={childVariants}
        >
          We use it to pull your brand colours and logo so your app looks like yours.
        </motion.p>

        <motion.div
          className={`w-full transition-opacity duration-300 ${loading ? 'opacity-60' : ''}`}
          variants={childVariants}
        >
          <OnboardingInput
            type="text"
            placeholder="www.yourbusiness.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            disabled={loading}
            autoFocus
          />
        </motion.div>

        <motion.div className="w-full mt-6" variants={childVariants}>
          <OnboardingButton
            active={valid}
            loading={loading}
            loadingText="Fetching your branding..."
            onClick={handleSubmit}
            disabled={!valid}
          >
            Continue
          </OnboardingButton>
        </motion.div>

        <motion.button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors disabled:opacity-50"
          variants={childVariants}
        >
          I don't have a website
        </motion.button>
      </motion.div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full px-8 max-w-xl">
        <ProgressBar current={1} />
      </div>
    </>
  );
}
