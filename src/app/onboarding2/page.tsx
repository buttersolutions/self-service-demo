'use client';

import Script from 'next/script';
import { OnboardingV2 } from '@/components/onboarding-v2/onboarding-v2';

export default function Onboarding2Page() {
  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
        strategy="afterInteractive"
      />
      <OnboardingV2 />
    </>
  );
}
