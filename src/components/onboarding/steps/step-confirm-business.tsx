'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { OnboardingInput, OnboardingButton, PaginationDots } from '../ui';
import { stepVariants, childVariants, popVariants } from '../constants';

export interface BusinessData {
  name: string;
  logoUrl: string | null;
  domain: string;
  brandColors: string[];
}

interface StepConfirmBusinessProps {
  direction: number;
  business: BusinessData;
  onConfirm: (data: { name: string; website: string; colors: string[] }) => void;
}

export function StepConfirmBusiness({ direction, business, onConfirm }: StepConfirmBusinessProps) {
  const [name, setName] = useState(business.name);
  const [website, setWebsite] = useState(business.domain);
  const [colors] = useState<string[]>(business.brandColors);

  const valid = name.trim().length > 0 && website.trim().length > 0;

  const handleConfirm = () => {
    if (valid) {
      onConfirm({ name: name.trim(), website: website.trim(), colors });
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
      <motion.div
        className="size-16 rounded-2xl overflow-hidden mb-8 border-2 border-gray-200/80"
        variants={popVariants}
      >
        {business.logoUrl ? (
          <img
            src={business.logoUrl}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: colors[0] === '#FFFFFF' ? '#625CE4' : colors[0] }}
          >
            {business.name.charAt(0)}
          </div>
        )}
      </motion.div>

      <motion.h1
        className="text-[22px] font-bold text-gray-900 tracking-[-0.01em] mb-6 w-full text-center font-serif"
        variants={childVariants}
      >
        2.Confirm your business details
      </motion.h1>

      <div className="w-full space-y-4">
        <motion.div variants={childVariants}>
          <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">Company name</label>
          <OnboardingInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your business name"
          />
        </motion.div>

        <motion.div variants={childVariants}>
          <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">Website</label>
          <OnboardingInput
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="yourbusiness.com"
          />
        </motion.div>

        {colors.some((c) => c !== '#FFFFFF') && (
          <motion.div variants={childVariants}>
            <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">Brand colors</label>
            <div className="flex items-center gap-3">
              {colors.map((color, i) => (
                <motion.div
                  key={i}
                  className="size-11 rounded-full border-[2.5px] border-white ring-1 ring-black/[0.08]"
                  style={{ backgroundColor: color }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <motion.div className="w-full mt-6" variants={childVariants}>
        <OnboardingButton active={valid} disabled={!valid} onClick={handleConfirm}>
          Confirm
        </OnboardingButton>
      </motion.div>

      <motion.div variants={childVariants}>
        <PaginationDots total={3} current={1} className="mt-auto pt-16" />
      </motion.div>
    </motion.div>
  );
}
