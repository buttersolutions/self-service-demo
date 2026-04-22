'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Search, History, X } from 'lucide-react';
import { GatheringFeedbackReport } from '@/components/onboarding/animations/gathering-feedback-report';
import type { GuestFeedbackReport, CategorizedReview, ReviewInsight } from '@/lib/types';

/**
 * /gathering — Standalone testbed for the new Guest Feedback Intelligence Report.
 *
 * Enter a business via Google Places autocomplete → runs the full v2 pipeline
 * (segmented Apify scraping → Haiku 13-category classification → aggregation → Sonnet structured JSON)
 * and renders the report in real-time.
 */

interface PlaceResult {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
  rating?: number;
  userRatingCount?: number;
}

interface SSELog {
  time: number;
  event: string;
  detail: string;
}

export default function GatheringPage() {
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<GuestFeedbackReport | null>(null);
  const [logs, setLogs] = useState<SSELog[]>([]);
  const [stats, setStats] = useState({ reviews: 0, categorized: 0, insights: 0 });
  const [savedReports, setSavedReports] = useState<{ filename: string; report: GuestFeedbackReport }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingFilename, setViewingFilename] = useState<string | null>(null);
  const [stages, setStages] = useState<{ id: string; label: string; status: 'pending' | 'active' | 'done' }[]>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const initStages = useCallback(() => {
    setStages([
      { id: 'fetch', label: 'Fetching reviews from Google', status: 'pending' },
      { id: 'classify', label: 'Categorising reviews', status: 'pending' },
      { id: 'aggregate', label: 'Computing insights & themes', status: 'pending' },
      { id: 'select', label: 'Picking key themes', status: 'pending' },
      { id: 'findings', label: 'Writing findings', status: 'pending' },
      { id: 'strengths', label: 'Writing strengths', status: 'pending' },
      { id: 'recommendations', label: 'Drafting recommendations', status: 'pending' },
      { id: 'summary', label: 'Writing executive summary', status: 'pending' },
      { id: 'finalize', label: 'Assembling report', status: 'pending' },
    ]);
  }, []);

  const updateStage = useCallback((id: string, status: 'active' | 'done', label?: string) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, status, label: label ?? s.label } : s));
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const t0Ref = useRef(0);

  // Load saved reports
  const loadSavedReports = useCallback(async () => {
    try {
      const res = await fetch('/api/demo/scan/reports');
      const data = await res.json();
      setSavedReports(data.reports ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSavedReports(); }, [loadSavedReports]);

  // Init Google Places Autocomplete
  useEffect(() => {
    if (autocompleteRef.current) return;

    function init() {
      if (!window.google?.maps?.places || !inputRef.current) return false;

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment'],
        fields: ['place_id', 'name', 'formatted_address', 'geometry.location', 'rating', 'user_ratings_total'],
      });

      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (!p.place_id || !p.geometry?.location) return;
        const placeId = p.place_id;
        setPlace({
          placeId,
          displayName: p.name ?? '',
          formattedAddress: p.formatted_address ?? '',
          location: { lat: p.geometry.location.lat(), lng: p.geometry.location.lng() },
          rating: p.rating,
          userRatingCount: p.user_ratings_total,
        });
        setReport(null);
        setLogs([]);
        setStats({ reviews: 0, categorized: 0, insights: 0 });

        // Pre-warm the Apify actor so the real call hits a hot instance
        fetch('/api/reviews/prewarm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId }),
        }).catch(() => { /* fire and forget */ });
      });

      autocompleteRef.current = ac;
      return true;
    }

    if (init()) return;
    const interval = setInterval(() => { if (init()) clearInterval(interval); }, 200);
    return () => clearInterval(interval);
  }, []);

  const addLog = useCallback((event: string, detail: string) => {
    const time = (Date.now() - t0Ref.current) / 1000;
    setLogs((prev) => [...prev, { time, event, detail }]);
  }, []);

  // ── Haiku batch-size test ────────────────────────────────────────────
  const [haikuTestRunning, setHaikuTestRunning] = useState(false);
  const runHaikuTest = useCallback(async (batchSize: number | 'N') => {
    if (!place) return;
    setHaikuTestRunning(true);
    addLog('haiku-test', `Starting batch=${batchSize} test for ${place.displayName}...`);
    try {
      const res = await fetch('/api/demo/scan/haiku-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: place.placeId, batchSize }),
      });
      const data = await res.json();
      if (data.error) {
        addLog('error', `Haiku test failed: ${data.error}`);
      } else {
        addLog('haiku-test',
          `BATCH=${data.batchSize} | reviews=${data.reviewsTotal} | batches=${data.batchCount} | ` +
          `total=${(data.totalHaikuMs / 1000).toFixed(1)}s | ` +
          `slowest=${(data.slowestBatchMs / 1000).toFixed(1)}s | ` +
          `avg=${(data.avgBatchMs / 1000).toFixed(1)}s`
        );
      }
    } catch (err) {
      addLog('error', `Haiku test failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setHaikuTestRunning(false);
  }, [place, addLog]);

  // Run a full sweep of batch sizes one after another
  const runHaikuSweep = useCallback(async () => {
    if (!place) return;
    setHaikuTestRunning(true);
    addLog('haiku-test', `=== Starting full sweep for ${place.displayName} ===`);
    const sizes = [1, 2, 3, 5, 8, 10, 15, 20, 30];
    for (const size of sizes) {
      try {
        const res = await fetch('/api/demo/scan/haiku-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeId: place.placeId, batchSize: size }),
        });
        const data = await res.json();
        if (data.error) {
          addLog('error', `BATCH=${size} failed: ${data.error}`);
        } else {
          addLog('haiku-test',
            `BATCH=${data.batchSize} | batches=${data.batchCount} | ` +
            `total=${(data.totalHaikuMs / 1000).toFixed(1)}s | ` +
            `slowest=${(data.slowestBatchMs / 1000).toFixed(1)}s | ` +
            `avg=${(data.avgBatchMs / 1000).toFixed(1)}s`
          );
        }
      } catch (err) {
        addLog('error', `BATCH=${size} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    addLog('haiku-test', `=== Sweep complete ===`);
    setHaikuTestRunning(false);
  }, [place, addLog]);

  // ── Apify head-to-head test ──────────────────────────────────────────
  const [apifyTestRunning, setApifyTestRunning] = useState(false);
  const runApifyTest = useCallback(async (mode: 'multi' | 'single' | 'batched') => {
    if (!place) return;
    setApifyTestRunning(true);
    const t0 = Date.now();
    addLog('apify-test', `Starting ${mode} test for ${place.displayName}...`);

    try {
      const placeId = place.placeId;
      if (mode === 'multi') {
        // Option A: 2 parallel calls (newest + mostRelevant)
        const [a, b] = await Promise.all([
          fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeIds: [placeId], limit: 80, sort: 'newest' }) }).then(r => r.json()),
          fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeIds: [placeId], limit: 50, sort: 'most_relevant' }) }).then(r => r.json()),
        ]);
        const totalA = a.reviews?.length ?? 0;
        const totalB = b.reviews?.length ?? 0;
        addLog('apify-test', `MULTI: newest=${totalA}, mostRelevant=${totalB}, total=${totalA + totalB} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      } else if (mode === 'single') {
        // Option B: 1 call, newest only, limit 130
        const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeIds: [placeId], limit: 130 }) }).then(r => r.json());
        addLog('apify-test', `SINGLE: ${res.reviews?.length ?? 0} reviews in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      } else {
        // Option C: batched (only useful with multi-location — test with same ID twice as proxy)
        const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeIds: [placeId, placeId], limit: 80 }) }).then(r => r.json());
        addLog('apify-test', `BATCHED: ${res.reviews?.length ?? 0} reviews in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      }
    } catch (err) {
      addLog('error', `Apify test failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setApifyTestRunning(false);
  }, [place, addLog]);

  // Run the full pipeline
  const runAnalysis = useCallback(async () => {
    if (!place) return;
    setRunning(true);
    setReport(null);
    setLogs([]);
    setStats({ reviews: 0, categorized: 0, insights: 0 });
    setPipelineError(null);
    initStages();
    updateStage('fetch', 'active');
    t0Ref.current = Date.now();

    addLog('start', `Analyzing ${place.displayName}...`);

    try {
      const res = await fetch('/api/demo/scan/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locations: [{
            placeId: place.placeId,
            displayName: place.displayName,
            formattedAddress: place.formattedAddress,
            location: place.location,
            rating: place.rating,
            userRatingCount: place.userRatingCount,
          }],
        }),
      });

      if (!res.ok || !res.body) {
        addLog('error', `HTTP ${res.status}`);
        setRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary: number;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const message = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          let eventName = '';
          let eventData = '';

          for (const line of message.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            else if (line.startsWith('data: ')) eventData = line.slice(6);
          }

          if (!eventName && currentEvent) eventName = currentEvent;
          if (eventName) currentEvent = eventName;

          if (eventName && eventData) {
            try {
              const data = JSON.parse(eventData);

              if (eventName === 'reviews_progress') {
                const count = data.reviewCount ?? 0;
                setStats((prev) => {
                  const next = { ...prev, reviews: prev.reviews + count };
                  updateStage('fetch', 'active', `Found ${next.reviews} reviews`);
                  return next;
                });
                addLog('reviews', `${data.displayName}: +${count} (${data.sort})`);
              } else if (eventName === 'batch_analysis') {
                const catCount = data.categorized?.length ?? 0;
                const insightCount = data.insights?.length ?? 0;
                setStats((prev) => {
                  const next = {
                    ...prev,
                    categorized: prev.categorized + catCount,
                    insights: prev.insights + insightCount,
                  };
                  updateStage('fetch', 'done', `Found ${next.reviews} reviews`);
                  updateStage('classify', 'active', `Categorised ${next.categorized || next.insights} reviews`);
                  return next;
                });
                addLog('haiku', `+${catCount || insightCount} classified`);
              } else if (eventName === 'aggregates') {
                updateStage('classify', 'done');
                updateStage('aggregate', 'active', 'Computing insights & themes');
                addLog('aggregates', 'Computed');
              } else if (eventName === 'analysis') {
                // Detect v2 (has executive_summary) vs legacy (has headline)
                if (data.executive_summary !== undefined) {
                  setReport(data as GuestFeedbackReport);
                  updateStage('finalize', 'done');
                  addLog('report', `Full report: ${data.findings?.length ?? 0} findings, ${data.strengths?.length ?? 0} strengths`);
                } else {
                  addLog('legacy', `Legacy analysis: ${data.headline?.slice(0, 60) ?? ''}...`);
                }
              } else if (eventName === 'log') {
                const msg = data.message ?? '';
                // Drive stage transitions from log events emitted by the route
                if (msg.includes('Aggregated:')) {
                  updateStage('aggregate', 'done');
                  updateStage('select', 'active', 'Picking key themes');
                } else if (msg.includes('Selector: picked')) {
                  updateStage('select', 'done');
                } else if (msg.includes('Firing') && msg.includes('finding writers')) {
                  updateStage('findings', 'active', 'Writing findings');
                  updateStage('strengths', 'active', 'Writing strengths');
                  updateStage('recommendations', 'active', 'Drafting recommendations');
                  updateStage('summary', 'active', 'Writing executive summary');
                } else if (msg.includes('Finding writer') && msg.includes('chars in')) {
                  // Mark findings done when at least one finding writer completes
                  // (we can't easily track all of them without more state)
                  updateStage('findings', 'done');
                } else if (msg.includes('Strengths writer:') && msg.includes('chars in')) {
                  updateStage('strengths', 'done');
                } else if (msg.includes('Recommendations writer:') && msg.includes('chars in')) {
                  updateStage('recommendations', 'done');
                } else if (msg.includes('Exec summary writer:') && msg.includes('chars in')) {
                  updateStage('summary', 'done');
                  updateStage('finalize', 'active', 'Assembling report');
                }
                addLog(data.level === 'error' ? 'error' : 'log', msg);
              } else if (eventName === 'timing') {
                addLog('timing', `${data.label}: ${((data.endMs - data.startMs) / 1000).toFixed(1)}s — ${data.detail ?? ''}`);
              } else if (eventName === 'done') {
                addLog('done', `Pipeline complete`);
              } else if (eventName === 'error') {
                const msg = data.message ?? JSON.stringify(data);
                addLog('error', msg);
                setPipelineError(msg);
              } else if (eventName === 'analysis_update') {
                addLog('update', `Progressive update (${data.insights?.length ?? '?'} insights)`);
              }
            } catch {
              addLog('parse-error', eventName);
            }
          }
        }
      }
    } catch (err) {
      addLog('error', err instanceof Error ? err.message : String(err));
    }

    setRunning(false);
    loadSavedReports();
  }, [place, addLog, loadSavedReports]);

  return (
    <div className="min-h-dvh bg-gray-50 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Business</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for a restaurant, cafe, bar..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#625CE4]/30 focus:border-[#625CE4]"
                  />
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={!place || running}
                  className="px-5 py-2.5 rounded-lg bg-[#625CE4] text-white text-sm font-medium disabled:opacity-40 hover:bg-[#534CC3] transition-colors flex items-center gap-2"
                >
                  {running ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analysing...
                    </>
                  ) : (
                    'Run Analysis'
                  )}
                </button>
                <button
                  onClick={() => { loadSavedReports(); setShowHistory(!showHistory); }}
                  className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-1.5 relative"
                >
                  <History className="size-4" />
                  History
                  {savedReports.length > 0 && (
                    <span className="absolute -top-1 -right-1 size-5 rounded-full bg-[#625CE4] text-white text-[10px] font-bold flex items-center justify-center">
                      {savedReports.length}
                    </span>
                  )}
                </button>
              </div>
              {place && (
                <p className="text-xs text-gray-400 mt-1">
                  {place.displayName} — {place.formattedAddress}
                  {place.rating && (
                    <span className="ml-2 text-amber-600">★ {place.rating} ({place.userRatingCount?.toLocaleString() ?? '?'} reviews)</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Apify test harness */}
          {place && !running && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 mr-2">Apify test:</span>
              <button onClick={() => runApifyTest('multi')} disabled={apifyTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">A: Multi (2 calls)</button>
              <button onClick={() => runApifyTest('single')} disabled={apifyTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">B: Single (1 call)</button>
              <button onClick={() => runApifyTest('batched')} disabled={apifyTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">C: Batched</button>
              {apifyTestRunning && <Loader2 className="size-3 animate-spin text-gray-400" />}
            </div>
          )}

          {/* Haiku batch-size test harness */}
          {place && !running && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-gray-400 mr-2">Haiku batch test:</span>
              <button onClick={() => runHaikuTest(1)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">1</button>
              <button onClick={() => runHaikuTest(2)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">2</button>
              <button onClick={() => runHaikuTest(3)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">3</button>
              <button onClick={() => runHaikuTest(5)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">5</button>
              <button onClick={() => runHaikuTest(8)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">8</button>
              <button onClick={() => runHaikuTest(10)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">10</button>
              <button onClick={() => runHaikuTest(15)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">15</button>
              <button onClick={() => runHaikuTest(20)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">20</button>
              <button onClick={() => runHaikuTest(30)} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">30</button>
              <button onClick={() => runHaikuTest('N')} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40">all</button>
              <button onClick={runHaikuSweep} disabled={haikuTestRunning} className="px-3 py-1 rounded bg-[#625CE4] text-xs text-white hover:bg-[#534CC3] disabled:opacity-40 ml-2 font-medium">Run sweep</button>
              {haikuTestRunning && <Loader2 className="size-3 animate-spin text-gray-400" />}
            </div>
          )}

          {/* Live stats */}
          {running && (
            <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
              <span>Reviews: <strong className="text-gray-900">{stats.reviews}</strong></span>
              <span>Classified: <strong className="text-gray-900">{stats.categorized || stats.insights}</strong></span>
              <span className="flex items-center gap-1">
                <Loader2 className="size-3 animate-spin text-[#625CE4]" />
                Pipeline running...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="max-w-5xl mx-auto px-6 pb-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Saved Reports ({savedReports.length})</h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600"><X className="size-4" /></button>
            </div>
            {savedReports.length === 0 ? (
              <p className="text-xs text-gray-400">No saved reports yet. Run an analysis to generate one.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {savedReports.map(({ filename, report: savedReport }) => (
                  <button
                    key={filename}
                    onClick={() => {
                      setReport(savedReport);
                      setViewingFilename(filename);
                      setShowHistory(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-gray-50 transition-colors flex items-center justify-between ${viewingFilename === filename ? 'bg-[#625CE4]/5 border border-[#625CE4]/20' : ''}`}
                  >
                    <div>
                      <span className="font-medium text-gray-900">{savedReport.metadata?.business_name ?? 'Unknown'}</span>
                      <span className="text-gray-400 ml-2">
                        {savedReport.metadata?.reviews_analyzed ?? '?'} reviews &middot;
                        {savedReport.findings?.length ?? 0} findings &middot;
                        {savedReport.metadata?.average_rating ?? '?'}/5
                        {savedReport.metadata?.pipeline_duration_seconds && (
                          <> &middot; <span className="text-[#625CE4]">{savedReport.metadata.pipeline_duration_seconds}s</span></>
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">
                      {filename.replace('.json', '').split('_').slice(-2).join(' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-5xl mx-auto flex gap-4 px-6 py-6">
        {/* Report */}
        <div className="flex-1 min-w-0">
          {report ? (
            <div className="relative">
              {viewingFilename && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-t-xl px-4 py-2 text-xs text-amber-700">
                  <span>Viewing saved report: <strong className="font-mono">{viewingFilename}</strong></span>
                  <button onClick={() => { setReport(null); setViewingFilename(null); }} className="text-amber-500 hover:text-amber-700 underline">Clear</button>
                </div>
              )}
              <div className={`bg-white border border-gray-200 shadow-sm overflow-hidden ${viewingFilename ? 'rounded-b-xl' : 'rounded-xl'}`} style={{ height: 'calc(100dvh - 180px)' }}>
                <GatheringFeedbackReport report={report} isActive />
              </div>
            </div>
          ) : pipelineError ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 w-full max-w-md">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <X className="size-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">Analysis failed</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{pipelineError}</p>
                    <button
                      onClick={runAnalysis}
                      className="mt-4 px-4 py-2 rounded-lg bg-[#625CE4] text-white text-sm font-medium hover:bg-[#534CC3] transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : !running ? (
            <div className="flex items-center justify-center h-[60vh] text-gray-400 text-sm">
              Search for a business and click &ldquo;Run Analysis&rdquo; to generate a report.
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-md">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Generating your report</h3>
                <p className="text-xs text-gray-400 mb-6">This typically takes 60-90 seconds</p>
                <div className="space-y-3">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-3">
                      <div className="size-5 shrink-0 flex items-center justify-center">
                        {stage.status === 'done' && (
                          <div className="size-5 rounded-full bg-[#625CE4] flex items-center justify-center">
                            <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        {stage.status === 'active' && (
                          <Loader2 className="size-4 text-[#625CE4] animate-spin" />
                        )}
                        {stage.status === 'pending' && (
                          <div className="size-3 rounded-full border-2 border-gray-200" />
                        )}
                      </div>
                      <span className={`text-sm transition-colors ${
                        stage.status === 'done' ? 'text-gray-400' :
                        stage.status === 'active' ? 'text-gray-900 font-medium' :
                        'text-gray-300'
                      }`}>
                        {stage.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SSE log sidebar */}
        <div className="w-72 shrink-0">
          <div className="sticky top-[140px] bg-gray-900 rounded-xl text-xs font-mono text-gray-300 max-h-[calc(100dvh-180px)] overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <div className="px-3 py-2 border-b border-gray-700 text-[10px] uppercase tracking-wider text-gray-500">
              Pipeline Log
            </div>
            <div className="p-3 space-y-1">
              {logs.length === 0 && (
                <p className="text-gray-600">Waiting for pipeline...</p>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 shrink-0">{log.time.toFixed(1)}s</span>
                  <span className={
                    log.event === 'error' ? 'text-red-400' :
                    log.event === 'report' ? 'text-green-400' :
                    log.event === 'done' ? 'text-green-400' :
                    log.event === 'timing' ? 'text-yellow-400' :
                    log.event === 'log' ? 'text-blue-300' :
                    log.event === 'update' ? 'text-purple-400' :
                    'text-gray-400'
                  }>
                    [{log.event}]
                  </span>
                  <span className="text-gray-300 break-all">{log.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
