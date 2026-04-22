'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Onboarding } from '@/components/onboarding/onboarding';
import { OnboardingFeedback } from '@/components/onboarding/onboarding-feedback';

function PageInner() {
  const params = useSearchParams();
  // Feedback mode is a dev/internal flow — gate it behind an extra `dev=1`
  // param so it isn't reachable from the public ?mode=feedback URL alone.
  const feedbackEnabled = params.get('mode') === 'feedback' && params.get('dev') === '1';
  return feedbackEnabled ? <OnboardingFeedback /> : <Onboarding />;
}

export default function HomePage() {
  return (
    <Suspense>
      <PageInner />
    </Suspense>
  );
}
