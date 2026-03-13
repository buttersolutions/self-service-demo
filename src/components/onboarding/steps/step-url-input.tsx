'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { OnboardingInput, OnboardingButton, PaginationDots } from '../ui';
import { stepVariants, childVariants } from '../constants';
import { isValidUrl } from '@/lib/mock-data-v2';

interface StepUrlInputProps {
  direction: number;
  initialUrl?: string;
  onSubmit: (url: string) => void;
  loading: boolean;
}

export function StepUrlInput({ direction, initialUrl = '', onSubmit, loading }: StepUrlInputProps) {
  const [url, setUrl] = useState(initialUrl);
  const valid = isValidUrl(url);

  const handleSubmit = () => {
    if (valid && !loading) {
      onSubmit(url.trim());
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center w-full max-w-[640px] mx-auto px-8"
      custom={direction}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.h1
        className="text-[24px] font-medium text-gray-900 mb-6 tracking-[-0.01em] w-full text-center"
        variants={childVariants}
      >
        Enter your business website
      </motion.h1>

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
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          disabled={loading}
          autoFocus
        />
      </motion.div>

      <motion.div className="w-full mt-6" variants={childVariants}>
        <OnboardingButton
          active={valid}
          loading={loading}
          loadingText="Analyzing your business..."
          onClick={handleSubmit}
          disabled={!valid}
        >
          Get Started
        </OnboardingButton>
      </motion.div>

      <motion.div
        className="mt-auto pt-16 flex flex-col items-center gap-6"
        variants={childVariants}
      >
        <PaginationDots total={3} current={0} />
      </motion.div>
    </motion.div>
  );
}
