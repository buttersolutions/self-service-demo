'use client';

import { useOnboarding } from '@/lib/demo-flow-context';
import { GatheringBrandedApp } from '../animations/gathering-branded-app';

/**
 * Renders the branded app mockup as a standalone step shared by both onboarding flows.
 * No progress bar is rendered here — once the user reaches the mockup the entire viewport
 * is the device frames and the Get Started CTA.
 */
export function StepMockup() {
  const { state } = useOnboarding();
  const { business, locations, gatheringData } = state;

  return (
    <div className="relative w-full h-dvh">
      <GatheringBrandedApp
        businessName={business?.name ?? ''}
        logoUrl={business?.logoUrl ?? null}
        favicon={business?.favicon ?? null}
        locations={locations}
        photos={gatheringData.photos}
        isActive
      />
    </div>
  );
}
