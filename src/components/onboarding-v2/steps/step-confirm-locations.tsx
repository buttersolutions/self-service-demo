'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { OnboardingInput, OnboardingButton, PaginationDots } from '../ui';
import { stepVariants, childVariants } from '../constants';
import { Button } from '@/components/ui/button';
import type { BusinessLocationV2 } from '@/lib/mock-data-v2';

interface StepConfirmLocationsProps {
  direction: number;
  locations: BusinessLocationV2[];
  onConfirm: (locations: BusinessLocationV2[]) => void;
}

const itemVariants = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12, height: 0, marginBottom: 0 },
};

let nextId = 100;

export function StepConfirmLocations({
  direction,
  locations: initialLocations,
  onConfirm,
}: StepConfirmLocationsProps) {
  const [locations, setLocations] = useState<BusinessLocationV2[]>(initialLocations);

  const updateName = (id: string, newName: string) => {
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, name: newName } : loc)),
    );
  };

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  const addLocation = () => {
    nextId += 1;
    setLocations((prev) => [
      ...prev,
      { id: `loc-new-${nextId}`, name: '', address: '' },
    ]);
  };

  const valid = locations.length > 0 && locations.every((loc) => loc.name.trim().length > 0);

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
        className="text-[22px] font-medium text-gray-900 tracking-[-0.01em] mb-8 w-full text-left"
        variants={childVariants}
      >
        Confirm your locations
      </motion.h1>

      <motion.div className="w-full space-y-3" variants={childVariants}>
        <AnimatePresence initial={false}>
          {locations.map((loc, i) => (
            <motion.div
              key={loc.id}
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="flex items-center gap-2"
            >
              <div className="flex-1">
                <OnboardingInput
                  value={loc.name}
                  onChange={(e) => updateName(loc.id, e.target.value)}
                  placeholder="Location name"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeLocation(loc.id)}>
                <X className="size-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.button
          onClick={addLocation}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors ml-1 cursor-pointer py-2"
          whileTap={{ scale: 0.97 }}
        >
          <Plus className="size-4" />
          Add location
        </motion.button>
      </motion.div>

      <motion.div className="w-full mt-6" variants={childVariants}>
        <OnboardingButton active={valid} disabled={!valid} onClick={() => onConfirm(locations)}>
          Confirm locations
        </OnboardingButton>
      </motion.div>

      <motion.div variants={childVariants}>
        <PaginationDots total={3} current={2} className="mt-auto pt-16" />
      </motion.div>
    </motion.div>
  );
}
