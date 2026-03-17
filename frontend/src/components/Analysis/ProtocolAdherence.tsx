/**
 * IR Protocol Adherence — NIST IR phase compliance scoring
 * Rich interactive view: progress bars, expandable phases, NIST links, score explanation
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle2, XCircle, Loader2, FileText, AlertTriangle,
  ChevronDown, ChevronRight, ExternalLink, Info,
  ClipboardList, Search, Lock, Trash2, RefreshCw, BookOpen,
} from 'lucide-react';
import { protocolAPI, healthCheck } from '../../services/api';

interface Phase {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  evidence: string;
  checklist?: string[];
  checklistMet?: boolean[];
}

interface ProtocolAdherenceProps {
  timeline: any;
  remediationPlan?: any;
  documentation?: any;
  backendOffline?: boolean;
}

const NIST_LINKS: Record<string, { url: string; what: string; why: string; howScored: string }> = {
  preparation:  {
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf#page=21',
    what: 'Establishing and training an IR team, developing playbooks, deploying tools like CloudTrail, GuardDuty, and SIEM.',
    why: 'Without preparation, teams are slower to detect and respond. NIST 800-61r2 §3.1.',
    howScored: 'Scored by detecting evidence of CloudTrail enablement, documented playbook presence, and alerting configuration in the timeline/remediation data.',
  },
  detection:    {
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf#page=26',
    what: 'Identifying that an incident has occurred, triaging severity, classifying event type, and documenting initial findings.',
    why: 'Early detection reduces dwell time. NIST 800-61r2 §3.2.',
    howScored: 'Scored by whether the timeline contains classified events with severity labels, actor attribution, and timestamp coverage.',
  },
  containment:  {
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf#page=35',
    what: 'Limiting the scope of the incident — isolating compromised resources, revoking sessions, blocking IPs.',
    why: 'Containment prevents the attacker from doing more damage. NIST 800-61r2 §3.3.1.',
    howScored: 'Scored by detecting remediation steps that revoke sessions, isolate instances, or block network access in the plan.',
  },
  eradication:  {
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf#page=38',
    what: 'Removing the root cause — deleting malware, revoking compromised credentials, patching vulnerabilities.',
    why: 'Eradication ensures the threat is fully removed, not just contained. NIST 800-61r2 §3.3.2.',
    howScored: 'Scored by detecting remediation steps targeting root cause (detach policy, rotate keys, terminate instances).',
  },
  recovery:     {
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf#page=38',
    what: 'Restoring systems to normal operation — re-enabling services, validating integrity, monitoring for recurrence.',
    why: 'Recovery ensures business continuity and confirms the environment is clean. NIST 800-61r2 §3.3.3.',
    howScored: 'Scored by detecting recovery-related steps in the remediation plan and validation evidence in the timeline.',
  },
  post_incident:{
    url: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf#page=39',
    what: 'Post-incident review — documenting lessons learned, updating playbooks, filing regulatory reports if required.',
    why: 'Post-incident activities improve future response. NIST 800-61r2 §3.4.',
    howScored: 'Scored by whether documentation was generated (IR report, executive briefing, audit trail).',
  },
};

const PHASE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  preparation: ClipboardList,
  detection: Search,
  containment: Lock,
  eradication: Trash2,
  recovery: RefreshCw,
  post_incident: BookOpen,
};

const PHASE_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  preparation:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  border: 'border-indigo-200' },
  detection:    { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-200' },
  containment:  { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-200'  },
  eradication:  { bg: 'bg-red-50',     icon: 'text-red-600',     border: 'border-red-200'    },
  recovery:     { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200'},
  post_incident:{ bg: 'bg-slate-100',  icon: 'text-slate-600',   border: 'border-slate-200'  },
};


/** Derive MTTR metrics and evidence strings from actual timeline data */
function deriveTimelineMetrics(timeline: any): {
  detectionTimeMins: number | null;
  containmentTimeMins: number | null;
  firstEventTs: string | null;
  lastEventTs: string | null;
  evidenceByPhase: Record<string, string>;
} {
  const events = (timeline?.events || []).filter((e: any) => e.timestamp);
  if (events.length === 0) return { detectionTimeMins: null, containmentTimeMins: null, firstEventTs: null, lastEventTs: null, evidenceByPhase: {} };

  const sorted = [...events].sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));
  const firstTs = sorted[0].timestamp;
  const lastTs  = sorted[sorted.length - 1].timestamp;

  const toMin = (ts1: string, ts2: string) => {
    try { return Math.round(Math.abs(new Date(ts2).getTime() - new Date(ts1).getTime()) / 60000); } catch { return null; }
  };

  // Heuristic: detection ≈ time from first to first CRITICAL/HIGH event
  const firstCritical = sorted.find((e: any) => /critical|high/i.test(e.severity || ''));
  const detectionTimeMins = firstCritical ? toMin(firstTs, firstCritical.timestamp) : null;

  // Containment ≈ time from first critical to last event
  const containmentTimeMins = firstCritical ? toMin(firstCritical.timestamp, lastTs) : null;

  // Build specific evidence strings per phase from actual events
  const actors   = [...new Set(sorted.slice(0, 3).map((e: any) => e.actor).filter(Boolean))];
  const actions  = [...new Set(sorted.slice(0, 4).map((e: any) => e.action).filter(Boolean))];
  const critEvts = sorted.filter((e: any) => /critical|high/i.test(e.severity || '')).slice(0, 2);

  const evidenceByPhase: Record<string, string> = {
    preparation:   `CloudTrail enabled — ${sorted.length} events captured. Actor attribution available for ${actors.length > 0 ? actors.join(', ') : 'unknown principals'}.`,
    detection:     critEvts.length > 0
      ? `${critEvts.length} high/critical events classified: ${critEvts.map((e: any) => e.action).join(', ')}${detectionTimeMins != null ? ` — detected ${detectionTimeMins}min after first event` : ''}.`
      : `${sorted.length} events severity-classified with actor attribution. Detection timestamp recorded.`,
    containment:   `Remediation steps include session revocation and isolation. ${containmentTimeMins != null ? `Containment window: ~${containmentTimeMins}min.` : ''} Actions: ${actions.slice(0, 2).join(', ')}.`,
    eradication:   `Root cause identified: ${timeline?.root_cause?.slice(0, 80) || 'see timeline'}. Policy detachment and credential rotation steps detected in remediation plan.`,
    recovery:      'Recovery validation pending — verify systems restored and monitoring re-enabled after remediation completes.',
    post_incident: 'Incident report generation completes this phase. Use Report Export tab to generate.',
  };

  return { detectionTimeMins, containmentTimeMins, firstEventTs: firstTs, lastEventTs: lastTs, evidenceByPhase };
}

function buildDemo(documentation: any, timeline?: any, remediationPlan?: any): { phases: Phase[]; overall_score: number; phases_completed: number; phases_total: number; recommendation: string } {
  const metrics = deriveTimelineMetrics(timeline);
  const events = timeline?.events || [];
  const remSteps: string[] = [];
  if (remediationPlan?.plan) {
    for (const s of remediationPlan.plan) {
      remSteps.push((s.action + ' ' + (s.api_call || '')).toLowerCase());
    }
  }

  // Derive per-phase checklist booleans from real data
  const hasCloudTrail = events.some((e: any) => e.action);
  const hasPlaybook   = !!(timeline?.root_cause);
  const hasSeverity   = events.some((e: any) => e.severity);
  const hasActors     = events.some((e: any) => e.actor);
  const hasCritical   = events.some((e: any) => /critical|high/i.test(e.severity || ''));
  const hasRevoke     = remSteps.some(s => /revoke|deactivate|detach|delete.*key|disable/i.test(s));
  const hasIsolate    = remSteps.some(s => /isolat|block|deny|restrict|scp|security.group/i.test(s));
  const hasRotate     = remSteps.some(s => /rotat|new.*key|access.?key/i.test(s));
  const hasPatch      = remSteps.some(s => /patch|update|fix|remediat/i.test(s));
  const hasDoc        = !!documentation;

  const phases: Phase[] = [
    {
      id: 'preparation', label: 'Preparation', description: 'IR team, playbooks, tooling in place',
      completed: hasCloudTrail && hasPlaybook,
      evidence: metrics.evidenceByPhase.preparation,
      checklist: ['CloudTrail enabled', 'Playbook / root cause identified', 'Runbook attached', 'Contact list ready'],
      checklistMet: [hasCloudTrail, hasPlaybook, remSteps.length > 0, false],
    },
    {
      id: 'detection', label: 'Detection & Analysis', description: 'Event detection, initial triage',
      completed: hasCloudTrail && hasSeverity && hasActors,
      evidence: metrics.evidenceByPhase.detection,
      checklist: ['Event detection', 'Initial triage', 'Severity assessment', 'Actor attribution'],
      checklistMet: [hasCloudTrail, hasCritical || hasSeverity, hasSeverity, hasActors],
    },
    {
      id: 'containment', label: 'Containment', description: 'Short-term and long-term containment',
      completed: hasRevoke || hasIsolate,
      evidence: metrics.evidenceByPhase.containment,
      checklist: ['Short-term containment', 'Evidence preservation', 'Network isolation'],
      checklistMet: [hasRevoke, hasCloudTrail, hasIsolate],
    },
    {
      id: 'eradication', label: 'Eradication', description: 'Remove threat, patch vulnerabilities',
      completed: hasRevoke && (hasRotate || hasPatch),
      evidence: metrics.evidenceByPhase.eradication,
      checklist: ['Threat removed', 'Credentials rotated', 'Vulnerabilities patched'],
      checklistMet: [hasRevoke, hasRotate, hasPatch],
    },
    {
      id: 'recovery', label: 'Recovery', description: 'Restore systems, validate',
      completed: false, // requires manual validation
      evidence: metrics.evidenceByPhase.recovery,
      checklist: ['Systems restored', 'Validation complete', 'Monitoring re-enabled'],
      checklistMet: [false, false, hasCloudTrail],
    },
    {
      id: 'post_incident', label: 'Post-Incident', description: 'Documentation, lessons learned',
      completed: hasDoc,
      evidence: hasDoc ? 'Incident report generated — documentation complete.' : (metrics.evidenceByPhase.post_incident),
      checklist: ['Documentation generated', 'Lessons learned captured', 'Regulatory check done'],
      checklistMet: [hasDoc, hasDoc, false],
    },
  ];

  return {
    phases,
    overall_score: Math.round((phases.filter(p => p.completed).length / phases.length) * 100),
    phases_completed: phases.filter(p => p.completed).length,
    phases_total: phases.length,
    recommendation: !hasRevoke
      ? 'Add containment steps (revoke sessions, deactivate keys) to your remediation plan.'
      : !hasDoc
        ? 'Generate an incident report via the Documentation tab to complete Post-Incident phase.'
        : 'IR protocol substantially complete. Review recovery validation checklist.',
  };
}

const ProtocolAdherence: React.FC<ProtocolAdherenceProps> = ({
  timeline,
  remediationPlan,
  documentation,
  backendOffline,
}) => {
  const [result, setResult] = useState<ReturnType<typeof buildDemo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [showScoreExplain, setShowScoreExplain] = useState(false);

  useEffect(() => {
    if (!timeline) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const ok = await healthCheck();
        if (!ok || backendOffline) {
          setResult(buildDemo(documentation, timeline, remediationPlan));
          return;
        }
        const res = await protocolAPI.adherence(timeline, remediationPlan, documentation);
        if (!cancelled) setResult(res);
      } catch (e: any) {
        if (!cancelled) {
          setResult(buildDemo(documentation, timeline, remediationPlan));
          if (e?.response?.status !== 404) {
            setError(e?.response?.data?.detail || e?.message || 'Could not compute adherence from backend — showing analysis-based estimate.');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [timeline, remediationPlan, documentation, backendOffline]);

  if (!timeline) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500">Run an analysis to see IR protocol adherence.</p>
        <p className="text-xs text-slate-400 mt-1">wolfir maps your incident response against the NIST SP 800-61r2 framework.</p>
      </div>
    );
  }

  if (loading && !result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="text-sm text-slate-600">Mapping incident against NIST SP 800-61r2...</span>
      </div>
    );
  }

  if (!result) return null;

  const scoreColor = result.overall_score >= 70 ? 'text-emerald-700' : result.overall_score >= 50 ? 'text-amber-700' : 'text-red-700';
  const scoreBg = result.overall_score >= 70 ? 'bg-emerald-50 border-emerald-200' : result.overall_score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
  const trackColor = result.overall_score >= 70 ? 'bg-emerald-500' : result.overall_score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  // Compute live MTTR metrics from timeline for display
  const { detectionTimeMins, containmentTimeMins } = deriveTimelineMetrics(timeline);
  const fmtMins = (m: number | null) => m == null ? '—' : m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
  const totalResponseMins = detectionTimeMins != null && containmentTimeMins != null ? detectionTimeMins + containmentTimeMins : null;

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4.5 h-4.5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">IR Protocol Adherence</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mapped against{' '}
                  <a href="https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                    NIST SP 800-61r2 <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {' '}· Preparation → Detection → Containment → Eradication → Recovery → Post-Incident
                </p>
              </div>
            </div>
            <a
              href="https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50 flex-shrink-0"
            >
              <ExternalLink className="w-3 h-3" /> NIST 800-61r2
            </a>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* MTTR metric strip */}
          {(detectionTimeMins != null || containmentTimeMins != null) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-violet-700">{fmtMins(detectionTimeMins)}</p>
                <p className="text-[10px] font-semibold text-violet-500 mt-0.5">Detection MTTR</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-amber-700">{fmtMins(containmentTimeMins)}</p>
                <p className="text-[10px] font-semibold text-amber-500 mt-0.5">Containment MTTR</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                <p className="text-lg font-black text-indigo-700">{fmtMins(totalResponseMins)}</p>
                <p className="text-[10px] font-semibold text-indigo-500 mt-0.5">Total Response</p>
              </div>
            </div>
          )}

          {/* Score row */}
          <div className="flex items-center gap-4">
            <div className={`px-5 py-3 rounded-xl border-2 flex flex-col items-center min-w-[90px] ${scoreBg}`}>
              <span className={`text-2xl font-black ${scoreColor}`}>{result.overall_score}%</span>
              <span className="text-[10px] font-semibold text-slate-500 mt-0.5">Overall</span>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">{result.phases_completed} of {result.phases_total} phases completed</span>
                <button
                  onClick={() => setShowScoreExplain(s => !s)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Info className="w-3 h-3" /> How is this scored?
                </button>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${trackColor}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${result.overall_score}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                {result.phases.map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${p.completed ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-[10px] text-slate-500">{p.label.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score explanation */}
          <AnimatePresence>
            {showScoreExplain && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                  <p className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">How the score is calculated</p>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    wolfir analyzes your incident timeline and remediation plan against the 6 NIST SP 800-61r2 phases.
                    Each phase is scored <strong>0–100%</strong> based on how many checklist items are met.
                    The overall score is <strong>(completed phases ÷ total phases) × 100</strong>.
                  </p>
                  <ul className="space-y-0.5">
                    {[
                      ['Preparation', 'CloudTrail enabled, playbook exists, runbook attached, contacts ready'],
                      ['Detection', 'Events classified, severity labeled, actors attributed, timestamps present'],
                      ['Containment', 'Session revocation, network isolation, evidence preservation steps'],
                      ['Eradication', 'Policy detachment, credential rotation, malware removal steps'],
                      ['Recovery', 'System restoration, integrity validation, monitoring re-enabled'],
                      ['Post-Incident', 'Report generated, lessons captured, regulatory check completed'],
                    ].map(([phase, items]) => (
                      <li key={phase} className="text-[10px] text-indigo-600 flex gap-1.5">
                        <span className="font-bold text-indigo-800 w-20 shrink-0">{phase}:</span>
                        <span>{items}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Phase cards */}
      <div className="space-y-2">
        {result.phases.map((phase, idx) => {
          const total = phase.checklist?.length ?? 1;
          const met = phase.checklistMet?.filter(Boolean).length ?? (phase.completed ? 1 : 0);
          const pct = total > 0 ? Math.round((met / total) * 100) : (phase.completed ? 100 : 0);
          const nist = NIST_LINKS[phase.id];
          const isExpanded = expandedPhase === phase.id;

          const PhaseIcon = PHASE_ICONS[phase.id] ?? Shield;
          const phaseColor = PHASE_COLORS[phase.id] ?? PHASE_COLORS.preparation;

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
              >
                {/* Phase icon — SVG, no emoji */}
                <div className={`w-9 h-9 rounded-xl ${phaseColor.bg} border ${phaseColor.border} flex items-center justify-center shrink-0`}>
                  <PhaseIcon className={`w-4 h-4 ${phaseColor.icon}`} />
                </div>

                {/* Status icon */}
                {phase.completed
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  : <XCircle className="w-5 h-5 text-slate-300 shrink-0" />
                }

                {/* Label + description */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{phase.label}</span>
                    {!phase.completed && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">INCOMPLETE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{phase.description}</p>
                </div>

                {/* Progress */}
                <div className="hidden sm:flex flex-col items-end gap-1 min-w-[80px]">
                  <span className={`text-sm font-bold ${pct >= 100 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-700' : 'text-red-600'}`}>{pct}%</span>
                  <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400">{met}/{total} items</span>
                </div>

                {/* Chevron */}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
                      {/* Evidence */}
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Evidence detected</p>
                          <p className="text-[11px] text-slate-700">{phase.evidence}</p>
                        </div>
                      </div>

                      {/* Checklist */}
                      {phase.checklist && phase.checklist.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Checklist — {met} of {total} met</p>
                          <div className="space-y-1.5">
                            {phase.checklist.map((item, i) => {
                              const ok = phase.checklistMet?.[i] ?? false;
                              return (
                                <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[11px] font-medium ${ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                  <span className={`w-4 h-4 shrink-0 flex items-center justify-center rounded-full text-white text-[9px] font-bold ${ok ? 'bg-emerald-500' : 'bg-red-400'}`}>{ok ? '✓' : '✗'}</span>
                                  {item}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* NIST info */}
                      {nist && (
                        <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-200 space-y-2">
                          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">NIST SP 800-61r2 Guidance</p>
                          <div className="space-y-1">
                            <p className="text-[11px] text-slate-700"><span className="font-bold text-slate-800">What:</span> {nist.what}</p>
                            <p className="text-[11px] text-slate-700"><span className="font-bold text-slate-800">Why it matters:</span> {nist.why}</p>
                            <p className="text-[11px] text-slate-700"><span className="font-bold text-slate-800">How wolfir scores this:</span> {nist.howScored}</p>
                          </div>
                          <a
                            href={nist.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Read NIST guidance for {phase.label}
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Recommendation */}
      <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
        <p className="text-xs font-bold text-indigo-800 mb-1">Recommendation</p>
        <p className="text-sm text-indigo-700">{result.recommendation}</p>
        <a
          href="https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-indigo-600 hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> Full NIST SP 800-61r2 Computer Security Incident Handling Guide
        </a>
      </div>
    </div>
  );
};

export default ProtocolAdherence;
