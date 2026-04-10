'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Onboarding } from '@/components/onboarding/onboarding';
import { OnboardingFeedback } from '@/components/onboarding/onboarding-feedback';

function PageInner() {
  const params = useSearchParams();
  const mode = params.get('mode');
  return mode === 'feedback' ? <OnboardingFeedback /> : <Onboarding />;
}

export default function HomePage() {
  return (
    <Suspense>
      <PageInner />
    </Suspense>
  );
}
