'use client';

import { motion } from 'framer-motion';
import { Star, TrendingUp, TrendingDown, Minus, Quote, ChevronRight } from 'lucide-react';
import type { GuestFeedbackReport, ReportFinding, ReportStrength, ReportQuote, PillarId } from '@/lib/types';

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const PILLAR_COLORS: Record<PillarId, string> = {
  P1: '#EF4444',
  P2: '#3B82F6',
  P3: '#F59E0B',
  P4: '#8B5CF6',
};

const SEVERITY_COLORS = ['#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444'];

interface GatheringFeedbackReportProps {
  report: GuestFeedbackReport;
  isActive?: boolean;
}

export function GatheringFeedbackReport({ report, isActive = true }: GatheringFeedbackReportProps) {
  if (!isActive) return null;

  const { metadata, executive_summary, quantitative_overview, strengths, findings, trend_analysis, recommendations, methodology, citations } = report;

  return (
    <div className="h-full overflow-y-auto px-6 py-8 [&::-webkit-scrollbar]:hidden">
      <div className="max-w-3xl mx-auto space-y-10">

        {/* Report header */}
        <motion.div {...fadeIn} className="text-center space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium">Guest Feedback Intelligence Report</p>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">{metadata.business_name}</h1>
          <p className="text-sm text-gray-500">
            {metadata.reviews_analyzed} reviews analysed from Google &middot; Overall {metadata.average_rating}/5 ({metadata.total_reviews} reviews)
            {metadata.locations_total > 1 && ` · ${metadata.locations_sampled} of ${metadata.locations_total} locations`}
          </p>
          <p className="text-xs text-gray-400">{metadata.analysis_date}</p>
          {metadata.report_type === 'preliminary' && (
            <div className="inline-block mt-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              Preliminary Insights — limited review data
            </div>
          )}
        </motion.div>

        {/* Executive Summary */}
        {executive_summary && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.1 }}>
            <SectionHeading>Executive Summary</SectionHeading>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-[15px] text-gray-700 leading-relaxed font-serif">{executive_summary}</p>
            </div>
          </motion.section>
        )}

        {/* Quantitative Overview */}
        {quantitative_overview && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.15 }}>
            <SectionHeading>Quantitative Overview</SectionHeading>
            <div className="grid grid-cols-2 gap-4">
              {/* Rating distribution */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rating Distribution</h4>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = quantitative_overview.rating_distribution[String(star)] ?? 0;
                    const total = Object.values(quantitative_overview.rating_distribution).reduce((s, v) => s + v, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-right text-gray-500">{star}</span>
                        <Star className="size-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-gray-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trend + response rate */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent vs Lifetime</h4>
                  <div className="flex items-center gap-2">
                    {quantitative_overview.trend.direction === 'improving' && <TrendingUp className="size-5 text-green-500" />}
                    {quantitative_overview.trend.direction === 'declining' && <TrendingDown className="size-5 text-red-500" />}
                    {quantitative_overview.trend.direction === 'stable' && <Minus className="size-5 text-gray-400" />}
                    <span className="text-lg font-bold text-gray-900">{quantitative_overview.trend.recent_sample_avg}</span>
                    <span className="text-sm text-gray-400">vs {quantitative_overview.trend.overall_lifetime_avg} lifetime</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Last {quantitative_overview.trend.sample_size} reviews</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owner Response Rate</h4>
                  <span className="text-lg font-bold text-gray-900">{Math.round(quantitative_overview.owner_response_rate * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Pillar summary */}
            {quantitative_overview.pillar_summary.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {quantitative_overview.pillar_summary.filter((p) => p.reviews_impacted > 0).map((pillar) => (
                  <div key={pillar.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="size-2.5 rounded-full" style={{ backgroundColor: PILLAR_COLORS[pillar.id] }} />
                      <span className="text-xs font-semibold text-gray-700">{pillar.label}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{pillar.reviews_impacted}</span>
                    <span className="text-xs text-gray-400 ml-1">reviews impacted</span>
                    <span className="text-xs text-gray-400 block">{Math.round(pillar.pct_of_negative * 100)}% of negative reviews</span>
                  </div>
                ))}
              </div>
            )}

            {/* Category heatmap */}
            {quantitative_overview.category_heatmap.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Category Heatmap</h4>
                <div className="space-y-2">
                  {quantitative_overview.category_heatmap
                    .sort((a, b) => b.total - a.total)
                    .map((cat) => (
                      <div key={cat.id} className="flex items-center gap-3 text-xs">
                        <span className="w-48 text-gray-600 truncate">{cat.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (cat.total / Math.max(1, quantitative_overview.category_heatmap[0]?.total ?? 1)) * 100)}%`,
                              backgroundColor: SEVERITY_COLORS[Math.min(4, Math.round(cat.avg_severity) - 1)] ?? '#94A3B8',
                            }}
                          />
                        </div>
                        <span className="w-6 text-right text-gray-500">{cat.total}</span>
                        <span className="w-12 text-right text-gray-400">{cat.avg_severity}/5</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* Strengths */}
        {strengths.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.2 }}>
            <SectionHeading>Strengths</SectionHeading>
            <div className="space-y-4">
              {strengths.map((strength, i) => (
                <StrengthCard key={i} strength={strength} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.25 }}>
            <SectionHeading>Gap Analysis — Core Findings</SectionHeading>
            <div className="space-y-6">
              {findings.map((finding, i) => (
                <FindingCard key={i} finding={finding} index={i + 1} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Trend Analysis */}
        {trend_analysis && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.3 }}>
            <SectionHeading>Trend Analysis</SectionHeading>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-[15px] text-gray-700 leading-relaxed font-serif">{trend_analysis}</p>
            </div>
          </motion.section>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.35 }}>
            <SectionHeading>Recommended Interventions</SectionHeading>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div key={rec.priority} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="size-7 rounded-lg bg-[#625CE4] text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                      {rec.priority}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{rec.description}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {rec.pillar_ids.map((pid) => (
                          <span key={pid} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: PILLAR_COLORS[pid] + '15', color: PILLAR_COLORS[pid] }}>
                            {pid}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Citations / Footnotes */}
        {citations && citations.length > 0 && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.38 }}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">References</h4>
              <ol className="space-y-2 text-xs text-gray-600">
                {citations.sort((a, b) => a.id - b.id).map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span className="font-semibold text-[#625CE4] shrink-0">[{c.id}]</span>
                    <div>
                      <span className="text-gray-700">{c.source}</span>
                      {c.finding && <span className="text-gray-500"> — {c.finding}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </motion.section>
        )}

        {/* Methodology */}
        {methodology && (
          <motion.section {...fadeIn} transition={{ ...fadeIn.transition, delay: 0.4 }}>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Methodology</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{methodology}</p>
            </div>
          </motion.section>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-gray-900 font-serif mb-3">{children}</h2>;
}

function QuoteBlock({ quote }: { quote: ReportQuote }) {
  return (
    <div className="flex gap-2.5 py-2">
      <Quote className="size-4 text-gray-300 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-gray-600 italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {'★'.repeat(quote.rating)}{'☆'.repeat(5 - quote.rating)}
          {quote.date && ` · ${quote.date}`}
        </p>
      </div>
    </div>
  );
}

function StrengthCard({ strength }: { strength: ReportStrength }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-900 mb-1">{strength.title}</h4>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{strength.commentary}</p>
      {strength.quotes.length > 0 && (
        <div className="border-t border-gray-100 pt-2 space-y-1">
          {strength.quotes.slice(0, 3).map((q, i) => (
            <QuoteBlock key={i} quote={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function FindingCard({ finding, index }: { finding: ReportFinding; index: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#625CE4]">Finding {index}</span>
          <ChevronRight className="size-3 text-gray-300" />
          <span className="text-xs text-gray-400">{finding.category_id}</span>
        </div>
        <h3 className="text-base font-semibold text-gray-900 mt-1 font-serif">{finding.title}</h3>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <Label>The Pattern</Label>
          <p className="text-sm text-gray-700 leading-relaxed">{finding.pattern}</p>
        </div>

        {finding.quotes.length > 0 && (
          <div>
            <Label>Guest Voice</Label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {finding.quotes.slice(0, 5).map((q, i) => (
                <QuoteBlock key={i} quote={q} />
              ))}
            </div>
          </div>
        )}

        {finding.root_cause && (
          <div>
            <Label>Root Cause Analysis</Label>
            <p className="text-sm text-gray-700 leading-relaxed font-serif">{finding.root_cause}</p>
          </div>
        )}

        {finding.impact && (
          <div>
            <Label>Impact</Label>
            <p className="text-sm text-gray-700 leading-relaxed">{finding.impact}</p>
          </div>
        )}

        {finding.how_addressed && (
          <div>
            <Label>How It&apos;s Addressed</Label>
            <p className="text-sm text-gray-700 leading-relaxed">{finding.how_addressed}</p>
          </div>
        )}

        {finding.current_vs_desired.length > 0 && (
          <div>
            <Label>Current State → Desired State</Label>
            <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-2 bg-gray-50 font-semibold text-gray-500">
                <div className="px-3 py-2 border-r border-gray-200">Current State</div>
                <div className="px-3 py-2">Desired State</div>
              </div>
              {finding.current_vs_desired.map((row, i) => (
                <div key={i} className="grid grid-cols-2 border-t border-gray-200">
                  <div className="px-3 py-2.5 text-gray-600 border-r border-gray-200">{row.current}</div>
                  <div className="px-3 py-2.5 text-gray-700">{row.desired}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{children}</p>;
}
