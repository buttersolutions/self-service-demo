'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import Color from 'color';
import { OnboardingInput, OnboardingButton, PaginationDots } from '../ui';
import { stepVariants, childVariants, popVariants } from '../constants';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  ColorPicker,
  ColorPickerSelection,
  ColorPickerHue,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerOutput,
} from '@/components/kibo-ui/color-picker';
import { useOnboarding } from '@/lib/demo-flow-context';
import type { BusinessData } from '../types';

export type { BusinessData } from '../types';

const MAX_COLORS = 3;

interface StepConfirmBusinessProps {
  direction: number;
  business: BusinessData;
  onConfirm: (data: { name: string; website: string; colors: string[] }) => void;
}

function rgbaToHex(rgba: number[]): string {
  const [r, g, b] = rgba.map((v) => Math.round(Math.max(0, Math.min(255, v))));
  return Color.rgb(r, g, b).hex();
}

function ColorSwatch({
  color,
  onChange,
  onRemove,
  canRemove,
}: {
  color: string;
  onChange: (hex: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const handlePickerChange = useCallback(
    (rgba: Parameters<typeof Color.rgb>[0]) => {
      onChange(rgbaToHex(rgba as number[]));
    },
    [onChange],
  );

  return (
    <Popover>
      <div className="relative group">
        <PopoverTrigger
          render={<button type="button" />}
          className="size-11 rounded-full border-[2.5px] border-white ring-1 ring-black/[0.08] cursor-pointer transition-transform hover:scale-110"
          style={{ backgroundColor: color }}
        />
        {canRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 size-4 rounded-full bg-gray-800 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="size-2.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-72 p-3 font-sans" side="bottom" align="center">
        <ColorPicker defaultValue={color} onChange={handlePickerChange}>
          <ColorPickerSelection className="h-32 rounded-lg" />
          <ColorPickerHue />
          <div className="flex items-center gap-2">
            <ColorPickerEyeDropper />
            <ColorPickerOutput />
            <ColorPickerFormat className="flex-1" />
          </div>
        </ColorPicker>
      </PopoverContent>
    </Popover>
  );
}

export function StepConfirmBusiness({ direction, business, onConfirm }: StepConfirmBusinessProps) {
  const { brandColorMap } = useOnboarding();
  const [name, setName] = useState(business.name);
  const [website, setWebsite] = useState(business.domain);
  const [colors, setColors] = useState<string[]>(
    business.brandColors.length > 0 ? business.brandColors.slice(0, MAX_COLORS) : ['#625CE4'],
  );

  const valid = name.trim().length > 0 && website.trim().length > 0;

  const handleConfirm = () => {
    if (valid) {
      onConfirm({ name: name.trim(), website: website.trim(), colors });
    }
  };

  const handleColorChange = (index: number, hex: string) => {
    setColors((prev) => prev.map((c, i) => (i === index ? hex : c)));
  };

  const handleAddColor = () => {
    if (colors.length < MAX_COLORS) {
      setColors((prev) => [...prev, '#cccccc']);
    }
  };

  const handleRemoveColor = (index: number) => {
    if (colors.length > 1) {
      setColors((prev) => prev.filter((_, i) => i !== index));
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
            className="w-full h-full flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: brandColorMap.primaryColor, color: brandColorMap.primaryTextColor }}
          >
            {business.name.charAt(0)}
          </div>
        )}
      </motion.div>

      <motion.h1
        className="text-[22px] font-bold text-gray-900 tracking-[-0.01em] mb-6 w-full text-center font-serif"
        variants={childVariants}
      >
        Is this you?
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

        <motion.div variants={childVariants}>
          <label className="block text-[13px] text-gray-500 mb-1.5 ml-1">Brand colors</label>
          <div className="flex items-center gap-3">
            <AnimatePresence initial={false}>
              {colors.map((color, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <ColorSwatch
                    color={color}
                    onChange={(hex) => handleColorChange(i, hex)}
                    onRemove={() => handleRemoveColor(i)}
                    canRemove={colors.length > 1}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {colors.length < MAX_COLORS && (
              <motion.button
                type="button"
                onClick={handleAddColor}
                className="size-11 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Plus className="size-4" />
              </motion.button>
            )}
          </div>
        </motion.div>
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
