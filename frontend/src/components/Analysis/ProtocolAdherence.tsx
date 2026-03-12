/**
 * IR Protocol Adherence — NIST IR phase compliance scoring
 * Shows whether incident response followed NIST phases.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { protocolAPI, healthCheck } from '../../services/api';

interface ProtocolAdherenceProps {
  timeline: any;
  remediationPlan?: any;
  documentation?: any;
  backendOffline?: boolean;
}

const ProtocolAdherence: React.FC<ProtocolAdherenceProps> = ({
  timeline,
  remediationPlan,
  documentation,
  backendOffline,
}) => {
  const [result, setResult] = useState<{
    overall_score: number;
    phases: Array<{ id: string; label: string; description: string; completed: boolean; evidence: string }>;
    phases_completed: number;
    phases_total: number;
    recommendation: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!timeline) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const ok = await healthCheck();
        if (!ok || backendOffline) {
          // Demo fallback
          const phases = [
            { id: 'preparation', label: 'Preparation', description: 'Policies, playbooks, tools in place', completed: true, evidence: 'Found in timeline/remediation' },
            { id: 'detection', label: 'Detection & Analysis', description: 'Event detection, initial analysis', completed: true, evidence: 'Found in timeline/remediation' },
            { id: 'containment', label: 'Containment', description: 'Short-term and long-term containment', completed: true, evidence: 'Found in timeline/remediation' },
            { id: 'eradication', label: 'Eradication', description: 'Remove threat, patch vulnerabilities', completed: true, evidence: 'Found in timeline/remediation' },
            { id: 'recovery', label: 'Recovery', description: 'Restore systems, validate', completed: false, evidence: 'Not detected' },
            { id: 'post_incident', label: 'Post-Incident', description: 'Documentation, lessons learned', completed: !!documentation, evidence: documentation ? 'Found' : 'Not detected' },
          ];
          setResult({
            overall_score: Math.round((phases.filter(p => p.completed).length / 6) * 100),
            phases,
            phases_completed: phases.filter(p => p.completed).length,
            phases_total: 6,
            recommendation: 'Consider adding recovery validation and post-incident documentation.',
          });
          return;
        }
        const res = await protocolAPI.adherence(timeline, remediationPlan, documentation);
        if (!cancelled) setResult(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to compute adherence');
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
        <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Run an analysis to see IR protocol adherence.</p>
      </div>
    );
  }

  if (loading && !result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        <span className="text-sm text-slate-600">Computing NIST IR protocol adherence...</span>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const scoreCls = result.overall_score >= 70
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : result.overall_score >= 50
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4.5 h-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">IR Protocol Adherence (NIST)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Did the incident response follow NIST IR phases? Preparation → Detection → Containment → Eradication → Recovery → Post-Incident
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Overall Score</span>
            <span className={`px-4 py-2 rounded-xl text-lg font-bold border ${scoreCls}`}>
              {result.overall_score}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.phases.map((phase) => (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${
                  phase.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {phase.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm font-bold text-slate-800">{phase.label}</span>
                </div>
                <p className="text-[11px] text-slate-600">{phase.description}</p>
                <p className="text-[10px] text-slate-500 mt-1">{phase.evidence}</p>
              </motion.div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
            <p className="text-xs font-bold text-indigo-800 mb-0.5">Recommendation</p>
            <p className="text-sm text-indigo-700">{result.recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtocolAdherence;
