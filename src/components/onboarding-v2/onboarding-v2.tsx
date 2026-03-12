'use client';

import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AllgravyLogo } from '@/components/ui/allgravy-logo';
import { StepUrlInput, StepConfirmBusiness, StepConfirmLocations } from './steps';
import { lookupBusiness, type MockBusinessV2, type BusinessLocationV2 } from '@/lib/mock-data-v2';

type Step = 'url' | 'confirm-business' | 'confirm-locations';

const floatRocket = {
  y: [0, -6, 0],
  rotate: [0, -2, 0],
  transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const },
};

const floatPineapple = {
  y: [0, -8, 0],
  rotate: [12, 16, 12],
  transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
};

export function OnboardingV2() {
  const [step, setStep] = useState<Step>('url');
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [business, setBusiness] = useState<MockBusinessV2 | null>(null);
  const [businessName, setBusinessName] = useState('');
  const directionRef = useRef(1);

  const goForward = (next: Step) => {
    directionRef.current = 1;
    setStep(next);
  };

  const goBack = (prev: Step) => {
    directionRef.current = -1;
    setStep(prev);
  };

  const handleUrlSubmit = useCallback(async (submittedUrl: string) => {
    setUrl(submittedUrl);
    setLoading(true);
    const result = await lookupBusiness(submittedUrl);
    setBusiness(result);
    setBusinessName(result.name);
    setLoading(false);
    goForward('confirm-business');
  }, []);

  const handleBusinessConfirm = useCallback(
    (data: { name: string; website: string; colors: string[] }) => {
      setBusinessName(data.name);
      if (business) {
        setBusiness({ ...business, domain: data.website, brandColors: data.colors });
      }
      goForward('confirm-locations');
    },
    [business],
  );

  const handleLocationsConfirm = useCallback((_locations: BusinessLocationV2[]) => {
    // Future: advance to next step
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'confirm-locations') {
      goBack('confirm-business');
    } else if (step === 'confirm-business') {
      goBack('url');
      setLoading(false);
    }
  }, [step]);

  const showBack = step !== 'url';

  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh bg-gray-50/40 py-12 font-sans overflow-hidden">
      <AnimatePresence>
        {showBack && (
          <motion.div
            className="fixed top-5 left-5 z-50"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="size-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {step === 'url' && (
          <motion.div
            key="allgravy-logo"
            className="fixed top-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <AllgravyLogo className="w-28" />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" custom={directionRef.current}>
        {step === 'url' && (
          <StepUrlInput
            key="step-url"
            direction={directionRef.current}
            initialUrl={url}
            onSubmit={handleUrlSubmit}
            loading={loading}
          />
        )}

        {step === 'confirm-business' && business && (
          <StepConfirmBusiness
            key="step-confirm-business"
            direction={directionRef.current}
            business={{ ...business, name: businessName }}
            onConfirm={handleBusinessConfirm}
          />
        )}

        {step === 'confirm-locations' && business && (
          <StepConfirmLocations
            key="step-confirm-locations"
            direction={directionRef.current}
            locations={business.locations}
            onConfirm={handleLocationsConfirm}
          />
        )}
      </AnimatePresence>

      <motion.img
        src="/ag-rocket.svg"
        alt=""
        className="fixed bottom-6 left-6 pointer-events-none select-none"
        animate={floatRocket}
      />
      <motion.img
        src="/ag-pineapple.svg"
        alt=""
        className="fixed top-12 right-12 pointer-events-none select-none"
        animate={floatPineapple}
      />
    </div>
  );
}
