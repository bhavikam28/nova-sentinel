/**
 * Event Feed — Enriched CloudTrail event stream for Live Simulation
 * Shows MITRE technique IDs, plain-English explanations, and actor info
 */
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineEvent {
  timestamp: string;
  action: string;
  resource: string;
  severity: string;
  actor?: string;
}

interface EventFeedProps {
  events: TimelineEvent[];
  visibleCount: number;
  currentTechniqueId?: string | null;
}

const ACTION_META: Record<string, { mitre: string; what: string; icon: string }> = {
  AssumeRole:          { mitre: 'T1078', what: 'Attacker used stolen or compromised credentials to assume an IAM role — bypassing identity checks.', icon: '🔑' },
  CreateRole:          { mitre: 'T1098', what: 'A new IAM role was created — possible persistence mechanism for continued access.', icon: '👤' },
  CreateUser:          { mitre: 'T1136', what: 'A backdoor IAM user was created for persistent unauthorized access.', icon: '🧑‍💻' },
  AttachUserPolicy:    { mitre: 'T1098', what: 'AdministratorAccess policy attached — attacker now has full AWS account control.', icon: '🔓' },
  AttachRolePolicy:    { mitre: 'T1098', what: 'Elevated IAM policy attached to a role — privilege escalation confirmed.', icon: '⬆️' },
  RunInstances:        { mitre: 'T1578', what: 'GPU/compute instances launched for crypto-mining. Your AWS bill is accumulating.', icon: '⚡' },
  AuthorizeSecurityGroupIngress: { mitre: 'T1021', what: 'SSH port 22 exposed to 0.0.0.0/0 — attacker opened a backdoor to the internet.', icon: '🚪' },
  GetObject:           { mitre: 'T1530', what: 'Sensitive files downloaded from S3 — data exfiltration in progress.', icon: '📤' },
  PutObject:           { mitre: 'T1537', what: 'Data uploaded to an external storage target — exfiltration via cloud storage.', icon: '📁' },
  GetSecretValue:      { mitre: 'T1552', what: 'Secrets Manager accessed — production credentials or API keys retrieved.', icon: '🗝️' },
  DeleteTrail:         { mitre: 'T1562.008', what: 'CloudTrail trail deleted — attacker trying to erase their tracks.', icon: '🧹' },
  StopLogging:         { mitre: 'T1562.008', what: 'CloudTrail logging stopped — attacker is going dark, evading detection.', icon: '🔇' },
  InvokeModel:         { mitre: 'AML.T0051', what: 'Bedrock LLM invoked outside approved policy — Shadow AI or prompt injection risk.', icon: '🤖' },
  ConsoleLogin:        { mitre: 'T1078', what: 'Console login from external IP — potential credential compromise.', icon: '🖥️' },
  TerminateInstances:  { mitre: 'T1562', what: 'wolfir terminated the malicious compute instances — crypto mining stopped.', icon: '🛑' },
  DetachRolePolicy:    { mitre: 'T1098', what: 'wolfir detached the over-privileged IAM policy — least privilege restored.', icon: '✅' },
};

function getActionMeta(action: string) {
  const key = action?.split(':').pop() || action;
  for (const [k, v] of Object.entries(ACTION_META)) {
    if (key.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return null;
}

const SEV_CONFIG: Record<string, { border: string; badge: string; badgeText: string; glow: string }> = {
  CRITICAL: { border: 'border-l-red-500',    badge: 'bg-red-500/20 border-red-500/50 text-red-400',    badgeText: 'CRITICAL', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.2)]' },
  HIGH:     { border: 'border-l-orange-500', badge: 'bg-orange-500/20 border-orange-500/50 text-orange-400', badgeText: 'HIGH',  glow: 'shadow-[0_0_8px_rgba(249,115,22,0.15)]' },
  MEDIUM:   { border: 'border-l-amber-500',  badge: 'bg-amber-500/15 border-amber-500/40 text-amber-400',   badgeText: 'MEDIUM', glow: '' },
  LOW:      { border: 'border-l-emerald-500',badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400', badgeText: 'LOW', glow: '' },
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return ts?.slice(11, 19) || '—'; }
}

export const EventFeed: React.FC<EventFeedProps> = ({ events, visibleCount }) => {
  const visible = events.slice(0, visibleCount);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleCount]);

  const criticalCount = visible.filter(e => e.severity?.toUpperCase() === 'CRITICAL').length;
  const highCount = visible.filter(e => e.severity?.toUpperCase() === 'HIGH').length;

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden" style={{ background: 'rgba(2,6,23,0.85)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.6)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] font-black tracking-widest text-slate-300 uppercase">Event Feed</p>
          </div>
          <p className="text-[9px] text-slate-600 mt-0.5">CloudTrail · Live stream</p>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse">
              {criticalCount} CRIT
            </span>
          )}
          {highCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-500/15 border border-orange-500/30 text-orange-400">
              {highCount} HIGH
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            {visibleCount}/{events.length}
          </span>
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
            <p className="text-[10px] text-slate-600">Waiting for events...</p>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {visible.map((e, i) => {
            const sev = (e.severity || 'MEDIUM').toUpperCase();
            const cfg = SEV_CONFIG[sev] || SEV_CONFIG.MEDIUM;
            const meta = getActionMeta(e.action);
            const isLatest = i === visible.length - 1;
            return (
              <motion.div
                key={`${e.timestamp}-${i}`}
                initial={{ opacity: 0, x: 20, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`relative flex flex-col gap-1.5 p-2.5 rounded-lg border-l-2 ${cfg.border} ${isLatest ? cfg.glow : ''}`}
                style={{
                  background: isLatest ? 'rgba(30,27,75,0.4)' : 'rgba(15,23,42,0.6)',
                  border: isLatest ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(51,65,85,0.4)',
                  borderLeftWidth: 2,
                }}
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {meta && <span className="text-[12px]">{meta.icon}</span>}
                    <span className="text-[9px] font-mono text-slate-500 tabular-nums">{formatTime(e.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {meta && (
                      <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                        {meta.mitre}
                      </span>
                    )}
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${cfg.badge} ${sev === 'CRITICAL' ? 'animate-pulse' : ''}`}>
                      {cfg.badgeText}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <p className="text-[11px] font-bold text-white leading-tight">
                  {e.action?.split(':').pop() || e.action}
                </p>

                {/* Resource */}
                <p className="text-[9px] font-mono truncate" style={{ color: '#64748b' }}>
                  → {e.resource}
                </p>

                {/* What it means */}
                {meta && (
                  <p className="text-[9px] leading-relaxed mt-0.5" style={{ color: '#94a3b8' }}>
                    {meta.what}
                  </p>
                )}

                {/* Latest indicator */}
                {isLatest && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 relative" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
