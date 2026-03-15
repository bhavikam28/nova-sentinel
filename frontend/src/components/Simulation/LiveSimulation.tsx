/**
 * Live Simulation — Premium Training / What-If Attack Simulation
 * Full upgrade: fixed vibration, Threat Intel panel, kill chain, interactive nodes,
 * richer narration, more what-if scenarios, detailed contained screen.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Volume2, VolumeX, ShieldCheck, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { getQuickDemoResult } from '../../data/quickDemoResult';
import { ArchitectureCanvasReactFlow } from './ArchitectureCanvasReactFlow';
import { EventFeed } from './EventFeed';
import { DetectionBar } from './DetectionBar';
import { useSimulationNarrator } from './SimulationNarrator';

type DetStep = 'detecting' | 'temporal' | 'risk' | 'remediation' | 'contained';
type AttackerPos = 'internet' | 'iam' | 'iam2' | 'iam3' | 'ec2' | 's3' | 'contained' | null;

// MITRE Kill Chain stages for display
const KILL_CHAIN_STAGES = ['Reconnaissance', 'Initial Access', 'Execution', 'Persistence', 'Priv. Escalation', 'Lateral Move', 'Exfiltration'];

const SCENARIO_KILL_CHAIN: Record<string, number[]> = {
  'crypto-mining':       [1, 2, 4],  // Initial Access, Execution, Priv Esc
  'data-exfiltration':   [1, 4, 6],  // Initial Access, Priv Esc, Exfiltration
  'privilege-escalation':[1, 3, 4],  // Initial Access, Persistence, Priv Esc
  'unauthorized-access': [0, 1, 6],  // Recon, Initial Access, Exfiltration
  'shadow-ai':           [1, 2, 6],  // Initial Access, Execution, Exfiltration
};

const SCENARIO_MITRE: Record<string, { id: string; name: string; tactic: string; desc: string; impact: string }[]> = {
  'crypto-mining': [
    { id: 'T1078', name: 'Valid Accounts',       tactic: 'Initial Access',      desc: 'Attacker used compromised contractor credentials to assume an IAM role with administrator access.', impact: 'Full account control — every AWS service is now accessible to the attacker.' },
    { id: 'T1578', name: 'Modify Cloud Compute', tactic: 'Execution',           desc: 'RunInstances API used to launch GPU-optimized instances (p3.2xlarge) for cryptocurrency mining.', impact: '$2,400/day in unauthorized compute spend. Bill spikes immediately.' },
    { id: 'T1021', name: 'Remote Services',      tactic: 'Privilege Escalation', desc: 'Security group modified to expose port 22 to 0.0.0.0/0, enabling direct SSH access.', impact: 'Persistent remote access — attacker can reconnect even if credentials are rotated.' },
  ],
  'data-exfiltration': [
    { id: 'T1078', name: 'Valid Accounts',            tactic: 'Initial Access',  desc: 'data-analyst credentials used to access sensitive S3 buckets containing PII and financial data.', impact: 'Customer records at risk. GDPR/CCPA breach notification may be required.' },
    { id: 'T1530', name: 'Data from Cloud Storage',   tactic: 'Collection',      desc: 'Multiple GetObject API calls targeting customer PII and financial data files.', impact: '2.4GB of data exfiltrated. Regulatory fines can reach €20M under GDPR.' },
    { id: 'T1537', name: 'Transfer Data to Cloud Acct', tactic: 'Exfiltration', desc: 'Data transferred to external storage controlled by the attacker.', impact: 'Data is now in attacker control — encryption or deletion cannot recover it.' },
  ],
  'privilege-escalation': [
    { id: 'T1078', name: 'Valid Accounts',       tactic: 'Initial Access',  desc: 'junior-dev IAM user assumed AdminRole — massive privilege jump from read-only to full admin.', impact: 'Full AWS account control obtained in a single AssumeRole API call.' },
    { id: 'T1098', name: 'Account Manipulation', tactic: 'Persistence',     desc: 'New IAM user backdoor-admin created with AdministratorAccess — persistent foothold established.', impact: 'Attacker retains access even after the original compromise is discovered.' },
    { id: 'T1136', name: 'Create Account',       tactic: 'Priv. Escalation', desc: 'CreateUser + AttachUserPolicy used to create a permanent admin account for future access.', impact: 'Privilege escalation is now permanent until the backdoor user is deleted.' },
  ],
  'unauthorized-access': [
    { id: 'T1190', name: 'Exploit Public-Facing App', tactic: 'Reconnaissance', desc: 'External IP 198.51.100.100 probed the environment with stolen credentials before gaining access.', impact: 'Attacker has mapped your environment — they know what resources exist.' },
    { id: 'T1552', name: 'Unsecured Credentials',     tactic: 'Initial Access',  desc: 'API keys and production secrets downloaded from S3 bucket company-secrets.', impact: 'Production credentials compromised — all systems using these keys are at risk.' },
    { id: 'T1530', name: 'Data from Cloud Storage',   tactic: 'Exfiltration',    desc: 'Systematic GetObject calls retrieving production configuration and API key files.', impact: 'Lateral movement to any system using the stolen production credentials.' },
  ],
  'shadow-ai': [
    { id: 'AML.T0051', name: 'Prompt Injection',       tactic: 'Initial Access', desc: 'UnapprovedLambdaRole invoked Bedrock Nova Pro outside approved AI usage policy — Shadow AI.', impact: 'Ungoverned model access. Data sent to LLM may violate data privacy policies.' },
    { id: 'T1059',     name: 'Scripting Interpreter',  tactic: 'Execution',      desc: 'InvokeModelWithResponseStream used for streaming — potential prompt injection exfiltration.', impact: 'LLM01 (OWASP) — attacker can extract system prompts or sensitive context.' },
    { id: 'T1078',     name: 'Valid Accounts',          tactic: 'Priv. Escalation', desc: 'dev-experiment role used from external IP — indicates credential theft or insider threat.', impact: 'AI governance violation. GDPR Article 22 applies if automated decisions affect people.' },
  ],
};

// Intro narration — plays immediately when simulation opens, before any events
const INTRO_NARRATIONS: Record<string, string> = {
  'crypto-mining':       "Welcome to the wolfir live attack simulation. We're about to replay a real-world cloud cryptomining attack — step by step, in real time. Watch the architecture diagram as each stage unfolds. This attack happened in under 4 minutes. Let's begin.",
  'data-exfiltration':   "This is the wolfir data exfiltration simulation. You'll see how an attacker with stolen credentials can silently drain your S3 buckets — gigabytes of customer data — without triggering a single alert in a standard setup. wolfir catches it. Let's watch.",
  'privilege-escalation': "Welcome. This simulation shows a privilege escalation attack — one of the most dangerous and common insider threat patterns in AWS. A low-privilege developer account becomes a full administrator in one API call. Let's trace how it happens.",
  'unauthorized-access': "This simulation replays an unauthorized access incident. A threat actor using stolen credentials from a dark web breach gains entry to your AWS environment and locates production secrets. wolfir detects and contains it. Watch how.",
  'shadow-ai':           "This is the wolfir Shadow AI simulation. An unapproved Lambda role begins invoking Amazon Bedrock without authorization — violating your AI governance policy and exposing you to data privacy risk. wolfir's AI pipeline monitoring catches it. Let's begin.",
};

const NARRATIONS: Record<string, string[]> = {
  'crypto-mining': [
    "Alert. A threat actor just assumed the contractor-temp IAM role using compromised credentials — that's MITRE T1078, Valid Accounts. In a single API call, they now hold full AdministratorAccess to every AWS service in this account. This is the most common entry point for cloud attacks. The clock is running.",
    "The attacker just opened a backdoor. Security group modified — port 22 is now exposed to 0.0.0.0 slash 0, the entire internet. That's MITRE T1021, Remote Services. This is critical: even if you rotate the IAM credentials right now, they still have persistent SSH access through this open port.",
    "Financial damage begins now. Three GPU instances just launched — RunInstances, p3.2xlarge, optimized for compute. MITRE T1578. This is a cryptomining rig running on your AWS bill. At current GPU pricing, that's $2,400 per day in charges. It started 47 seconds ago and growing every second.",
    "wolfir's temporal agent has correlated all three events — the AssumeRole, the security group change, and the RunInstances — into a single confirmed attack chain. Risk score is 95 out of 100. This is a critical incident. Autonomous remediation is being initiated right now.",
    "Incident contained. wolfir revoked the IAM session, detached the AdministratorAccess policy, and terminated all three GPU instances. The cryptominer is offline. You have avoided $2,400 per day in unauthorized compute costs. A complete CloudTrail audit trail has been preserved for forensic review.",
  ],
  'data-exfiltration': [
    "Data breach in progress. The data-analyst identity just made the first GetObject call against your S3 customer PII bucket. That's MITRE T1530 — Data from Cloud Storage. This is not a one-off download. The access pattern is systematic — hundreds of files, methodically. Under GDPR, this is a notifiable breach.",
    "Escalating. Financial records are now being pulled — Q4 revenue data, accounts receivable. Multiple large GetObject calls in a single session, across multiple sensitive prefixes. This is a classic bulk exfiltration pattern. GDPR Article 33 requires breach notification within 72 hours. Fines can reach 20 million euros.",
    "wolfir has detected the exfiltration. Temporal correlation confirmed systematic data theft across 6 API calls in 3 minutes — far outside normal access patterns. Containment initiated: disabling data-analyst access keys and applying a restrictive bucket policy to block further downloads.",
    "Breach contained. wolfir disabled the compromised access keys and locked down the S3 bucket policy. The exfiltration has stopped. All data already downloaded must be treated as compromised. Rotate any API keys or secrets stored in those files immediately — they are in attacker control.",
  ],
  'privilege-escalation': [
    "Insider threat. junior-dev just called AssumeRole on AdminRole — that's MITRE T1078. This developer had read-only permissions. They now hold full AdministratorAccess. In one API call, the entire account is exposed. This happens when IAM role trust policies are too permissive. Watch what they do next.",
    "Persistence move. While holding AdminRole, the attacker just created a backdoor — a new IAM user called backdoor-admin with AdministratorAccess directly attached. MITRE T1136, Create Account. This account will survive if the original junior-dev credentials are rotated. This is now a long-term compromise.",
    "wolfir has mapped the complete escalation chain: junior-dev assumed AdminRole, then used that access to create a permanent backdoor account. Risk score: critical. Containment: deleting backdoor-admin, revoking the AdminRole session, and tightening the trust policy to require MFA for all role assumptions.",
    "Privilege escalation neutralized. wolfir deleted backdoor-admin, revoked all active sessions on AdminRole, and updated the trust policy. The insider threat is contained. You should immediately audit all IAM users created in the last 24 hours and review which identities can assume privileged roles.",
  ],
  'unauthorized-access': [
    "External probe detected. IP 198.51.100.100 — geolocated to a known TOR exit node — is accessing your environment using stolen credentials. MITRE T1190. These credentials likely came from a dark web breach. The attacker is in reconnaissance mode right now — mapping your resources before moving deeper.",
    "They found what they came for. Production API keys, database passwords, and service credentials have just been downloaded from your company-secrets S3 bucket — GetSecretValue, MITRE T1552. Every application using these credentials is now compromised. This is lateral movement potential across your entire stack.",
    "wolfir correlated the external IP, the unusual access time, and the secrets download into a confirmed attack chain. Containment initiated: revoking external-user credentials, rotating the IAM access keys, and restricting access to the secrets bucket.",
    "Access revoked and contained. wolfir disabled the compromised credentials. But the secrets that were downloaded are still in attacker control. You must rotate every API key, database password, and service credential that was stored in that S3 bucket — immediately, across every system that uses them.",
  ],
  'shadow-ai': [
    "Shadow AI alert. UnapprovedLambdaRole just invoked Amazon Bedrock Nova Pro — without authorization. MITRE ATLAS AML.T0051, Prompt Injection via unauthorized model access. This violates your AI governance policy. Any customer data or confidential context sent to this model may breach GDPR and your data processing agreements.",
    "Escalating. dev-experiment, connecting from an external IP address, is now using InvokeModelWithResponseStream — streaming Bedrock responses. OWASP LLM01. Streaming responses can be used to exfiltrate data embedded in LLM outputs, or to extract system prompts and internal context through prompt injection.",
    "wolfir's AI pipeline monitor correlated three policy violations across CloudTrail: ungoverned model invocation, external IP access to Bedrock, and streaming response patterns consistent with LLM data exfiltration. This is a confirmed AI governance incident. Containment: revoking Bedrock permissions from both roles.",
    "Shadow AI contained. wolfir revoked Amazon Bedrock InvokeModel permissions from UnapprovedLambdaRole and dev-experiment, and flagged both for security review. To prevent recurrence, enable Bedrock Guardrails with input-output filtering, and define an explicit AI usage policy enforced via Service Control Policies.",
  ],
};

const WHAT_IF_CONFIG: Record<string, {
  label: string;
  description: string;
  impact: string;
  costMultiplier: number;
  attackStopped: boolean;
}> = {
  default:            { label: 'Default scenario',        description: 'No security controls in place — attack runs to completion.',            impact: 'Full breach — maximum cost and data loss.',   costMultiplier: 1,    attackStopped: false },
  'mfa-enabled':      { label: 'MFA was enabled',         description: 'Multi-factor auth blocks credential-based initial access (AssumeRole).', impact: 'Attack blocked at entry. $0 cost impact.',     costMultiplier: 0,    attackStopped: true  },
  'reduced-privilege':{ label: 'Role had least privilege', description: 'Role restricted to read-only — cannot launch instances or modify SGs.',  impact: 'Attack limited. ~30% of baseline impact.',    costMultiplier: 0.3,  attackStopped: false },
  'vpc-endpoint':     { label: 'VPC endpoint enforced',   description: 'S3/Bedrock only accessible via VPC endpoint — external access blocked.', impact: 'Exfiltration blocked. Data stays in VPC.',     costMultiplier: 0.1,  attackStopped: true  },
  'guardrails':       { label: 'Bedrock Guardrails on',   description: 'Input/output filtering blocks prompt injection and Shadow AI attempts.',  impact: 'AI abuse neutralized at model level.',         costMultiplier: 0,    attackStopped: true  },
};

const NODE_DETAILS: Record<string, { title: string; desc: string; technique: string; mitreId: string; risk: string }> = {
  internet:    { title: 'Internet (External Origin)', desc: 'Attack originates from an external IP — possibly a TOR exit node, VPN, or attacker-controlled host. Suspicious geolocation.', technique: 'Exploit Public-Facing Application', mitreId: 'T1190', risk: 'MEDIUM' },
  iam:         { title: 'IAM Role (Compromised)', desc: 'Compromised IAM role with excessive permissions. AssumeRole API used with stolen credentials to gain full admin access.', technique: 'Valid Accounts', mitreId: 'T1078', risk: 'CRITICAL' },
  iam2:        { title: 'Escalated Role / Bedrock', desc: 'Second privilege level reached — either a higher-trust role assumed, or AI service accessed without approval.', technique: 'Account Manipulation', mitreId: 'T1098', risk: 'CRITICAL' },
  iam3:        { title: 'Backdoor Account', desc: 'Persistent IAM user created with AdministratorAccess — attacker maintaining long-term access.', technique: 'Create Account', mitreId: 'T1136', risk: 'CRITICAL' },
  ec2:         { title: 'EC2 (Crypto Miner)', desc: '3 GPU instances launched — p3.2xlarge, optimized for GPU compute. Running XMRig or similar crypto mining software.', technique: 'Modify Cloud Compute', mitreId: 'T1578', risk: 'HIGH' },
  sg:          { title: 'Security Group (Exposed)', desc: 'Port 22 exposed to 0.0.0.0/0. Attacker has persistent SSH access independent of IAM credentials.', technique: 'Remote Services', mitreId: 'T1021', risk: 'HIGH' },
  s3:          { title: 'S3 Bucket (Exfiltration)', desc: 'Customer PII, financial data, or production secrets being systematically downloaded via GetObject calls.', technique: 'Data from Cloud Storage', mitreId: 'T1530', risk: 'CRITICAL' },
  cloudtrail:  { title: 'CloudTrail (Detection)', desc: 'wolfir processed these CloudTrail events to detect the attack. All activity is logged — full forensic trail available.', technique: 'Impair Defenses', mitreId: 'T1562', risk: 'LOW' },
};

interface LiveSimulationProps {
  scenarioId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const LiveSimulation: React.FC<LiveSimulationProps> = ({ scenarioId, onComplete, onSkip }) => {
  const data = getQuickDemoResult(scenarioId);
  const events = useMemo(() =>
    (data.results?.timeline?.events || []).sort(
      (a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || '')
    ),
  [data]);

  const [simTime, setSimTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [whatIfParam, setWhatIfParam] = useState<keyof typeof WHAT_IF_CONFIG>('default');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const lastNarrationRef = useRef(-1);
  const introSpokenRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { speak, stop } = useSimulationNarrator(muted ? 0 : volume);

  // Derive all simulation state from simTime
  const phase = simTime < 3000 ? 0 : simTime < 5000 ? 1 : 2;
  const visibleEvents = phase >= 2 ? Math.min(Math.floor((simTime - 5000) / 4000), events.length) : 0;
  const detThreshold = Math.min(3, events.length);
  const contained = simTime >= 43000;
  const detStep: DetStep =
    contained ? 'contained' :
    visibleEvents >= detThreshold && simTime >= 27000
      ? simTime >= 37000 ? 'remediation' : simTime >= 32000 ? 'risk' : 'temporal'
      : 'detecting';
  const remediationStep = simTime >= 37000 ? (simTime >= 43000 ? 3 : simTime >= 40000 ? 2 : 1) : 0;

  const getAttackerPos = (idx: number): AttackerPos => {
    if (scenarioId === 'crypto-mining') {
      if (idx < 2) return 'internet'; if (idx < 4) return 'iam'; return 'ec2';
    }
    if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') {
      return idx < 1 ? 'internet' : 's3';
    }
    if (scenarioId === 'privilege-escalation') {
      if (idx < 1) return 'iam'; if (idx < 3) return 'iam2'; return 'iam3';
    }
    if (scenarioId === 'shadow-ai') {
      return idx < 2 ? 'iam' : 'iam2';
    }
    return 'internet';
  };
  const attackerPos: AttackerPos = contained ? 'contained' : phase >= 2 && visibleEvents > 0 ? getAttackerPos(visibleEvents - 1) : null;

  // Stable Set memoization — prevents ReactFlow jitter from Set identity changes
  const compromised = useMemo(() => {
    const s = new Set<string>();
    if (scenarioId === 'crypto-mining') {
      if (visibleEvents >= 2) s.add('iam');
      if (visibleEvents >= 3) { s.add('sg'); s.add('ec2'); }
    } else if (scenarioId === 'data-exfiltration') {
      if (visibleEvents >= 1) s.add('iam');
      if (visibleEvents >= 2) { s.add('s3'); s.add('ec2'); }
    } else if (scenarioId === 'unauthorized-access') {
      if (visibleEvents >= 1) s.add('iam');
      if (visibleEvents >= 2) { s.add('s3'); s.add('ec2'); }
    } else if (scenarioId === 'privilege-escalation') {
      if (visibleEvents >= 1) { s.add('internet'); s.add('iam'); }
      if (visibleEvents >= 2) s.add('iam2');
      if (visibleEvents >= 3) s.add('iam3');
    } else if (scenarioId === 'shadow-ai') {
      if (visibleEvents >= 1) s.add('iam');
      if (visibleEvents >= 2) { s.add('iam2'); s.add('s3'); }
    }
    return s;
  }, [scenarioId, visibleEvents]);

  const scenarioName = {
    'crypto-mining': 'Cryptocurrency Mining Attack',
    'data-exfiltration': 'Data Exfiltration',
    'privilege-escalation': 'Privilege Escalation',
    'shadow-ai': 'Shadow AI / LLM Abuse',
    'unauthorized-access': 'Unauthorized Access',
  }[scenarioId] || 'Security Incident';

  const riskLevel = visibleEvents >= 5 ? 'CRITICAL' : visibleEvents >= 3 ? 'HIGH' : visibleEvents >= 1 ? 'MEDIUM' : 'LOW';
  const riskScore = Math.min(98, visibleEvents * 18 + (remediationStep > 0 ? -20 : 0));

  const costRatePerSec = 0.2;
  const attackStartMs = 5000;
  const attackDurationMs = Math.max(0, simTime - attackStartMs);
  const baseCost = Math.min(2400, Math.round(attackDurationMs / 1000 * costRatePerSec * 100) / 100);
  const liveCost = contained ? 0 : baseCost * (WHAT_IF_CONFIG[whatIfParam]?.costMultiplier ?? 1);
  const projectedDailyCost = 2400 * (WHAT_IF_CONFIG[whatIfParam]?.costMultiplier ?? 1);

  // Current MITRE techniques for this scenario
  const currentTechniques = SCENARIO_MITRE[scenarioId] || [];
  const currentMitre = currentTechniques[Math.min(Math.max(0, visibleEvents - 1), currentTechniques.length - 1)];

  // Kill chain stage index for this scenario
  const activeKillChainStages = SCENARIO_KILL_CHAIN[scenarioId] || [1];
  const currentKillChainIdx = activeKillChainStages[Math.min(Math.max(0, visibleEvents - 1), activeKillChainStages.length - 1)];

  // Timeline driver
  useEffect(() => {
    const interval = setInterval(() => {
      setSimTime((t) => Math.min(t + 100 * speed, 50000));
    }, 100);
    return () => clearInterval(interval);
  }, [speed]);

  useEffect(() => {
    if (simTime >= 47000) setShowComplete(true);
  }, [simTime]);

  // Intro narration — fires once on mount after a short delay
  useEffect(() => {
    if (introSpokenRef.current) return;
    introSpokenRef.current = true;
    const intro = INTRO_NARRATIONS[scenarioId] || INTRO_NARRATIONS['crypto-mining'];
    setIsSpeaking(true);
    // slight delay so the UI renders first
    const t = setTimeout(() => speak(intro), 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Event narrations — each new event triggers the next narration segment
  useEffect(() => {
    const narrs = NARRATIONS[scenarioId] || NARRATIONS['crypto-mining'];
    const idx = visibleEvents - 1;
    if (idx >= 0 && idx < narrs.length && idx !== lastNarrationRef.current) {
      lastNarrationRef.current = idx;
      setIsSpeaking(true);
      speak(narrs[idx]);
    }
    if (contained && lastNarrationRef.current !== 999) {
      lastNarrationRef.current = 999;
      setIsSpeaking(true);
      speak(narrs[narrs.length - 1]);
    }
  }, [visibleEvents, contained, scenarioId, speak]);

  useEffect(() => () => stop(), [stop]);

  const whatIfCfg = WHAT_IF_CONFIG[whatIfParam];
  const attackStopped = whatIfCfg?.attackStopped && whatIfParam !== 'default';
  const selectedNodeInfo = selectedNode ? NODE_DETAILS[selectedNode] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #080d1a 100%)' }}>
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% -10%, rgba(99,102,241,0.1) 0%, transparent 60%)' }} />
      {/* Red threat glow when attack active */}
      <AnimatePresence>
        {visibleEvents >= 3 && !contained && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(239,68,68,0.07) 0%, transparent 60%)' }}
          />
        )}
      </AnimatePresence>

      {/* ── TOP BAR ── */}
      <div className="relative flex items-center justify-between px-5 py-3 z-10" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(12px)' }}>
        {/* Left: Metrics */}
        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="rounded-lg px-3 py-1.5" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <p className="text-[8px] font-bold uppercase tracking-widest text-indigo-400">⏱ Time</p>
            <p className="text-sm font-black font-mono text-white tabular-nums">{Math.floor(simTime / 1000)}s</p>
          </div>
          {/* Events */}
          <div className="rounded-lg px-3 py-1.5" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <p className="text-[8px] font-bold uppercase tracking-widest text-indigo-400">📡 Events</p>
            <p className="text-sm font-black font-mono text-white">{visibleEvents}/{events.length}</p>
          </div>
          {/* Risk */}
          <div className="rounded-lg px-3 py-1.5" style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${contained ? 'rgba(52,211,153,0.5)' : riskLevel === 'CRITICAL' ? 'rgba(239,68,68,0.6)' : riskLevel === 'HIGH' ? 'rgba(249,115,22,0.5)' : 'rgba(245,158,11,0.5)'}` }}>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: contained ? '#34d399' : riskLevel === 'CRITICAL' ? '#f87171' : riskLevel === 'HIGH' ? '#fb923c' : '#fbbf24' }}>🎯 Risk</p>
            <p className={`text-sm font-black ${contained ? 'text-emerald-400' : riskLevel === 'CRITICAL' ? 'text-red-400' : riskLevel === 'HIGH' ? 'text-orange-400' : 'text-amber-400'}`}>
              {contained ? '✓ CONTAINED' : riskLevel}
            </p>
          </div>
          {/* Risk Score */}
          <div className="hidden sm:flex flex-col rounded-lg px-3 py-1.5" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <p className="text-[8px] font-bold uppercase tracking-widest text-indigo-400">📊 Score</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: riskScore > 60 ? '#ef4444' : '#f59e0b', width: `${riskScore}%` }} transition={{ duration: 0.5 }} />
              </div>
              <span className="text-[10px] font-bold font-mono text-white">{contained ? 0 : riskScore}</span>
            </div>
          </div>
          {/* Cost */}
          <div className="rounded-lg px-3 py-1.5" style={{ background: 'rgba(15,23,42,0.8)', border: `1px solid ${contained ? 'rgba(52,211,153,0.5)' : 'rgba(244,63,94,0.5)'}` }}>
            <p className="text-[8px] font-bold uppercase tracking-widest" style={{ color: contained ? '#34d399' : '#fb7185' }}>{contained ? '💰 Saved' : '💸 Cost'}</p>
            <p className={`text-sm font-black font-mono ${contained ? 'text-emerald-400' : 'text-rose-400'}`}>${contained ? projectedDailyCost.toLocaleString() : liveCost.toFixed(2)}</p>
            <p className="text-[8px]" style={{ color: contained ? '#065f46' : '#9f1239' }}>{contained ? '/day avoided' : 'accumulating'}</p>
          </div>
        </div>

        {/* Center: Title */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="absolute left-1/2 -translate-x-1/2 text-center">
              <p className="text-[9px] font-bold tracking-widest text-indigo-400 uppercase">🔴 Simulating</p>
              <p className="text-base font-black text-white tracking-tight">{scenarioName}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Lyra speaking indicator */}
          <AnimatePresence>
            {isSpeaking && !muted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)' }}
              >
                <div className="flex items-end gap-0.5 h-3.5">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div key={i} className="w-0.5 rounded-full bg-indigo-400"
                      animate={{ height: ['4px', '12px', '4px', '10px', '4px'] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-indigo-300 tracking-wide">Lyra</span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Volume */}
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
            <button onClick={() => setMuted(m => !m)} className="p-1 text-slate-400 hover:text-white transition-colors">
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            {!muted && (
              <input type="range" min="0" max="100" step="5" value={Math.round(volume * 100)} onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="w-14 h-1.5 accent-indigo-500 cursor-pointer" />
            )}
          </div>
          {/* Speed */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(51,65,85,0.6)', background: 'rgba(15,23,42,0.8)' }}>
            {[1, 2, 3].map((s) => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-3 py-1.5 text-[11px] font-bold transition-all ${speed === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
                {s}x
              </button>
            ))}
          </div>
          <button onClick={onSkip} className="p-2 rounded-lg text-slate-400 hover:text-white transition-all" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
            <X className="w-4 h-4" />
          </button>
          <button onClick={onSkip} className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 px-2">
            Skip →
          </button>
        </div>
      </div>

      {/* ── MISSION BRIEFING OVERLAY (phase 0 — first 3 seconds, while intro narration plays) ── */}
      <AnimatePresence>
        {phase === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="max-w-lg w-full mx-6 rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(15,23,42,0.95)' }}
            >
              {/* Header */}
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.08)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">wolfir · Live Simulation</p>
                  <p className="text-sm font-black text-white">{scenarioName}</p>
                </div>
                <motion.div
                  className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[10px] font-bold text-red-400">LIVE</span>
                </motion.div>
              </div>
              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">{INTRO_NARRATIONS[scenarioId]}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(SCENARIO_MITRE[scenarioId] || []).map((m) => (
                    <div key={m.id} className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <p className="text-[8px] font-mono font-black text-indigo-400 mb-0.5">{m.id}</p>
                      <p className="text-[10px] font-bold text-white leading-tight">{m.name}</p>
                      <p className="text-[9px] text-slate-500">{m.tactic}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-0.5 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div className="h-full bg-indigo-500 rounded-full" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 3, ease: 'linear' }} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Starting…</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex gap-3 p-3 pt-3 pb-1 min-h-0 overflow-hidden">

        {/* Left: Architecture diagram */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
          <div className="flex-1 rounded-xl overflow-hidden min-h-0" style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(2,6,23,0.6)' }}>
            <ArchitectureCanvasReactFlow
              scenarioId={scenarioId}
              attackerPosition={attackerPos}
              compromisedResources={compromised}
              remediationStep={remediationStep}
              onNodeClick={setSelectedNode}
            />
          </div>

          {/* Node details panel (appears when node clicked) */}
          <AnimatePresence>
            {selectedNode && selectedNodeInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl overflow-hidden shrink-0"
                style={{ border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(15,23,42,0.9)' }}
              >
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${selectedNodeInfo.risk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : selectedNodeInfo.risk === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}`}>{selectedNodeInfo.risk}</span>
                      <span className="text-[9px] font-mono text-indigo-400" style={{ background: 'rgba(99,102,241,0.15)', padding: '1px 6px', borderRadius: 4, border: '1px solid rgba(99,102,241,0.3)' }}>{selectedNodeInfo.mitreId}</span>
                      <span className="text-[10px] text-slate-400">{selectedNodeInfo.technique}</span>
                    </div>
                    <p className="text-[11px] font-bold text-white">{selectedNodeInfo.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{selectedNodeInfo.desc}</p>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="p-1 text-slate-600 hover:text-slate-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {!selectedNode && (
            <p className="text-[9px] text-slate-400 text-center pb-1">🔍 Click any node to inspect its MITRE technique and risk details</p>
          )}
        </div>

        {/* Right: Two-panel sidebar */}
        <div className="w-[300px] shrink-0 flex flex-col gap-2 min-h-0">
          {/* Event Feed */}
          <div className="flex-1 min-h-0">
            <EventFeed
              events={events.map((e: any) => ({ timestamp: e.timestamp, action: e.action, resource: e.resource, severity: e.severity || 'MEDIUM', actor: e.actor }))}
              visibleCount={visibleEvents}
            />
          </div>

          {/* Threat Intelligence panel */}
          <AnimatePresence>
            {currentMitre && visibleEvents > 0 && (
              <motion.div
                key={currentMitre.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="shrink-0 rounded-xl overflow-hidden"
                style={{ background: 'rgba(2,6,23,0.9)', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(15,23,42,0.5)' }}>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Threat Intelligence</p>
                </div>
                <div className="px-3 py-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.35)' }}>{currentMitre.id}</span>
                    <span className="text-[10px] font-bold text-white">{currentMitre.name}</span>
                  </div>
                  <p className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wider">{currentMitre.tactic}</p>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{currentMitre.desc}</p>
                  <div className="flex items-start gap-1.5 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-red-300 leading-relaxed">{currentMitre.impact}</p>
                  </div>
                  <a href={`https://attack.mitre.org/techniques/${currentMitre.id.replace('.', '/')}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] text-indigo-400 hover:text-indigo-300">
                    <Info className="w-3 h-3" /> MITRE ATT&CK reference <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── KILL CHAIN + WHAT-IF + TRAINING NOTE ── */}
      <div className="px-3 pb-2 space-y-2 shrink-0">
        {/* Kill Chain stage tracker */}
        <div className="rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-[8px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap">⛓ Kill Chain</p>
          <div className="flex-1 flex items-center gap-1 overflow-hidden">
            {KILL_CHAIN_STAGES.map((stage, i) => {
              const isActive = activeKillChainStages.includes(i) && visibleEvents > 0;
              const isCurrent = i === currentKillChainIdx && visibleEvents > 0 && !contained;
              const isDone = isActive && activeKillChainStages.indexOf(i) < activeKillChainStages.indexOf(currentKillChainIdx);
              return (
                <React.Fragment key={stage}>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all duration-500 ${isCurrent ? 'bg-red-500/20 border border-red-500/40' : isDone ? 'bg-emerald-500/10 border border-emerald-500/20' : isActive ? 'bg-indigo-500/10 border border-indigo-500/20' : ''}`}>
                    <span className={`text-[8px] font-bold whitespace-nowrap ${isCurrent ? 'text-red-400' : isDone ? 'text-emerald-400' : isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {isCurrent ? '▶ ' : isDone ? '✓ ' : ''}{stage}
                    </span>
                  </div>
                  {i < KILL_CHAIN_STAGES.length - 1 && <div className="w-px h-3 bg-slate-800 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* What-If scenarios */}
        <div className="rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-3" style={{ background: 'rgba(2,6,23,0.7)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-[8px] font-black tracking-widest text-slate-300 uppercase">🔮 What If →</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(WHAT_IF_CONFIG) as Array<keyof typeof WHAT_IF_CONFIG>).map((p) => {
              const cfg = WHAT_IF_CONFIG[p];
              const isStopper = cfg.attackStopped;
              return (
                <button key={p} onClick={() => setWhatIfParam(p)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${whatIfParam === p ? (isStopper ? 'bg-emerald-600/80 text-white border border-emerald-500/50' : 'bg-indigo-600 text-white border border-indigo-500') : 'text-slate-400 hover:text-slate-200 border border-slate-700/50 hover:border-slate-600/50'}`}
                  style={{ background: whatIfParam === p ? undefined : 'rgba(15,23,42,0.7)' }}>
                  {isStopper && whatIfParam === p ? '🛡 ' : ''}{cfg.label}
                </button>
              );
            })}
          </div>
          {whatIfParam !== 'default' && (
            <div className="flex items-center gap-1.5 text-[10px]">
              {whatIfCfg.attackStopped
                ? <span className="text-emerald-400">✓ {whatIfCfg.impact}</span>
                : <span className="text-amber-400">⚡ {whatIfCfg.impact}</span>
              }
            </div>
          )}
        </div>

        {/* Training note */}
        <div className="rounded-xl px-4 py-2 flex items-start gap-2" style={{ background: 'rgba(2,6,23,0.5)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <Info className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[9px] text-slate-400 leading-relaxed">
            <span className="text-indigo-300 font-bold">🎓 Training Mode</span> — Tabletop exercise using <span className="text-indigo-400 font-mono">{(SCENARIO_MITRE[scenarioId] || []).map(t => t.id).join(', ')}</span> techniques. Click any node to inspect its MITRE technique. Use <span className="text-emerald-400 font-bold">What If</span> to explore prevention controls. Lyra narrates each stage in real time. Real incidents from your AWS account appear in the Attack Path tab.
          </p>
        </div>
      </div>

      {/* ── DETECTION BAR ── */}
      <DetectionBar step={detStep} />

      {/* ── ATTACK-STOPPED BANNER (What-If) ── */}
      <AnimatePresence>
        {attackStopped && !contained && visibleEvents >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{ background: 'rgba(6,78,59,0.9)', border: '1px solid rgba(52,211,153,0.5)', boxShadow: '0 0 24px rgba(52,211,153,0.2)' }}>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-bold text-emerald-300">{whatIfCfg.label} — Attack Blocked</p>
                <p className="text-[10px] text-emerald-500">{whatIfCfg.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONTAINED OVERLAY ── */}
      <AnimatePresence>
        {contained && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            <div className="absolute inset-0" style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(16px)' }} />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', damping: 22, stiffness: 200 }}
              className="relative max-w-lg w-full mx-6 pointer-events-auto"
            >
              {/* Header */}
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(6,78,59,0.15)', border: '1px solid rgba(52,211,153,0.4)', boxShadow: '0 0 40px rgba(52,211,153,0.15)' }}>
                <div className="px-6 py-5 flex items-center gap-4" style={{ borderBottom: '1px solid rgba(52,211,153,0.2)', background: 'rgba(6,78,59,0.25)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)', border: '1.5px solid rgba(52,211,153,0.4)' }}>
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white tracking-tight">Incident Contained</p>
                    <p className="text-xs text-emerald-500 mt-0.5">wolfir autonomous response complete · {Math.floor(simTime / 1000)}s total</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-black text-emerald-400">${projectedDailyCost.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-600">per day avoided</p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-px bg-slate-800/30">
                  {[
                    { label: 'Attack Vector', value: scenarioName.split(' ').slice(0, 2).join(' '), icon: '⚡' },
                    { label: 'MITRE Techniques', value: (SCENARIO_MITRE[scenarioId] || []).map(t => t.id).join(', '), icon: '🎯' },
                    { label: 'Risk Score', value: '0 / 100', icon: '✅' },
                    { label: 'Events Detected', value: `${events.length} events`, icon: '📊' },
                    { label: 'Response Time', value: `${Math.floor(simTime / 1000)}s`, icon: '⏱' },
                    { label: 'Regulatory Risk', value: whatIfParam === 'default' ? 'GDPR/PCI' : 'Low', icon: '⚖️' },
                  ].map((s) => (
                    <div key={s.label} className="px-4 py-3" style={{ background: 'rgba(2,6,23,0.4)' }}>
                      <p className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</p>
                      <p className="text-[11px] font-bold text-white mt-0.5 leading-tight">{s.icon} {s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Key takeaways */}
                <div className="px-5 py-4 space-y-2">
                  <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Key Takeaways</p>
                  <div className="space-y-1.5">
                    {[
                      whatIfParam === 'mfa-enabled'
                        ? { t: 'MFA would have blocked this attack at the initial AssumeRole call — zero impact.', icon: '🛡' }
                        : whatIfParam === 'reduced-privilege'
                        ? { t: 'Least-privilege IAM would have reduced blast radius by ~70%.', icon: '🔒' }
                        : { t: `Attack chain: Internet → IAM → ${scenarioId === 'crypto-mining' ? 'EC2 (crypto-mining)' : 'S3 (data theft)'}`, icon: '→' },
                      { t: 'wolfir correlated all events via CloudTrail temporal analysis and responded autonomously.', icon: '🤖' },
                      { t: `Immediate action: ${scenarioId === 'crypto-mining' ? 'Rotate all IAM credentials and audit GPU quotas.' : scenarioId.includes('data') || scenarioId === 'unauthorized-access' ? 'Treat all downloaded data as compromised. Initiate breach notification review.' : 'Delete all backdoor accounts and audit AssumeRole trust policies.'}`, icon: '⚡' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] text-slate-300">
                        <span className="mt-0.5">{item.icon}</span>
                        <span>{item.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 flex justify-center pointer-events-auto">
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={onComplete}
                  className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)', border: '1px solid rgba(165,180,252,0.2)' }}
                >
                  View Full Analysis <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete CTA (before contained) */}
      <AnimatePresence>
        {showComplete && !contained && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button onClick={onComplete} className="flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-white" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)', border: '1px solid rgba(165,180,252,0.2)' }}>
              View Full Analysis <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
