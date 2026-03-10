/**
 * Live Simulation — Full-screen animated attack replay
 * 45-second cinematic demo of incident detection and containment
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { getQuickDemoResult } from '../../data/quickDemoResult';
import { ArchitectureCanvas } from './ArchitectureCanvas';
import { EventFeed } from './EventFeed';
import { DetectionBar } from './DetectionBar';
import { useSimulationNarrator } from './SimulationNarrator';

type DetStep = 'detecting' | 'temporal' | 'risk' | 'remediation' | 'contained';
type AttackerPos = 'internet' | 'iam' | 'ec2' | 's3' | 'contained' | null;

const NARRATIONS: Record<string, string[]> = {
  'crypto-mining': [
    'An unknown actor has assumed the contractor-temp role with administrator access.',
    'Security group modified. SSH exposed to the internet.',
    'Three GPU instances launched. Possible cryptocurrency mining.',
    'Nova Sentinel detected. Launching autonomous response.',
    'Incident contained. Role session revoked. Instances terminated.',
  ],
  'data-exfiltration': [
    'Sensitive data accessed from the company bucket.',
    'Financial records downloaded. Potential data breach.',
    'Nova Sentinel detected. Initiating containment.',
    'Access revoked. Bucket policy updated.',
  ],
  'privilege-escalation': [
    'Limited user assumed the admin role.',
    'Backdoor account created with full access.',
    'Nova Sentinel detected privilege escalation.',
    'Backdoor deleted. Admin role restricted.',
  ],
  'unauthorized-access': [
    'External IP attempted role assumption.',
    'Production API keys downloaded from secrets bucket.',
    'Nova Sentinel detected. Credentials compromised.',
    'Access revoked. Key rotation initiated.',
  ],
};

interface LiveSimulationProps {
  scenarioId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const LiveSimulation: React.FC<LiveSimulationProps> = ({ scenarioId, onComplete, onSkip }) => {
  const data = getQuickDemoResult(scenarioId);
  const events = (data.results?.timeline?.events || []).sort(
    (a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || '')
  );
  const getAttackerPosForEvent = (idx: number): AttackerPos => {
    if (scenarioId === 'crypto-mining') {
      if (idx < 2) return 'internet';
      if (idx < 4) return 'iam';
      return 'ec2';
    }
    if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') {
      if (idx < 1) return 'internet';
      return 's3';
    }
    if (scenarioId === 'privilege-escalation') {
      if (idx < 2) return 'iam';
      return 'iam';
    }
    return 'internet';
  };

  const [simTime, setSimTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const lastNarrationRef = useRef(-1);
  const { speak, stop } = useSimulationNarrator(muted ? 0 : volume);

  // Derive all state from simTime (ms)
  const phase = simTime < 3000 ? 0 : simTime < 5000 ? 1 : 2;
  const visibleEvents = phase >= 2 ? Math.min(Math.floor((simTime - 5000) / 4000), events.length) : 0;
  const detThreshold = scenarioId === 'crypto-mining' ? 5 : Math.min(3, events.length);
  const contained = simTime >= 43000;
  const detStep: DetStep =
    contained ? 'contained' :
    visibleEvents >= detThreshold && simTime >= 27000 ? (simTime >= 32000 ? (simTime >= 37000 ? 'remediation' : 'risk') : 'temporal') :
    'detecting';
  const remediationStep = simTime >= 37000 ? (simTime >= 40000 ? (simTime >= 43000 ? 3 : 2) : 1) : 0;
  const attackerPos: AttackerPos = contained ? 'contained' : phase >= 2 && visibleEvents > 0 ? getAttackerPosForEvent(visibleEvents - 1) : null;

  const compromised = new Set<string>();
  if (scenarioId === 'crypto-mining') {
    if (visibleEvents >= 2) compromised.add('iam');
    if (visibleEvents >= 3) compromised.add('sg');
    if (visibleEvents >= 4) compromised.add('ec2');
  }
  if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') {
    if (visibleEvents >= 1) compromised.add('s3');
  }
  if (scenarioId === 'privilege-escalation' && visibleEvents >= 1) compromised.add('iam');

  const scenarioName = scenarioId === 'crypto-mining' ? 'Cryptocurrency Mining Attack' :
    scenarioId === 'data-exfiltration' ? 'Data Exfiltration' :
    scenarioId === 'privilege-escalation' ? 'Privilege Escalation' : 'Unauthorized Access';

  // Timeline driver
  useEffect(() => {
    const interval = setInterval(() => {
      setSimTime((t) => Math.min(t + 100 * speed, 50000));
    }, 100);
    return () => clearInterval(interval);
  }, [speed]);

  // Show complete button
  useEffect(() => {
    if (simTime >= 47000) setShowComplete(true);
  }, [simTime]);

  // Narration
  useEffect(() => {
    const narrations = NARRATIONS[scenarioId] || NARRATIONS['crypto-mining'];
    const idx = visibleEvents - 1;
    if (idx >= 0 && idx < narrations.length && idx !== lastNarrationRef.current) {
      lastNarrationRef.current = idx;
      speak(narrations[idx]);
    }
    if (contained && lastNarrationRef.current !== 999) {
      lastNarrationRef.current = 999;
      speak('Incident contained. Role session revoked. Instances terminated.');
    }
  }, [visibleEvents, contained, scenarioId, speak]);

  useEffect(() => () => stop(), [stop]);

  const riskLevel = visibleEvents >= 5 ? 'CRITICAL' : visibleEvents >= 3 ? 'HIGH' : visibleEvents >= 1 ? 'MEDIUM' : 'LOW';

  // Real-time attack cost ticker: ~$0.20/sec during attack, stops at containment
  const attackStartMs = 5000; // when events start
  const attackDurationMs = Math.max(0, simTime - attackStartMs);
  const costRatePerSec = 0.2;
  const liveCost = contained ? 0 : Math.min(2400, Math.round(attackDurationMs / 1000 * costRatePerSec * 100) / 100);
  const projectedDailyCost = 2400; // savings when contained (avoided cost)

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/20">
      {/* Subtle ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] pointer-events-none" />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        {/* Volume */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-600/80 bg-slate-900/60 backdrop-blur-sm px-2 py-1.5">
          <button
            onClick={() => setMuted((m) => !m)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {!muted && (
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-14 h-1 accent-indigo-500 cursor-pointer"
              title="Volume"
            />
          )}
        </div>
        <div className="flex rounded-xl overflow-hidden border border-slate-600/80 bg-slate-900/60 backdrop-blur-sm shadow-lg">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-2 text-xs font-semibold transition-all ${speed === s ? 'bg-indigo-600 text-white shadow-inner' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              {s}x
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onSkip(); }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
        >
          Skip to Results
        </a>
      </div>

      {/* Metrics */}
      <div className="absolute top-4 left-4 flex gap-3 z-10">
        {[
          { label: 'Time', value: `${Math.floor(simTime / 1000)}s`, mono: true },
          { label: 'Events', value: `${visibleEvents}/${events.length}`, mono: true },
          { label: 'Risk', value: contained ? 'CONTAINED' : riskLevel, mono: false, highlight: contained ? 'text-emerald-400' : riskLevel === 'CRITICAL' ? 'text-red-400' : riskLevel === 'HIGH' ? 'text-orange-400' : 'text-amber-400' },
          {
            label: contained ? 'Savings' : 'Cost',
            value: contained ? `$${projectedDailyCost.toLocaleString()}/day` : `$${liveCost.toFixed(2)}`,
            mono: true,
            highlight: contained ? 'text-emerald-400' : 'text-rose-400',
            sub: contained ? 'avoided' : 'accumulating',
          },
        ].map((m) => (
          <div key={m.label} className="rounded-xl px-4 py-2.5 bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 shadow-lg min-w-[80px]">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
            <p className={`text-sm font-bold ${m.mono ? 'font-mono' : ''} ${m.highlight || 'text-white'}`}>{m.value}</p>
            {(m as { sub?: string }).sub && <p className="text-[9px] text-slate-500 mt-0.5">{(m as { sub: string }).sub}</p>}
          </div>
        ))}
      </div>

      {/* Title + value hint */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center"
          >
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Simulating</p>
            <p className="text-lg font-bold text-white tracking-tight">{scenarioName}</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-2xl mx-auto">
              <strong className="text-slate-400">What this does:</strong> Shows the attack moving through your AWS resources (Internet → IAM → EC2/S3) while Aria narrates. The Event Feed logs each CloudTrail event. When Nova detects the threat, the pipeline activates and contains it. Use this for demos — then click &quot;View Full Analysis&quot; for the full report.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 pt-16 pb-24 min-h-0">
        {/* Architecture (hidden on mobile) */}
        <div className="flex-1 min-w-0 hidden md:block overflow-visible">
          <ArchitectureCanvas
            scenarioId={scenarioId}
            attackerPosition={attackerPos}
            compromisedResources={compromised}
            remediationStep={remediationStep}
          />
        </div>
        {/* Event feed */}
        <div className="w-[300px] shrink-0">
          <EventFeed
            events={events.map((e: any) => ({ timestamp: e.timestamp, action: e.action, resource: e.resource, severity: e.severity || 'MEDIUM' }))}
            visibleCount={visibleEvents}
          />
        </div>
      </div>

      {/* Detection bar */}
      <DetectionBar step={detStep} />

      {/* Contained banner */}
      <AnimatePresence>
        {contained && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 20 }}
              className="relative px-12 py-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold text-2xl tracking-tight shadow-2xl shadow-emerald-500/30 border-2 border-emerald-400/30"
            >
              INCIDENT CONTAINED
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete CTA */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30"
          >
            <button
              onClick={onComplete}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-xl shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-[1.02]"
            >
              View Full Analysis
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
