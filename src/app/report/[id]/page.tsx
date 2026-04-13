'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { OnboardingProvider, useOnboarding } from '@/lib/demo-flow-context';
import { StepFeedbackConfirm } from '@/components/onboarding/steps/step-feedback-confirm';
import { StepMockup } from '@/components/onboarding/steps/step-mockup';
import type { GuestFeedbackReport } from '@/lib/types';
import type { BusinessData, LocationItem } from '@/components/onboarding/types';

interface ReportData {
  id: string;
  report: GuestFeedbackReport;
  business: BusinessData | null;
  locations: LocationItem[] | null;
  created_at: string;
}

export default function ReportPage() {
  return (
    <OnboardingProvider>
      <ReportPageInner />
    </OnboardingProvider>
  );
}

function ReportPageInner() {
  const params = useParams<{ id: string }>();
  const { state, dispatch } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated) return;

    fetch(`/api/reports/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Report not found' : 'Failed to load report');
        return res.json() as Promise<ReportData>;
      })
      .then((data) => {
        if (data.business) {
          dispatch({ type: 'SET_BUSINESS', payload: data.business });
        }
        if (data.locations) {
          dispatch({ type: 'SET_LOCATIONS', payload: data.locations });
        }
        dispatch({ type: 'SET_GUEST_FEEDBACK_REPORT', payload: data.report });
        dispatch({ type: 'SET_REPORT_ID', payload: data.id });
        dispatch({ type: 'SET_STEP', payload: 'feedback-confirm' });
        setHydrated(true);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load report');
        setLoading(false);
      });
  }, [params.id, dispatch, hydrated]);

  const handleConfirm = (data: { name: string; website: string; colors: string[]; locations: LocationItem[] }) => {
    dispatch({
      type: 'UPDATE_BUSINESS',
      payload: { name: data.name, domain: data.website, brandColors: data.colors },
    });
    dispatch({ type: 'SET_LOCATIONS', payload: data.locations });
    dispatch({ type: 'SET_STEP', payload: 'mockup' });
  };

  if (loading) {
    return (
      <div className="w-full h-dvh flex items-center justify-center bg-gray-50/40 font-sans">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading report…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-dvh flex items-center justify-center bg-gray-50/40 font-sans">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Report not found</h2>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (state.step === 'mockup' && state.business) {
    return (
      <div className="font-sans">
        <StepMockup />
      </div>
    );
  }

  return (
    <div className="font-sans">
      <StepFeedbackConfirm onConfirm={handleConfirm} />
    </div>
  );
}
