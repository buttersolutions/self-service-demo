'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { OnboardingInput, OnboardingButton } from '../ui';
import { stepVariants, childVariants } from '../constants';
import { Button } from '@/components/ui/button';

export interface LocationItem {
  id: string;
  name: string;
  address: string;
}

interface StepConfirmLocationsProps {
  direction: number;
  locations: LocationItem[];
  onConfirm: (locations: LocationItem[]) => void;
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
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);

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
      className="flex flex-col items-center w-full max-w-[640px] mx-auto px-8 max-h-[calc(100dvh-96px)]"
      custom={direction}
      variants={stepVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div className="w-full mb-6 shrink-0" variants={childVariants}>
        <h1 className="text-[22px] font-bold text-gray-900 tracking-[-0.01em] font-serif">
          3. Confirm your locations
        </h1>
        <p className="text-[14px] text-gray-500 mt-2 leading-relaxed">
          We found <span className="font-semibold text-gray-700">{initialLocations.length} locations</span> matching your business. They will be set up as workplaces in the app. Feel free to rename, remove, or add any that are missing.
        </p>
      </motion.div>

      <motion.div
        className="w-full overflow-y-auto min-h-0 space-y-3 pr-1 pb-4"
        variants={childVariants}
      >
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

      <motion.div
        className="w-full shrink-0 sticky bottom-0 z-10 bg-white rounded-2xl p-4 mt-4"
        variants={childVariants}
      >
        <OnboardingButton active={valid} disabled={!valid} onClick={() => onConfirm(locations)}>
          Get my branded app
        </OnboardingButton>
      </motion.div>
    </motion.div>
  );
}
