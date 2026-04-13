'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Download, Link2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useOnboarding } from '@/lib/demo-flow-context';
import { GatheringFeedbackReport } from '../animations/gathering-feedback-report';
import { StepConfirm } from './step-confirm';
import { ProgressBar } from '../ui/progress-bar';
import { exportReportPdf } from '@/lib/export-report-pdf';
import type { LocationItem } from '../types';

interface StepFeedbackConfirmProps {
  onConfirm: (data: { name: string; website: string; colors: string[]; locations: LocationItem[] }) => void;
}

/**
 * Split layout shown after the feedback report is ready:
 * - Left: the GuestFeedbackReport (continues displaying)
 * - Right: a sliding-in branding confirmation panel (reuses StepConfirm)
 */
export function StepFeedbackConfirm({ onConfirm }: StepFeedbackConfirmProps) {
  const { state } = useOnboarding();
  const report = state.gatheringData.guestFeedbackReport;
  const reportRef = useRef<HTMLDivElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    const businessName = state.business?.name ?? 'report';
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await exportReportPdf(reportRef.current, `guest-feedback-${slug}.pdf`);
  };

  const handleCopyLink = () => {
    if (!state.reportId) return;
    const url = `${window.location.origin}/report/${state.reportId}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <div className="relative w-full h-dvh bg-gray-50/40 overflow-hidden">
      {/* Report — stays full-width and centered, hidden on mobile */}
      <motion.div
        ref={reportRef}
        className="hidden md:block absolute inset-0 overflow-y-auto [&::-webkit-scrollbar]:hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
      >
        {report && <GatheringFeedbackReport report={report} isActive />}
      </motion.div>

      {/* Right: branding confirm panel — overlays from right on desktop, full width on mobile */}
      <motion.div
        className="relative md:absolute md:right-0 md:top-0 w-full md:w-[440px] h-full bg-white md:border-l border-gray-200 md:shadow-2xl overflow-y-auto [&::-webkit-scrollbar]:hidden z-10"
        initial={{ x: 440, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      >
        {/* Bridge copy + findings recap */}
        <div className="px-6 pt-8 pb-6 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">
            We've identified the patterns.<br />
            Let's build your team's response.
          </h3>

          {report?.findings && report.findings.length > 0 && (
            <div className="mt-4 space-y-3">
              {report.findings.map((finding, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-gray-900 mb-1">{finding.title}</p>
                  {finding.current_vs_desired.map((row, j) => (
                    <div key={j} className="grid grid-cols-[1fr_auto_1fr] gap-1.5 text-[11px] leading-tight mb-1">
                      <span className="text-gray-400">{row.current}</span>
                      <ArrowRight className="size-3 text-gray-300 mt-0.5 shrink-0" />
                      <span className="text-gray-700">{row.desired}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <Download className="size-3.5" />
              Download PDF
            </button>
            {state.reportId && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                {linkCopied ? <Check className="size-3.5 text-emerald-500" /> : <Link2 className="size-3.5" />}
                {linkCopied ? 'Copied!' : 'Copy link'}
              </button>
            )}
          </div>
        </div>

        <div className="py-8 px-2">
          <StepConfirm direction={1} onConfirm={onConfirm} hideProgressBar />
        </div>
      </motion.div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-xl px-4 sm:px-8">
        <ProgressBar current={2} variant="feedback" />
      </div>
    </div>
  );
}
