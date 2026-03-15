/**
 * Attack Path Diagram — React Flow version with AWS icons
 * Full feature set: Replay Attack, Search, Export, Zoom, Fullscreen, Legend
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import html2canvas from 'html2canvas';
import { Globe, AlertTriangle, Zap, Search, Download, Play, Pause, RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2, Shield } from 'lucide-react';
import {
  AmazonApiGateway,
  AmazonVirtualPrivateCloud,
  AwsCloudTrail,
  AmazonEc2,
  AwsIdentityAndAccessManagement,
  AmazonRds,
  AwsShield,
  AwsSecretsManager,
  AmazonSimpleStorageService,
} from '@nxavis/aws-icons';
import { IconAttackPath } from '../ui/MinimalIcons';

type Severity = 'critical' | 'high' | 'medium' | 'low';

type NodeRole = 'attacker' | 'detection' | 'compromised' | 'normal';

interface NodeData {
  label: string;
  subLabel: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; size?: number; color?: string }>;
  severity: Severity;
  riskScore?: number;
  mitreId?: string;
  timestamp?: string;
  nodeRole?: NodeRole;
}

const MITRE_MAP: Record<string, { name: string; desc: string; url: string }> = {
  T1078: { name: 'Valid Accounts', desc: 'Adversary uses stolen/compromised credentials to access resources. High impact — bypasses detection.', url: 'https://attack.mitre.org/techniques/T1078/' },
  T1098: { name: 'Account Manipulation', desc: 'Adversary modifies account permissions to maintain access or escalate privileges.', url: 'https://attack.mitre.org/techniques/T1098/' },
  T1190: { name: 'Exploit Public-Facing Application', desc: 'Initial access via vulnerable web app, API, or service exposed to the internet.', url: 'https://attack.mitre.org/techniques/T1190/' },
  T1021: { name: 'Remote Services', desc: 'Access via SSH, RDP, or other remote services. Common for lateral movement.', url: 'https://attack.mitre.org/techniques/T1021/' },
  T1041: { name: 'Exfiltration Over C2 Channel', desc: 'Data theft through command-and-control channel. Indicates data loss risk.', url: 'https://attack.mitre.org/techniques/T1041/' },
  T1552: { name: 'Unsecured Credentials', desc: 'Accessing stored credentials (Secrets Manager, config files). Enables privilege escalation.', url: 'https://attack.mitre.org/techniques/T1552/' },
  T1562: { name: 'Impair Defenses', desc: 'Adversary disables or evades security tools (CloudTrail, GuardDuty). Reduces visibility.', url: 'https://attack.mitre.org/techniques/T1562/' },
  T1578: { name: 'Modify Cloud Compute', desc: 'Adversary creates or modifies cloud compute resources to execute malicious workloads.', url: 'https://attack.mitre.org/techniques/T1578/' },
  T1530: { name: 'Data from Cloud Storage', desc: 'Adversary accesses data from cloud storage (S3, etc.) for exfiltration.', url: 'https://attack.mitre.org/techniques/T1530/' },
  'AML.T0051': { name: 'Prompt Injection', desc: 'Manipulating LLM input to extract data or trigger unintended actions.', url: 'https://atlas.mitre.org/techniques/AML.T0051/' },
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#2563eb',
  low: '#059669',
};

const AWS_ICONS = new Set([
  AmazonApiGateway, AmazonVirtualPrivateCloud, AwsCloudTrail, AmazonEc2,
  AwsIdentityAndAccessManagement, AmazonRds, AwsShield, AwsSecretsManager, AmazonSimpleStorageService,
]);

function AttackPathNode({ data }: { data: NodeData }) {
  const Icon = data.icon;
  const isAwsIcon = AWS_ICONS.has(Icon as any);

  // nodeRole overrides severity-based coloring for attacker/detection nodes
  let color: string;
  let bg: string;
  if (data.nodeRole === 'attacker') {
    color = '#d97706'; // amber — threat actor
    bg = '#fffbeb';
  } else if (data.nodeRole === 'detection') {
    color = '#059669'; // emerald — monitoring is healthy
    bg = '#ecfdf5';
  } else {
    color = SEVERITY_COLORS[data.severity] || '#64748B';
    bg = data.severity === 'critical' ? '#fef2f2' : data.severity === 'high' ? '#fff7ed' : data.severity === 'low' ? '#f0fdf4' : '#eff6ff';
  }
  const borderColor = color;
  return (
    <div className="flex flex-col items-center justify-center min-w-0">
      <div
        className="relative w-[72px] h-[72px] rounded-xl border-2 shadow-sm flex items-center justify-center"
        style={{ borderColor, backgroundColor: bg }}
      >
        <Handle type="target" position={Position.Left} style={{ opacity: 0, left: -14, width: 8, height: 8 }} />
        {isAwsIcon ? (
          <Icon size={56} color={color} />
        ) : (
          <Icon className="w-14 h-14" color={color} />
        )}
        <Handle type="source" position={Position.Right} style={{ opacity: 0, right: -14, left: 'auto', width: 8, height: 8 }} />
      </div>
      <span className="text-[11px] font-bold text-slate-900 text-center leading-tight max-w-[100px] truncate mt-1.5">{data.label}</span>
      <span className="text-[9px] text-slate-500 text-center">{data.subLabel}</span>
      {(data.mitreId || data.riskScore != null) && (
        <span className="text-[8px] font-mono text-slate-500">
          {[data.mitreId, data.riskScore != null ? `${data.riskScore}` : null].filter(Boolean).join(' · ')}
        </span>
      )}
    </div>
  );
}

// ── AWS Infrastructure Group/Container node ──────────────────────────────────
interface GroupNodeData { label: string; sublabel?: string; color: string; bg: string; dash?: string }
function GroupNode({ data }: { data: GroupNodeData }) {
  return (
    <div
      className="rounded-2xl h-full w-full flex flex-col pointer-events-none"
      style={{
        border: `2px dashed ${data.color}`,
        backgroundColor: data.bg,
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
        <span className="text-[10px] font-bold leading-none" style={{ color: data.color }}>{data.label}</span>
        {data.sublabel && <span className="text-[9px] font-medium text-slate-400 leading-none">{data.sublabel}</span>}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { attackPath: AttackPathNode, group: GroupNode };

interface NodeExtra {
  what: string;
  implications: string[];
  checks: Array<{ label: string; ok: boolean }>;
  attackStage: string;
}
const NODE_EXTRA: Record<string, NodeExtra> = {
  internet:  { what: 'External origin of the attack. Could be a TOR exit node, VPN, or attacker-controlled host.', implications: ['Initial access point — block at WAF/ALB level', 'IP reputation check recommended', 'GeoIP anomaly may indicate nation-state threat'], checks: [{ label: 'WAF enabled on API Gateway', ok: false }, { label: 'GeoIP blocking in place', ok: false }, { label: 'Rate limiting active', ok: true }], attackStage: 'Initial Access' },
  gateway:   { what: 'API Gateway is the public entry point. Misconfigured APIs allow unauthenticated access or excessive data exposure.', implications: ['API key or IAM auth missing/bypassed', 'No resource policy restricting source IPs', 'Rate limiting insufficient for brute force prevention'], checks: [{ label: 'API key authentication enforced', ok: false }, { label: 'Resource policy restricts IPs', ok: false }, { label: 'CloudWatch logging enabled', ok: true }], attackStage: 'Initial Access' },
  vpc:       { what: 'Virtual Private Cloud — the network boundary. Misconfigured VPC allows lateral movement between subnets.', implications: ['Security group rules too permissive (0.0.0.0/0)', 'VPC Flow Logs may capture lateral movement', 'No network ACL filtering east-west traffic'], checks: [{ label: 'VPC Flow Logs enabled', ok: true }, { label: 'Network ACLs configured', ok: false }, { label: 'No 0.0.0.0/0 ingress on SGs', ok: false }], attackStage: 'Lateral Movement' },
  ec2:       { what: 'EC2 instance compromised — attacker installed crypto-mining malware or C2 agent after gaining shell access.', implications: ['Crypto-miner consuming GPU/CPU, driving AWS bill up', 'Persistent backdoor may survive instance restart (user-data, cron)', 'Instance profile role used to escalate to IAM'], checks: [{ label: 'GuardDuty CryptoMining findings reviewed', ok: false }, { label: 'IMDSv2 enforced (no IMDSv1)', ok: false }, { label: 'Instance profile least-privilege', ok: false }], attackStage: 'Execution' },
  iam:       { what: 'IAM role with excessive permissions — attacker used AssumeRole to gain admin-equivalent access.', implications: ['AdministratorAccess or wildcard policy attached', 'Role session active — attacker persists even if key revoked', 'Can create new users/roles to maintain persistence'], checks: [{ label: 'AdministratorAccess policy detached', ok: false }, { label: 'Active sessions revoked', ok: false }, { label: 'CloudTrail logging IAM actions', ok: true }], attackStage: 'Privilege Escalation' },
  database:  { what: 'RDS database — final target for data exfiltration. Attacker queried tables and exported sensitive records.', implications: ['Data exfiltrated — GDPR/HIPAA/PCI-DSS breach notification may be required', 'RDS not in private subnet or public accessibility enabled', 'No encryption-in-transit enforced'], checks: [{ label: 'RDS in private subnet only', ok: false }, { label: 'Encryption at rest enabled', ok: true }, { label: 'Database audit logging active', ok: false }], attackStage: 'Exfiltration' },
  sg:        { what: 'Security Group misconfigured — SSH port 22 open to 0.0.0.0/0 allowed attacker direct shell access.', implications: ['Port 22 exposed globally — brute force or credential stuffing', 'No IP allowlist for admin ports', 'Should use Systems Manager Session Manager instead of SSH'], checks: [{ label: 'Port 22 restricted to known IPs', ok: false }, { label: 'SSM Session Manager configured', ok: false }, { label: 'No 0.0.0.0/0 on port 22', ok: false }], attackStage: 'Initial Access' },
  ssh:       { what: 'SSH brute force succeeded — 14 failed attempts before successful login. Weak key or credential reuse.', implications: ['Password auth instead of key-based — should be disabled', 'No fail2ban or AWS Network Firewall blocking brute force', 'Login may use stolen credentials from previous breach'], checks: [{ label: 'SSH key-based auth only (no passwords)', ok: false }, { label: 'Fail2ban or equivalent active', ok: false }, { label: 'SSH log anomalies alerted', ok: false }], attackStage: 'Credential Access' },
  secrets:   { what: 'AWS Secrets Manager accessed — attacker retrieved 3 secrets including DB credentials and API keys.', implications: ['Secrets retrieved — credentials must be rotated immediately', 'Resource policy too permissive (allows broad IAM access)', 'No VPC endpoint — secrets accessed over internet'], checks: [{ label: 'Automatic rotation enabled', ok: false }, { label: 'Resource-based policy restricts access', ok: false }, { label: 'CloudTrail alerts on GetSecretValue', ok: true }], attackStage: 'Credential Access' },
  cloudtrail:{ what: 'CloudTrail monitoring detected anomalous activity. wolfir processed these events for incident analysis.', implications: ['Trail is active — attack is being recorded', 'Multi-region trail covers all regions', 'Log file validation confirms integrity'], checks: [{ label: 'Multi-region trail enabled', ok: true }, { label: 'Log file validation enabled', ok: true }, { label: 'CloudWatch alarms on anomalies', ok: true }], attackStage: 'Detection' },
  bedrock:   { what: 'Amazon Bedrock LLM — targeted via prompt injection. Attacker manipulated model input to extract data or bypass guardrails.', implications: ['Prompt injection (OWASP LLM01) can cause data leakage', 'No Bedrock Guardrails configured for input sanitization', 'InvokeModel accessible without VPC endpoint'], checks: [{ label: 'Bedrock Guardrails enabled', ok: false }, { label: 'VPC endpoint for Bedrock', ok: false }, { label: 'CloudTrail InvokeModel logging', ok: true }], attackStage: 'Initial Access' },
  s3:        { what: 'S3 bucket targeted for data exfiltration — attacker accessed objects via compromised IAM role.', implications: ['Bucket policy allows broad access via compromised role', 'No S3 Block Public Access at account level', 'Object-level CloudTrail logging may be disabled'], checks: [{ label: 'S3 Block Public Access enabled', ok: true }, { label: 'Object-level logging active', ok: false }, { label: 'Bucket policy least-privilege', ok: false }], attackStage: 'Exfiltration' },
};

const EDGE_LABELS_STANDARD: Record<string, string> = {
  e1: 'HTTP/S', e2: 'Route', e3: 'SSH:22', e4: 'AssumeRole', e5: 'Query',
  e6: 'Route', e7: 'Exploit', e8: 'SSH', e9: 'Exfil', e10: 'GetSecret', e11: 'Logged',
};
const EDGE_LABELS_AI: Record<string, string> = {
  e1: 'InvokeModel', e2: 'API', e3: 'AssumeRole', e4: 'GetObject', e5: 'Logged',
};

// AWS infrastructure group nodes (dashed containers) — rendered behind service nodes
// Single Account box with region inside; no separate Region box to avoid clutter
const INFRA_GROUPS_STANDARD: Node[] = [
  {
    id: 'grp-account', type: 'group', position: { x: 150, y: 20 }, zIndex: -10,
    style: { width: 860, height: 340, pointerEvents: 'none' },
    data: { label: 'AWS Account · us-east-1', color: '#f97316', bg: 'rgba(251,146,60,0.06)' },
    draggable: false, selectable: false,
  },
  {
    id: 'grp-vpc', type: 'group', position: { x: 195, y: 55 }, zIndex: -8,
    style: { width: 560, height: 250, pointerEvents: 'none' },
    data: { label: 'VPC', color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)' },
    draggable: false, selectable: false,
  },
];

const DEMO_NODES_STANDARD: Node[] = [
  ...INFRA_GROUPS_STANDARD,
  { id: 'internet', type: 'attackPath', position: { x: 50, y: 180 }, data: { label: 'Internet', subLabel: 'External Origin', detail: 'Suspicious IP: 203.0.113.42 (TOR exit node)', icon: Globe, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:00Z', nodeRole: 'attacker' } },
  { id: 'gateway', type: 'attackPath', position: { x: 220, y: 180 }, data: { label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — 847 requests in 2 minutes', icon: AmazonApiGateway, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:15Z' } },
  { id: 'vpc', type: 'attackPath', position: { x: 390, y: 180 }, data: { label: 'VPC', subLabel: 'Network Layer', detail: 'VPC ID: vpc-0a1b2c3d · CIDR: 10.0.0.0/16 · Region: us-east-1', icon: AmazonVirtualPrivateCloud, severity: 'medium' as Severity, mitreId: 'T1021', timestamp: '2026-01-15T14:20:30Z' } },
  { id: 'ec2', type: 'attackPath', position: { x: 560, y: 180 }, data: { label: 'EC2 Instance', subLabel: 'Compromised', detail: 'i-abc123 — Attacker installed crypto-miner', icon: AmazonEc2, severity: 'critical' as Severity, riskScore: 98, mitreId: 'T1078', timestamp: '2026-01-15T14:21:00Z' } },
  { id: 'iam', type: 'attackPath', position: { x: 720, y: 180 }, data: { label: 'IAM Role', subLabel: 'Escalated', detail: 'arn:aws:iam::role/admin-temp — privilege escalation', icon: AwsIdentityAndAccessManagement, severity: 'critical' as Severity, riskScore: 92, mitreId: 'T1078', timestamp: '2026-01-15T14:21:45Z' } },
  { id: 'database', type: 'attackPath', position: { x: 880, y: 180 }, data: { label: 'RDS Database', subLabel: 'Data Target', detail: 'db-prod-main — 2.4GB data accessed', icon: AmazonRds, severity: 'high' as Severity, riskScore: 78, mitreId: 'T1041', timestamp: '2026-01-15T14:22:30Z' } },
  { id: 'sg', type: 'attackPath', position: { x: 280, y: 60 }, data: { label: 'Security Group', subLabel: 'Misconfigured', detail: 'sg-0xyz — 0.0.0.0/0 on port 22 (OPEN)', icon: AwsShield, severity: 'critical' as Severity, riskScore: 95, mitreId: 'T1190', timestamp: '2026-01-15T14:20:45Z' } },
  { id: 'ssh', type: 'attackPath', position: { x: 500, y: 60 }, data: { label: 'SSH Exposed', subLabel: 'Port 22 Open', detail: '14 failed login attempts before breach', icon: AlertTriangle, severity: 'critical' as Severity, riskScore: 94, mitreId: 'T1021', timestamp: '2026-01-15T14:21:15Z' } },
  { id: 'secrets', type: 'attackPath', position: { x: 720, y: 60 }, data: { label: 'Secrets Mgr', subLabel: 'Accessed', detail: 'GetSecretValue — 3 secrets retrieved', icon: AwsSecretsManager, severity: 'high' as Severity, riskScore: 85, mitreId: 'T1552', timestamp: '2026-01-15T14:22:00Z' } },
  { id: 'cloudtrail', type: 'attackPath', position: { x: 880, y: 60 }, data: { label: 'CloudTrail', subLabel: 'Monitoring', detail: 'Detected by wolfir', icon: AwsCloudTrail, severity: 'low' as Severity, mitreId: 'T1562', timestamp: '2026-01-15T14:23:00Z', nodeRole: 'detection' } },
];

const INFRA_GROUPS_AI: Node[] = [
  {
    id: 'grp-account', type: 'group', position: { x: 185, y: 130 }, zIndex: -10,
    style: { width: 900, height: 165, pointerEvents: 'none' },
    data: { label: 'AWS Account · us-east-1', color: '#f97316', bg: 'rgba(251,146,60,0.06)' },
    draggable: false, selectable: false,
  },
  {
    id: 'grp-ai-services', type: 'group', position: { x: 235, y: 165 }, zIndex: -8,
    style: { width: 510, height: 95, pointerEvents: 'none' },
    data: { label: 'Bedrock AI Services', sublabel: 'Managed inference layer', color: '#059669', bg: 'rgba(5,150,105,0.06)' },
    draggable: false, selectable: false,
  },
];

const DEMO_NODES_AI: Node[] = [
  ...INFRA_GROUPS_AI,
  { id: 'internet', type: 'attackPath', position: { x: 80, y: 180 }, data: { label: 'Internet', subLabel: 'External Origin', detail: 'Prompt injection or Shadow AI traffic', icon: Globe, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:00Z', nodeRole: 'attacker' } },
  { id: 'gateway', type: 'attackPath', position: { x: 260, y: 180 }, data: { label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — InvokeModel requests', icon: AmazonApiGateway, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:15Z' } },
  { id: 'bedrock', type: 'attackPath', position: { x: 440, y: 180 }, data: { label: 'Amazon Bedrock', subLabel: 'AI/ML', detail: 'InvokeModel — LLM01 prompt injection risk', icon: Zap, severity: 'critical' as Severity, riskScore: 88, mitreId: 'AML.T0051', timestamp: '2026-01-15T14:20:45Z' } },
  { id: 'iam', type: 'attackPath', position: { x: 620, y: 180 }, data: { label: 'IAM Role', subLabel: 'Model Access', detail: 'Bedrock Agent assumes role — excessive agency (LLM06)', icon: AwsIdentityAndAccessManagement, severity: 'high' as Severity, riskScore: 75, mitreId: 'T1078', timestamp: '2026-01-15T14:21:15Z' } },
  { id: 's3', type: 'attackPath', position: { x: 800, y: 180 }, data: { label: 'S3 Bucket', subLabel: 'Data Target', detail: 'Exfiltration via inference (LLM02)', icon: AmazonSimpleStorageService, severity: 'high' as Severity, riskScore: 72, mitreId: 'T1530', timestamp: '2026-01-15T14:21:45Z' } },
  { id: 'cloudtrail', type: 'attackPath', position: { x: 980, y: 180 }, data: { label: 'CloudTrail', subLabel: 'Monitoring', detail: 'InvokeModel logged — Shadow AI detection', icon: AwsCloudTrail, severity: 'low' as Severity, mitreId: 'T1562', timestamp: '2026-01-15T14:22:00Z', nodeRole: 'detection' } },
];

const EDGE_SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#2563eb',
  low: '#059669',
};

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
const maxSeverity = (a: Severity, b: Severity): Severity =>
  severityOrder.indexOf(a) <= severityOrder.indexOf(b) ? a : b;

const edgeStyle = (stroke: string) => ({ type: 'smoothstep' as const, animated: true, style: { stroke, strokeWidth: 2, strokeDasharray: '6 3' }, markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: stroke } });

const buildEdgesWithSeverity = (edges: Array<{ id: string; source: string; target: string }>, nodes: Node[]): Edge[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, (n.data as NodeData).severity]));
  return edges.map(({ id, source, target }) => {
    const s = nodeMap.get(source) ?? 'medium';
    const t = nodeMap.get(target) ?? 'medium';
    const severity = maxSeverity(s, t);
    const stroke = EDGE_SEVERITY_COLORS[severity];
    return { id, source, target, ...edgeStyle(stroke) };
  });
};

const DEMO_EDGES_STANDARD_BASE = [
  { id: 'e1', source: 'internet', target: 'gateway' },
  { id: 'e2', source: 'gateway', target: 'vpc' },
  { id: 'e3', source: 'vpc', target: 'ec2' },
  { id: 'e4', source: 'ec2', target: 'iam' },
  { id: 'e5', source: 'iam', target: 'database' },
  { id: 'e6', source: 'vpc', target: 'sg' },
  { id: 'e7', source: 'sg', target: 'ssh' },
  { id: 'e8', source: 'ec2', target: 'ssh' },
  { id: 'e9', source: 'ssh', target: 'secrets' },
  { id: 'e10', source: 'iam', target: 'secrets' },
  { id: 'e11', source: 'iam', target: 'cloudtrail' },
];

const DEMO_EDGES_AI_BASE = [
  { id: 'e1', source: 'internet', target: 'gateway' },
  { id: 'e2', source: 'gateway', target: 'bedrock' },
  { id: 'e3', source: 'bedrock', target: 'iam' },
  { id: 'e4', source: 'iam', target: 's3' },
  { id: 'e5', source: 'iam', target: 'cloudtrail' },
];

const DEMO_EDGES_STANDARD: Edge[] = buildEdgesWithSeverity(DEMO_EDGES_STANDARD_BASE, DEMO_NODES_STANDARD);
const DEMO_EDGES_AI: Edge[]       = buildEdgesWithSeverity(DEMO_EDGES_AI_BASE,      DEMO_NODES_AI);

// ── PRIVILEGE ESCALATION SCENARIO ──────────────────────────────────────────
const INFRA_GROUPS_PRIV: Node[] = [
  { id: 'grp-account', type: 'group', position: { x: 140, y: 20 }, zIndex: -10,
    style: { width: 920, height: 340, pointerEvents: 'none' },
    data: { label: 'AWS Account · us-east-1 (Contractor Target)', color: '#dc2626', bg: 'rgba(220,38,38,0.05)' }, draggable: false, selectable: false },
  { id: 'grp-iam', type: 'group', position: { x: 190, y: 50 }, zIndex: -8,
    style: { width: 660, height: 260, pointerEvents: 'none' },
    data: { label: 'IAM Role Chain — AssumeRole Pivot', color: '#7c3aed', bg: 'rgba(124,58,237,0.05)' }, draggable: false, selectable: false },
];
const DEMO_NODES_PRIV: Node[] = [
  ...INFRA_GROUPS_PRIV,
  { id: 'internet',   type: 'attackPath', position: { x: 40,  y: 180 }, data: { label: 'Dark Web / Telegram', subLabel: 'Credential Source', detail: 'IAM access key AKIA… sold on Telegram — contractor-temp identity', icon: Globe, severity: 'high' as Severity, mitreId: 'T1589', timestamp: '2026-01-15T09:00:00Z', nodeRole: 'attacker' } },
  { id: 'console',    type: 'attackPath', position: { x: 220, y: 180 }, data: { label: 'AWS Console', subLabel: 'Stolen Login', detail: 'Console sign-in from IP 45.33.32.156 — no MFA enforced', icon: AlertTriangle, severity: 'critical' as Severity, riskScore: 97, mitreId: 'T1078', timestamp: '2026-01-15T09:02:00Z' } },
  { id: 'iam-user',  type: 'attackPath', position: { x: 390, y: 180 }, data: { label: 'IAM User', subLabel: 'contractor-temp', detail: 'Overprivileged — sts:AssumeRole with no permissions boundary', icon: AwsIdentityAndAccessManagement, severity: 'critical' as Severity, riskScore: 95, mitreId: 'T1078', timestamp: '2026-01-15T09:03:00Z' } },
  { id: 'dev-role',  type: 'attackPath', position: { x: 560, y: 90  }, data: { label: 'IAM Role: dev-role', subLabel: 'AssumeRole #1', detail: 'sts:AssumeRole → dev-role — broad EC2/S3 permissions, no external-id', icon: AwsIdentityAndAccessManagement, severity: 'high' as Severity, riskScore: 82, mitreId: 'T1098', timestamp: '2026-01-15T09:04:00Z' } },
  { id: 'admin-role',type: 'attackPath', position: { x: 560, y: 260 }, data: { label: 'Role: admin-temp', subLabel: 'AssumeRole #2', detail: 'dev-role → admin-temp: AdministratorAccess policy — full cloud control', icon: AwsIdentityAndAccessManagement, severity: 'critical' as Severity, riskScore: 99, mitreId: 'T1098', timestamp: '2026-01-15T09:05:00Z' } },
  { id: 'resources', type: 'attackPath', position: { x: 770, y: 90  }, data: { label: 'EC2 + S3 + RDS', subLabel: 'All Resources', detail: 'admin-temp spins EC2, reads all S3 buckets, dumps RDS snapshots externally', icon: AmazonEc2, severity: 'critical' as Severity, riskScore: 96, mitreId: 'T1537', timestamp: '2026-01-15T09:06:00Z' } },
  { id: 'backdoor',  type: 'attackPath', position: { x: 770, y: 260 }, data: { label: 'Backdoor IAM User', subLabel: 'Persistence', detail: 'iam:CreateUser → attacker-persist — fresh access key, added to admin group', icon: AwsIdentityAndAccessManagement, severity: 'critical' as Severity, riskScore: 93, mitreId: 'T1136', timestamp: '2026-01-15T09:07:00Z' } },
  { id: 'cloudtrail',type: 'attackPath', position: { x: 980, y: 180 }, data: { label: 'CloudTrail', subLabel: 'Detection', detail: 'wolfir detected AssumeRole chain — 6 anomalous API calls in 8 minutes', icon: AwsCloudTrail, severity: 'low' as Severity, mitreId: 'T1562', timestamp: '2026-01-15T09:08:00Z', nodeRole: 'detection' } },
];
const DEMO_EDGES_PRIV_BASE = [
  { id: 'e1', source: 'internet',   target: 'console'   },
  { id: 'e2', source: 'console',    target: 'iam-user'  },
  { id: 'e3', source: 'iam-user',   target: 'dev-role'  },
  { id: 'e4', source: 'iam-user',   target: 'admin-role'},
  { id: 'e5', source: 'dev-role',   target: 'resources' },
  { id: 'e6', source: 'admin-role', target: 'resources' },
  { id: 'e7', source: 'admin-role', target: 'backdoor'  },
  { id: 'e8', source: 'backdoor',   target: 'cloudtrail'},
  { id: 'e9', source: 'resources',  target: 'cloudtrail'},
];
const DEMO_EDGES_PRIV: Edge[] = buildEdgesWithSeverity(DEMO_EDGES_PRIV_BASE, DEMO_NODES_PRIV);
const EDGE_LABELS_PRIV: Record<string, string> = {
  e1: 'Stolen Keys', e2: 'Console Login', e3: 'AssumeRole', e4: 'AssumeRole',
  e5: 'Admin API', e6: 'Admin API', e7: 'CreateUser', e8: 'Logged', e9: 'Logged',
};

// ── CRYPTO MINING SCENARIO ─────────────────────────────────────────────────
const INFRA_GROUPS_CRYPTO: Node[] = [
  { id: 'grp-account', type: 'group', position: { x: 130, y: 15 }, zIndex: -10,
    style: { width: 1020, height: 360, pointerEvents: 'none' },
    data: { label: 'AWS Account · us-east-1 (Crypto Mining Attack)', color: '#d97706', bg: 'rgba(217,119,6,0.05)' }, draggable: false, selectable: false },
  { id: 'grp-compute', type: 'group', position: { x: 310, y: 48 }, zIndex: -8,
    style: { width: 620, height: 272, pointerEvents: 'none' },
    data: { label: 'EC2 Spot Fleet — 5 g4dn.xlarge GPU Instances', color: '#ea580c', bg: 'rgba(234,88,12,0.05)' }, draggable: false, selectable: false },
];
const DEMO_NODES_CRYPTO: Node[] = [
  ...INFRA_GROUPS_CRYPTO,
  { id: 'internet', type: 'attackPath', position: { x: 30,  y: 185 }, data: { label: 'Attacker', subLabel: 'Stolen Credentials', detail: 'IAM key leaked via public GitHub repo — AKIA… hardcoded in source code', icon: Globe, severity: 'high' as Severity, mitreId: 'T1552', timestamp: '2026-01-15T10:00:00Z', nodeRole: 'attacker' } },
  { id: 'iam',     type: 'attackPath', position: { x: 205, y: 185 }, data: { label: 'IAM Role', subLabel: 'ec2-deploy-role', detail: 'ec2:RunInstances + ec2:RequestSpotInstances — no resource boundary set', icon: AwsIdentityAndAccessManagement, severity: 'critical' as Severity, riskScore: 94, mitreId: 'T1078', timestamp: '2026-01-15T10:02:00Z' } },
  { id: 'spot1',   type: 'attackPath', position: { x: 400, y: 78  }, data: { label: 'Spot Instance #1', subLabel: 'g4dn.xlarge GPU', detail: 'XMRig 6.21 — Monero mining at 4.2 kH/s — $0.52/hr', icon: AmazonEc2, severity: 'critical' as Severity, riskScore: 99, mitreId: 'T1496', timestamp: '2026-01-15T10:03:00Z' } },
  { id: 'spot2',   type: 'attackPath', position: { x: 600, y: 78  }, data: { label: 'Spot Instance #2', subLabel: 'g4dn.xlarge GPU', detail: 'XMRig 6.21 — pool.minexmr.com:4444 outbound C2 traffic', icon: AmazonEc2, severity: 'critical' as Severity, riskScore: 99, mitreId: 'T1496', timestamp: '2026-01-15T10:03:15Z' } },
  { id: 'spot3',   type: 'attackPath', position: { x: 500, y: 238 }, data: { label: 'Spot Fleet ×3 More', subLabel: 'Auto Scaling Group', detail: 'ASG spawned 3 more g4dn instances — 5 total · $2,400 bill in 4 hours', icon: AmazonEc2, severity: 'high' as Severity, riskScore: 98, mitreId: 'T1496', timestamp: '2026-01-15T10:05:00Z' } },
  { id: 'sg',      type: 'attackPath', position: { x: 830, y: 78  }, data: { label: 'Security Group', subLabel: 'Opened by Attacker', detail: 'Outbound port 4444 (Monero pool) and 8333 (Bitcoin) opened via AuthorizeSecurityGroupEgress', icon: AwsShield, severity: 'high' as Severity, riskScore: 80, mitreId: 'T1071', timestamp: '2026-01-15T10:06:00Z' } },
  { id: 'billing', type: 'attackPath', position: { x: 830, y: 258 }, data: { label: 'AWS Billing', subLabel: '$2,400 Spike', detail: 'CloudWatch billing alert at $500 threshold — attack already at $2,400 by then', icon: AlertTriangle, severity: 'critical' as Severity, riskScore: 100, mitreId: 'T1496', timestamp: '2026-01-15T14:00:00Z' } },
  { id: 'cloudtrail',type:'attackPath', position: { x: 1060, y: 175 }, data: { label: 'GuardDuty + CT', subLabel: 'Detection', detail: 'GuardDuty: CryptoCurrency:EC2/BitcoinTool.B — wolfir triggered auto-quarantine', icon: AwsCloudTrail, severity: 'low' as Severity, mitreId: 'T1562', timestamp: '2026-01-15T14:01:00Z', nodeRole: 'detection' } },
];
const DEMO_EDGES_CRYPTO_BASE = [
  { id: 'e1', source: 'internet', target: 'iam'       },
  { id: 'e2', source: 'iam',      target: 'spot1'     },
  { id: 'e3', source: 'iam',      target: 'spot2'     },
  { id: 'e4', source: 'iam',      target: 'spot3'     },
  { id: 'e5', source: 'spot1',    target: 'sg'        },
  { id: 'e6', source: 'spot2',    target: 'sg'        },
  { id: 'e7', source: 'spot3',    target: 'billing'   },
  { id: 'e8', source: 'sg',       target: 'cloudtrail'},
  { id: 'e9', source: 'billing',  target: 'cloudtrail'},
];
const DEMO_EDGES_CRYPTO: Edge[] = buildEdgesWithSeverity(DEMO_EDGES_CRYPTO_BASE, DEMO_NODES_CRYPTO);
const EDGE_LABELS_CRYPTO: Record<string, string> = {
  e1: 'Stolen Key', e2: 'RunInstances', e3: 'RunInstances', e4: 'RunInstances',
  e5: 'C2 Traffic', e6: 'C2 Traffic', e7: 'Billing Alert', e8: 'Logged', e9: 'Logged',
};

// Extra node detail entries for new scenario nodes
const NODE_EXTRA_EXT: Record<string, NodeExtra> = {
  console:     { what: 'AWS Console accessed with stolen credentials — no MFA enforced. Attacker had full management console access.', implications: ['No MFA means any leaked password grants full console access', 'CloudTrail login-from-new-location alert not configured', 'No SCPs restricting console from non-corporate IPs'], checks: [{ label: 'MFA enforced for all IAM users', ok: false }, { label: 'IP-restricted SCP in place', ok: false }, { label: 'CloudTrail login anomaly alerts', ok: false }], attackStage: 'Initial Access' },
  'iam-user':  { what: 'IAM user contractor-temp has sts:AssumeRole without a permissions boundary — allows arbitrary role chaining.', implications: ['No permissions boundary = unconstrained role escalation', 'AssumeRole trust policy too permissive (allows any principal)', 'No max session duration configured'], checks: [{ label: 'Permissions boundary enforced', ok: false }, { label: 'Trust policy restricted to known principals', ok: false }, { label: 'Session duration ≤1 hour', ok: false }], attackStage: 'Privilege Escalation' },
  'dev-role':  { what: 'dev-role trusted contractor-temp without condition. Attacker pivoted into dev-role to access EC2 and S3 APIs.', implications: ['Trust policy lacks external-id or MFA condition', 'dev-role has inline policy with broad resource access', 'Role session tokens persisted for 12 hours'], checks: [{ label: 'Trust policy has external-id condition', ok: false }, { label: 'Inline policies removed, managed only', ok: false }, { label: 'Max session duration ≤1 hour', ok: false }], attackStage: 'Privilege Escalation' },
  'admin-role':{ what: 'admin-temp role has AdministratorAccess. Attacker chained from dev-role to gain full AWS control.', implications: ['AdministratorAccess = full cloud control — highest severity', 'Attacker can create new IAM users, modify billing, read all secrets', 'Role chain depth >2 is a red flag for lateral movement'], checks: [{ label: 'AdministratorAccess policy removed', ok: false }, { label: 'Role chain depth limit enforced via SCP', ok: false }, { label: 'Active sessions revoked immediately', ok: false }], attackStage: 'Privilege Escalation' },
  resources:   { what: 'With admin-temp, attacker accessed all EC2, S3, and RDS resources — potential data theft and infrastructure modification.', implications: ['All S3 buckets readable — data exfiltration risk', 'EC2 instances modifiable — can run arbitrary code', 'RDS snapshots shareable externally — full database dump'], checks: [{ label: 'S3 Block Public Access enabled', ok: true }, { label: 'EC2 IMDSv2 enforced on all instances', ok: false }, { label: 'RDS snapshot sharing restricted', ok: false }], attackStage: 'Collection' },
  backdoor:    { what: 'Attacker created a new IAM user attacker-persist with a fresh access key — ensures access even after contractor account is disabled.', implications: ['New user bypasses contractor account revocation', 'Access key active with no expiry configured', 'User added to admin group — full long-term persistence'], checks: [{ label: 'IAM Access Analyzer active', ok: false }, { label: 'CloudTrail alert on iam:CreateUser', ok: false }, { label: 'Unused users auto-disabled after 30 days', ok: false }], attackStage: 'Persistence' },
  spot1:       { what: 'GPU instance running XMRig Monero miner. Deployed via RunInstances with user-data script downloading miner from attacker-controlled S3.', implications: ['GPU compute is 50× more expensive than CPU — rapid billing spike', 'Miner persists via cron job in user-data', 'Instance profile may have additional IAM permissions'], checks: [{ label: 'GuardDuty CryptoCurrency finding reviewed', ok: false }, { label: 'EC2 user-data contents audited', ok: false }, { label: 'Spot fleet requests require tag approval', ok: false }], attackStage: 'Impact' },
  spot2:       { what: 'Second GPU instance — part of spot fleet. C2 traffic to pool.minexmr.com:4444 — standard Monero pool port.', implications: ['Outbound 4444 not blocked at VPC Network Firewall', 'Spot instances resume automatically if interrupted — attacker resilient', 'Multiple instances across AZs for redundancy'], checks: [{ label: 'Outbound port 4444/8333 blocked', ok: false }, { label: 'VPC Flow Logs enabled', ok: true }, { label: 'Spot instance approval workflow exists', ok: false }], attackStage: 'Impact' },
  spot3:       { what: 'Auto Scaling Group spawned 3 additional instances within 2 minutes — attacker configured ASG for rapid fleet expansion.', implications: ['ASG has no meaningful max capacity for cost control', 'EC2 vCPU service quota not reviewed', 'Each instance = additional miner and C2 channel'], checks: [{ label: 'ASG max capacity enforced with SCP', ok: false }, { label: 'EC2 vCPU service quota reviewed', ok: false }, { label: 'Cost anomaly alert at $100 threshold', ok: false }], attackStage: 'Impact' },
  billing:     { what: 'AWS billing alert fired at $500 threshold — but attack had already accumulated $2,400 in 4 hours. Alert threshold too high.', implications: ['$500 threshold too permissive — should be $50 for anomaly detection', 'Real-time Cost Anomaly Detection not enabled', 'Budget action to restrict IAM not configured'], checks: [{ label: 'Cost Anomaly Detection enabled', ok: false }, { label: 'Budget alert at $50 threshold', ok: false }, { label: 'Budget action blocks IAM role on breach', ok: false }], attackStage: 'Impact' },
};
Object.assign(NODE_EXTRA, NODE_EXTRA_EXT);

type ScenarioVariant = 'standard' | 'ai' | 'crypto' | 'priv-esc';

const SCENARIO_NODES: Record<ScenarioVariant, Node[]> = {
  standard:  DEMO_NODES_STANDARD,
  ai:        DEMO_NODES_AI,
  'priv-esc':DEMO_NODES_PRIV,
  crypto:    DEMO_NODES_CRYPTO,
};
const SCENARIO_EDGES: Record<ScenarioVariant, Edge[]> = {
  standard:  DEMO_EDGES_STANDARD,
  ai:        DEMO_EDGES_AI,
  'priv-esc':DEMO_EDGES_PRIV,
  crypto:    DEMO_EDGES_CRYPTO,
};
const SCENARIO_EDGE_LABELS: Record<ScenarioVariant, Record<string, string>> = {
  standard:  EDGE_LABELS_STANDARD,
  ai:        EDGE_LABELS_AI,
  'priv-esc':EDGE_LABELS_PRIV,
  crypto:    EDGE_LABELS_CRYPTO,
};
const SCENARIO_TITLES: Record<ScenarioVariant, string> = {
  standard:  'Multi-Vector Attack',
  ai:        'AI / LLM Prompt Injection Path',
  'priv-esc':'IAM Privilege Escalation Kill Chain',
  crypto:    'Crypto Mining via Stolen IAM Credentials',
};

function incidentTypeToVariant(incidentType?: string): ScenarioVariant {
  const t = (incidentType || '').toLowerCase();
  if (/shadow.?ai|llm|bedrock|prompt.?inj/i.test(t)) return 'ai';
  if (/priv|escalat|contractor|assume.?role/i.test(t)) return 'priv-esc';
  if (/crypto|mining|xmrig|monero|spot.?fleet/i.test(t)) return 'crypto';
  // Handle raw scenario IDs from client-side demo
  if (t === 'shadow-ai') return 'ai';
  if (t === 'privilege-escalation') return 'priv-esc';
  if (t === 'crypto-mining') return 'crypto';
  return 'standard';
}

interface TimelineEvent {
  timestamp?: string;
  actor?: string;
  action?: string;
  resource?: string;
  severity?: string;
  significance?: string;
}

/** Auto-generate a ReactFlow graph from real timeline events */
function generateNodesFromTimeline(events: TimelineEvent[]): { nodes: Node[]; edges: Edge[]; labels: Record<string, string> } {
  if (!events || events.length === 0) return { nodes: [], edges: [], labels: {} };

  // Deduplicate and extract meaningful nodes from event actions/resources
  const seen = new Set<string>();
  const nodeMap: Array<{ id: string; label: string; subLabel: string; detail: string; severity: Severity; icon: any; mitreId?: string; x: number; y: number }> = [];

  const actionToIcon: Array<[RegExp, any, string?]> = [
    [/internet|external|ip:/i, Globe, 'T1190'],
    [/consolelogin|console.login|signin/i, AlertTriangle, 'T1078'],
    [/iam|role|policy|user|group|assum/i, AwsIdentityAndAccessManagement, 'T1078'],
    [/s3|bucket|getobject|putobject|listbucket/i, AmazonSimpleStorageService, 'T1530'],
    [/ec2|instance|runinstance|spot/i, AmazonEc2, 'T1578'],
    [/rds|database|snapshot/i, AmazonRds, 'T1041'],
    [/secret|getscretvalue/i, AwsSecretsManager, 'T1552'],
    [/cloudtrail|stoplog|delettrail/i, AwsCloudTrail, 'T1562'],
    [/apigateway|api.gateway/i, AmazonApiGateway, 'T1190'],
    [/vpc|securitygroup|ingress/i, AmazonVirtualPrivateCloud, 'T1021'],
  ];

  const sortedEvents = [...events].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || '')).slice(0, 10);

  sortedEvents.forEach((e, idx) => {
    const combined = `${e.action || ''} ${e.resource || ''} ${e.actor || ''}`.toLowerCase();
    let icon = Globe, mitreId = 'T1078', label = 'Unknown', subLabel = '';
    for (const [pattern, ic, mid] of actionToIcon) {
      if (pattern.test(combined)) { icon = ic; if (mid) mitreId = mid; break; }
    }

    // Derive a human label from the action
    if (e.action) {
      const parts = e.action.split(':');
      label = parts.length > 1 ? parts[1] : e.action;
    } else if (e.resource) {
      label = e.resource.split('/').pop() || e.resource;
    }
    subLabel = e.actor?.split('/').pop() || e.actor || '';

    const nodeId = `auto-${idx}`;
    if (!seen.has(label)) {
      seen.add(label);
      const sev = ((e.severity || 'medium').toLowerCase()) as Severity;
      nodeMap.push({
        id: nodeId, label: label.slice(0, 22), subLabel: subLabel.slice(0, 24),
        detail: `${e.action || ''} — ${e.resource || ''}\n${e.significance || ''}`.trim().slice(0, 180),
        severity: ['critical', 'high', 'medium', 'low'].includes(sev) ? sev : 'medium',
        icon, mitreId,
        x: 60 + idx * 160, y: idx % 2 === 0 ? 180 : 80,
      });
    }
  });

  const nodes: Node[] = nodeMap.map(n => ({
    id: n.id, type: 'attackPath', position: { x: n.x, y: n.y },
    data: { label: n.label, subLabel: n.subLabel, detail: n.detail, icon: n.icon, severity: n.severity, mitreId: n.mitreId },
  }));

  const edges: Edge[] = nodeMap.slice(0, -1).map((n, i) => ({
    id: `e-auto-${i}`,
    source: n.id, target: nodeMap[i + 1].id,
    animated: true, type: 'default',
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#6366f1' },
    style: { stroke: '#6366f1', strokeWidth: 2 },
    label: sortedEvents[i]?.action?.split(':')[1] || '→',
    labelStyle: { fill: '#6366f1', fontSize: 9, fontWeight: 700 },
    labelBgStyle: { fill: '#eef2ff', rx: 4 },
    labelBgPadding: [4, 2] as [number, number],
  }));

  const labels: Record<string, string> = {};
  edges.forEach(e => { if (e.label) labels[e.id] = String(e.label); });

  return { nodes, edges, labels };
}

interface AttackPathReactFlowProps {
  variant?: 'standard' | 'ai';
  incidentType?: string;
  onNavigateToRemediation?: () => void;
  timeline?: { events?: TimelineEvent[] };
  /** Pass true when showing demo/offline data — forces scenario-based rich diagram with VPC/subnet/SG context */
  demoMode?: boolean;
}

function AttackPathReactFlowInner({ variant = 'standard', incidentType, onNavigateToRemediation, timeline, demoMode = false }: AttackPathReactFlowProps) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const flowRef = useRef<HTMLDivElement>(null);
  const sv: ScenarioVariant = incidentType ? incidentTypeToVariant(incidentType) : (variant as ScenarioVariant);

  // Auto-generate from real timeline events only when connected to a REAL AWS account (not demo)
  // In demo mode always use the rich scenario diagrams with VPC/subnet/SG group boxes
  const timelineEvents = timeline?.events;
  const isAutoGenerated = !demoMode && !!(timelineEvents && timelineEvents.length >= 3 && !timelineEvents.every(e => !e.timestamp));
  const autoGraph = useMemo(() => isAutoGenerated ? generateNodesFromTimeline(timelineEvents!) : null, [isAutoGenerated, timelineEvents]);

  const initialNodes = autoGraph?.nodes ?? SCENARIO_NODES[sv];
  const initialEdges = autoGraph?.edges ?? SCENARIO_EDGES[sv];
  const resolvedEdgeLabels = autoGraph?.labels ?? SCENARIO_EDGE_LABELS[sv];

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayPaused, setReplayPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Exclude infra group nodes from replay/search — only real service nodes
  const nodesList = (autoGraph?.nodes ?? SCENARIO_NODES[sv]).filter(n => n.type !== 'group');
  const edgesList = autoGraph?.edges ?? SCENARIO_EDGES[sv];
  const edgeLabels = resolvedEdgeLabels;

  const replayOrder = useMemo(() => {
    return [...nodesList].sort((a, b) => {
      const ta = (a.data as NodeData).timestamp ?? '9999-12-31T23:59:59Z';
      const tb = (b.data as NodeData).timestamp ?? '9999-12-31T23:59:59Z';
      return ta.localeCompare(tb);
    });
  }, [nodesList]);
  const searchLower = searchQuery.toLowerCase().trim();
  const filteredNodes = searchLower ? nodesList.filter(n => (n.data as NodeData).label.toLowerCase().includes(searchLower) || (n.data as NodeData).subLabel.toLowerCase().includes(searchLower)) : nodesList;
  const hasSearchMatch = searchLower && filteredNodes.length > 0;

  const selectedNodeData = selectedNode ? (nodesList.find((n) => n.id === selectedNode)?.data as NodeData) : null;

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  const focusNode = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    setSearchQuery('');
    const node = nodesList.find(n => n.id === nodeId);
    if (node) setCenter(node.position.x + 60, node.position.y + 40, { zoom: 1, duration: 300 });
  }, [nodesList, setCenter]);

  const exportPng = useCallback(async () => {
    const el = flowRef.current?.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: '#f1f5f9', scale: 2 });
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch {
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.png`;
      a.href = 'data:text/plain,Export failed';
      a.click();
    }
  }, []);

  const exportSvg = useCallback(async () => {
    const svgEl = flowRef.current?.querySelector('.react-flow__edges')?.parentElement?.querySelector('svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.svg`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      exportPng();
    }
  }, [exportPng]);

  const toggleFullscreen = useCallback(async () => {
    const container = flowRef.current?.closest('.attack-path-flow-container');
    if (!container) return;
    try {
      if (!document.fullscreenElement) {
        await (container as HTMLElement).requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!replayMode || replayPaused || replayIndex >= replayOrder.length - 1) return;
    const delay = 1500 / replaySpeed;
    const id = setInterval(() => setReplayIndex(prev => Math.min(prev + 1, replayOrder.length - 1)), delay);
    return () => clearInterval(id);
  }, [replayMode, replayPaused, replayIndex, replayOrder.length, replaySpeed]);

  const visibleNodeIds = useMemo(() => {
    if (!replayMode || replayIndex < 0) return new Set(nodesList.map(n => n.id));
    return new Set(replayOrder.slice(0, replayIndex + 1).map(n => n.id));
  }, [replayMode, replayIndex, replayOrder, nodesList]);

  const visibleEdgeIds = useMemo(() => {
    if (!replayMode || replayIndex < 0) return new Set(edgesList.map(e => e.id));
    const visible = visibleNodeIds;
    return new Set(edgesList.filter(e => visible.has(e.source) && visible.has(e.target)).map(e => e.id));
  }, [replayMode, replayIndex, edgesList, visibleNodeIds]);

  const displayNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      // Infra group nodes (grp-*) are always visible — they are background layers, not part of replay
      hidden: n.type === 'group' ? false : !visibleNodeIds.has(n.id),
      className: hasSearchMatch && !filteredNodes.find(f => f.id === n.id) ? 'opacity-30' : '',
    }));
  }, [nodes, visibleNodeIds, hasSearchMatch, filteredNodes]);

  const displayEdges = useMemo(() => {
    return edges.map(e => ({
      ...e,
      hidden: !visibleEdgeIds.has(e.id),
    }));
  }, [edges, visibleEdgeIds]);

  const edgesWithLabels = useMemo(() => {
    return displayEdges.map(e => ({
      ...e,
      label: edgeLabels[e.id],
      labelStyle: { fill: '#334155', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
      labelBgBorderRadius: 4,
      labelBgPadding: [4, 8] as [number, number],
    }));
  }, [displayEdges, edgeLabels]);

  return (
    <div ref={flowRef} className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-white flex flex-col min-h-0 attack-path-flow-container">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/30">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <IconAttackPath className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              Attack Path Graph
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  sv === 'ai' ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : sv === 'priv-esc' ? 'bg-red-50 text-red-700 border-red-200'
                  : sv === 'crypto' ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isAutoGenerated ? 'Live Attack Path — Auto-Generated' : SCENARIO_TITLES[sv]}
              </span>
              {isAutoGenerated && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold ml-1">LIVE</span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAutoGenerated
                ? `${nodesList.length} nodes auto-generated from ${timelineEvents!.length} CloudTrail events · click any node to inspect`
                : (sv === 'ai' ? 'Internet → API Gateway → Bedrock → IAM → S3'
                   : sv === 'priv-esc' ? 'Stolen Creds → Console → IAM Role Chain → All Resources → Backdoor'
                   : sv === 'crypto' ? 'Stolen Key → IAM → EC2 GPU Fleet → Crypto Miner → $2,400 Billing Spike'
                   : 'Internet → VPC → EC2 → IAM → RDS'
                  ) + ' · click any node to inspect'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {hasSearchMatch && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                {filteredNodes.slice(0, 5).map((n) => (
                  <button key={n.id} type="button" onClick={() => focusNode(n.id)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                    {(n.data as NodeData).label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!replayMode ? (
            <button
              onClick={() => { setReplayMode(true); setReplayIndex(0); setReplayPaused(false); }}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Replay Attack
            </button>
          ) : null}
          <div className="flex gap-1">
            <button onClick={exportPng} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1" title="Download PNG">
              <Download className="w-3 h-3" /> PNG
            </button>
            <button onClick={exportSvg} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title="Download SVG">SVG</button>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legend:</span>
          <div className="flex gap-4" title="Node color = severity level">
            {[
              { color: 'bg-red-700', label: 'Critical' },
              { color: 'bg-orange-600', label: 'High' },
              { color: 'bg-blue-600', label: 'Medium' },
              { color: 'bg-emerald-600', label: 'Monitored' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => zoomOut()} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm" title="Zoom out"><ZoomOut className="w-3.5 h-3.5 text-slate-600" /></button>
            <button onClick={() => fitView({ duration: 200 })} className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white rounded-md" title="Fit view">Fit</button>
            <button onClick={() => zoomIn()} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm" title="Zoom in"><ZoomIn className="w-3.5 h-3.5 text-slate-600" /></button>
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            <button onClick={toggleFullscreen} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-600" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      {replayMode && (
        <div className="px-6 py-3 border-b border-slate-200 bg-indigo-50/50 flex items-center gap-4 flex-wrap">
          <button onClick={() => setReplayPaused(p => !p)} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-indigo-100 text-indigo-700 shadow-sm" title={replayPaused ? 'Play' : 'Pause'}>
            {replayPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <button key={s} onClick={() => setReplaySpeed(s)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${replaySpeed === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'}`}>{s}x</button>
            ))}
          </div>
          <button onClick={() => { setReplayIndex(0); setReplayPaused(false); }} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600" title="Reset"><RotateCcw className="w-4 h-4" /></button>
          <div className="flex-1 min-w-[120px]">
            <div className="text-[10px] font-semibold text-slate-600">
              {replayIndex >= 0 && replayIndex < replayOrder.length ? (replayOrder[replayIndex]?.data as NodeData)?.timestamp?.slice(0, 19).replace('T', ' ') : '—'}
            </div>
            <div className="h-1 mt-1 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all" style={{ width: replayOrder.length > 0 ? `${((replayIndex + 1) / replayOrder.length) * 100}%` : '0%' }} />
            </div>
          </div>
          <button onClick={() => { setReplayMode(false); setReplayIndex(-1); setReplayPaused(false); }} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600">Exit Replay</button>
        </div>
      )}

      <div className="flex flex-col">
        <div className="h-[480px] bg-slate-50/30 relative w-full shrink-0">
          <ReactFlow
            nodes={displayNodes}
            edges={edgesWithLabels}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="rounded-b-xl"
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e2e8f0" gap={20} />
          </ReactFlow>
        </div>
        <div className="border-t border-slate-200 bg-white overflow-y-auto shrink-0" style={{ maxHeight: 280 }}>
          {selectedNodeData ? (() => {
            const extra = NODE_EXTRA[selectedNode ?? ''];
            const sevCls = selectedNodeData.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
              selectedNodeData.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
              selectedNodeData.severity === 'low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              'bg-blue-50 text-blue-700 border-blue-200';
            const mitre = selectedNodeData.mitreId ? MITRE_MAP[selectedNodeData.mitreId] : null;
            return (
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => { const Icon = selectedNodeData.icon; const color = SEVERITY_COLORS[selectedNodeData.severity] ?? '#64748b'; return AWS_ICONS.has(Icon as any) ? <Icon size={22} color={color} /> : <Icon className="w-5 h-5" color={color} />; })()}
                  <span className="text-sm font-bold text-slate-900">{selectedNodeData.label}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${sevCls}`}>{selectedNodeData.severity.toUpperCase()}</span>
                  {selectedNodeData.riskScore != null && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white">{selectedNodeData.riskScore}/100</span>}
                  {extra && <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wide">{extra.attackStage}</span>}
                </div>

                {/* What happened here */}
                {extra && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">What this node is</p>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{extra.what}</p>
                  </div>
                )}

                {/* Observed detail */}
                <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Observed Activity</p>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">{selectedNodeData.detail}</p>
                  {selectedNodeData.timestamp && <p className="text-[9px] text-indigo-400 mt-1 font-mono">{selectedNodeData.timestamp}</p>}
                </div>

                {/* Attack implications */}
                {extra?.implications && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Attack Implications</p>
                    <ul className="space-y-1">
                      {extra.implications.map((imp, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                          <span className="text-red-400 mt-0.5 shrink-0">▸</span>
                          {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Security checks */}
                {extra?.checks && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Security Checks</p>
                    <div className="space-y-1">
                      {extra.checks.map((chk, i) => (
                        <div key={i} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium ${chk.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                          <span className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center rounded-full text-white text-[9px] font-bold ${chk.ok ? 'bg-emerald-500' : 'bg-red-500'}`}>{chk.ok ? '✓' : '✗'}</span>
                          {chk.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MITRE ATT&CK */}
                {selectedNodeData.mitreId && (
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">MITRE ATT&CK</p>
                      <a href={mitre?.url ?? `https://attack.mitre.org/techniques/${selectedNodeData.mitreId}/`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-indigo-400 hover:text-indigo-300">View →</a>
                    </div>
                    <p className="text-[11px] font-bold text-white font-mono">{selectedNodeData.mitreId}{mitre ? ` · ${mitre.name}` : ''}</p>
                    {mitre && <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{mitre.desc}</p>}
                  </div>
                )}

                {/* Action */}
                {onNavigateToRemediation && (selectedNodeData.severity === 'critical' || selectedNodeData.severity === 'high') && (
                  <button onClick={onNavigateToRemediation} className="w-full mt-1 px-3 py-2 text-[11px] font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                    View Remediation Plan →
                  </button>
                )}
              </div>
            );
          })() : (
            <div className="px-6 py-3 flex items-center justify-center gap-2 text-slate-400">
              <Shield className="w-4 h-4 text-slate-300" />
              <p className="text-xs font-medium text-slate-500">Click any node to inspect MITRE techniques, attack implications, and security checks</p>
            </div>
          )}
        </div>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
        <strong>Tip:</strong> Drag nodes to rearrange. Arrows show data flow and potential attack paths.
      </div>
    </div>
  );
}

const AttackPathReactFlow: React.FC<AttackPathReactFlowProps> = (props) => (
  <ReactFlowProvider>
    <AttackPathReactFlowInner {...props} />
  </ReactFlowProvider>
);

export default AttackPathReactFlow;
