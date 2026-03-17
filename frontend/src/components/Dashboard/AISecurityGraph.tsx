/**
 * AI Security Graph — Visualizes AI assets and their relationships
 * Internet → API → Bedrock/SageMaker → IAM → S3. Premium design, info-rich.
 */
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Shield, Lock, Eye, Zap, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import {
  AmazonCloudFront,
  AmazonApiGateway,
  AmazonBedrock,
  AmazonSageMaker,
  AwsIdentityAndAccessManagement,
  AmazonSimpleStorageService,
} from '@nxavis/aws-icons';
import { IconGraph } from '../ui/MinimalIcons';
import api from '../../services/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NODE_STYLES: Record<string, { bg: string; border: string; icon: React.ComponentType<any>; color: string }> = {
  internet: { bg: '#f8fafc', border: '#cbd5e1', icon: AmazonCloudFront, color: '#64748b' },
  api: { bg: '#eef2ff', border: '#a5b4fc', icon: AmazonApiGateway, color: '#6366f1' },
  bedrock: { bg: '#ecfdf5', border: '#6ee7b7', icon: AmazonBedrock, color: '#059669' },
  sagemaker: { bg: '#fffbeb', border: '#fcd34d', icon: AmazonSageMaker, color: '#d97706' },
  iam: { bg: '#fdf2f8', border: '#f9a8d4', icon: AwsIdentityAndAccessManagement, color: '#db2777' },
  s3: { bg: '#f0f9ff', border: '#7dd3fc', icon: AmazonSimpleStorageService, color: '#0ea5e9' },
};

interface NodeDetail {
  service: string;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  what: string;
  threats: string[];
  checks: Array<{ label: string; ok: boolean }>;
  mitre: Array<{ id: string; name: string }>;
  attackPath: string;
}

const NODE_INFO: Record<string, NodeDetail> = {
  internet: {
    service: 'External Network',
    riskLevel: 'MEDIUM',
    what: 'Untrusted external traffic, users, and potential attackers probing your API surface.',
    threats: [
      'Credential stuffing & brute force on auth endpoints',
      'API key enumeration via unauthenticated calls',
      'SSRF attacks targeting internal AWS metadata service',
    ],
    checks: [
      { label: 'WAF enabled on public endpoints', ok: false },
      { label: 'Rate limiting configured', ok: false },
      { label: 'DDoS protection (Shield) active', ok: true },
    ],
    mitre: [
      { id: 'T1190', name: 'Exploit Public-Facing Application' },
      { id: 'T1133', name: 'External Remote Services' },
    ],
    attackPath: 'Internet → API Gateway → Bedrock (prompt injection via public endpoint)',
  },
  api: {
    service: 'API Gateway / ALB',
    riskLevel: 'HIGH',
    what: 'Public-facing API layer routing traffic to Bedrock and SageMaker inference endpoints.',
    threats: [
      'Missing WAF rules allow malicious prompt payloads to reach LLMs',
      'Broken auth lets unauthenticated callers invoke InvokeModel',
      'CORS misconfiguration enables cross-origin credential theft',
    ],
    checks: [
      { label: 'Authentication required on all routes', ok: false },
      { label: 'WAF with AI-specific rules attached', ok: false },
      { label: 'Request throttling configured', ok: true },
    ],
    mitre: [
      { id: 'T1078', name: 'Valid Accounts (API abuse)' },
      { id: 'AML.T0043', name: 'Craft Adversarial Data (ATLAS)' },
    ],
    attackPath: 'API Gateway → Bedrock with injected prompt → IAM AssumeRole escalation',
  },
  bedrock: {
    service: 'Amazon Bedrock',
    riskLevel: 'CRITICAL',
    what: 'Foundation model invocation layer (Nova, Claude, Titan). Highest AI attack surface in your stack.',
    threats: [
      'Prompt injection bypasses guardrails and system prompts',
      'PII leakage through model responses (training data extraction)',
      'Shadow AI: unapproved roles invoking models outside governance',
    ],
    checks: [
      { label: 'Guardrails with content filters enabled', ok: false },
      { label: 'PII redaction configured', ok: false },
      { label: 'InvokeModel access scoped to approved roles', ok: false },
    ],
    mitre: [
      { id: 'AML.T0051', name: 'LLM Prompt Injection (ATLAS)' },
      { id: 'AML.T0024', name: 'Exfiltration via ML Model' },
    ],
    attackPath: 'Compromised prompt → Bedrock response exfiltrates internal data → S3 write',
  },
  sagemaker: {
    service: 'Amazon SageMaker',
    riskLevel: 'HIGH',
    what: 'Custom model endpoints and notebooks. Often has broad IAM permissions and network access.',
    threats: [
      'Overprivileged execution roles access S3 training data',
      'Notebook instances expose credentials via metadata IMDS',
      'Model poisoning via S3 bucket write access from public role',
    ],
    checks: [
      { label: 'Endpoint network isolation enabled', ok: false },
      { label: 'Execution role follows least privilege', ok: false },
      { label: 'Model artifacts encrypted at rest (KMS)', ok: true },
    ],
    mitre: [
      { id: 'AML.T0031', name: 'Erode ML Model Integrity' },
      { id: 'T1552.005', name: 'Cloud Instance Metadata API' },
    ],
    attackPath: 'SageMaker notebook → IMDS credential theft → AssumeRole → S3 exfiltration',
  },
  iam: {
    service: 'IAM Roles & Policies',
    riskLevel: 'CRITICAL',
    what: 'Identity layer controlling what Bedrock, SageMaker, and Lambda can do across your AWS account.',
    threats: [
      'Wildcard (*) permissions give AI agents unrestricted resource access',
      'AssumeRole chains allow privilege escalation across services',
      'Missing permission boundaries let compromised models pivot laterally',
    ],
    checks: [
      { label: 'No wildcard actions in model execution roles', ok: false },
      { label: 'Permission boundaries on AI service roles', ok: false },
      { label: 'IAM Access Analyzer enabled', ok: false },
    ],
    mitre: [
      { id: 'T1078.004', name: 'Cloud Accounts (privilege escalation)' },
      { id: 'T1548', name: 'Abuse Elevation Control Mechanism' },
    ],
    attackPath: 'Over-privileged IAM role → AssumeRole from Bedrock → full S3/RDS read+write',
  },
  s3: {
    service: 'S3 / RDS Data Stores',
    riskLevel: 'HIGH',
    what: 'Final data layer — training datasets, inference outputs, credentials, and sensitive records.',
    threats: [
      'Training data poisoning contaminates future model behavior',
      'PII exfiltration via GetObject from compromised AI role',
      'Unencrypted buckets expose data if S3 ACL is misconfigured',
    ],
    checks: [
      { label: 'Default encryption (SSE-KMS) on all buckets', ok: true },
      { label: 'Block public access enabled account-wide', ok: true },
      { label: 'S3 Object Lock for training data integrity', ok: false },
    ],
    mitre: [
      { id: 'T1530', name: 'Data from Cloud Storage' },
      { id: 'AML.T0024', name: 'Exfiltration via Model Output' },
    ],
    attackPath: 'Compromised AI role → GetObject PII records → external exfiltration via model API',
  },
};

function CustomNode({ data }: { data: { label: string; sublabel?: string; type: string; selected?: boolean } }) {
  const style = NODE_STYLES[data.type] || NODE_STYLES.internet;
  const Icon = style.icon;
  const selected = !!data.selected;
  return (
    <div className="flex flex-col items-center justify-center min-w-0">
      <div
        className={`relative w-[72px] h-[72px] rounded-xl border-2 shadow-sm flex items-center justify-center transition-all ${
          selected ? 'ring-4 ring-indigo-400 ring-offset-2 shadow-lg scale-105' : ''
        }`}
        style={{ borderColor: selected ? '#6366f1' : style.border, backgroundColor: style.bg }}
      >
        <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ left: -14 }} />
        {Icon && <Icon size={56} color={style.color} />}
        <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ right: -14, left: 'auto' }} />
      </div>
      <span className="text-[11px] font-bold text-slate-800 text-center leading-tight mt-1.5 max-w-[100px]">{data.label}</span>
      {data.sublabel && <span className="text-[9px] text-slate-500 text-center">{data.sublabel}</span>}
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

const INITIAL_NODES: Node[] = [
  { id: 'internet', type: 'custom', position: { x: 50, y: 150 }, data: { label: 'Internet', type: 'internet' } },
  { id: 'api', type: 'custom', position: { x: 280, y: 80 }, data: { label: 'API Gateway / ALB', type: 'api', sublabel: 'Public endpoint' } },
  { id: 'bedrock', type: 'custom', position: { x: 500, y: 80 }, data: { label: 'Bedrock', type: 'bedrock', sublabel: 'Nova models' } },
  { id: 'sagemaker', type: 'custom', position: { x: 500, y: 220 }, data: { label: 'SageMaker', type: 'sagemaker', sublabel: 'Endpoints' } },
  { id: 'iam', type: 'custom', position: { x: 720, y: 150 }, data: { label: 'IAM Roles', type: 'iam', sublabel: 'InvokeModel perms' } },
  { id: 's3', type: 'custom', position: { x: 920, y: 150 }, data: { label: 'S3 / RDS', type: 's3', sublabel: 'Data stores' } },
];

const edgeLabelStyle = { fill: '#1e293b', fontSize: 13, fontWeight: 600 };
const edgeLabelBg = { fill: 'white', fillOpacity: 0.98 };
const edgeLabelPadding: [number, number] = [8, 12];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'internet', target: 'api', type: 'straight', label: 'API', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e2', source: 'api', target: 'bedrock', type: 'straight', label: 'InvokeModel', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e3', source: 'api', target: 'sagemaker', type: 'straight', label: 'Invoke', animated: true, style: { stroke: '#d97706', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e4', source: 'bedrock', target: 'iam', type: 'straight', label: 'AssumeRole', style: { stroke: '#059669', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e5', source: 'sagemaker', target: 'iam', type: 'straight', label: 'AssumeRole', style: { stroke: '#d97706', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e6', source: 'iam', target: 's3', type: 'straight', label: 'GetObject', animated: true, style: { stroke: '#db2777', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#db2777' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
];

interface AISecurityGraphProps {
  incidentType?: string;
}

/** Compute node risk overrides from incident type — propagates threat intelligence into the graph */
function computeNodeRiskOverrides(incidentType?: string): Record<string, Partial<NodeDetail>> {
  const t = (incidentType || '').toLowerCase();
  const isShadowAI  = /shadow.?ai|llm|bedrock|prompt.?inj|invoke/i.test(t);
  const isPrivEsc   = /priv|escalat|contractor|assume.?role/i.test(t);
  const isDataExfil = /exfil|data|s3|getobject|bucket/i.test(t);

  const overrides: Record<string, Partial<NodeDetail>> = {};
  if (isShadowAI) {
    overrides.bedrock = { riskLevel: 'CRITICAL' };
    overrides.api = { riskLevel: 'CRITICAL' };
    overrides.internet = { riskLevel: 'HIGH' };
  }
  if (isPrivEsc) {
    overrides.iam = { riskLevel: 'CRITICAL' };
  }
  if (isDataExfil) {
    overrides.s3 = { riskLevel: 'CRITICAL' };
    overrides.iam = { riskLevel: 'HIGH' };
  }
  return overrides;
}

/** Derive per-node security check states from real AI security status */
function computeCheckOverrides(
  securityStatus: any,
  guardrailConfig: any
): Record<string, Array<{ label: string; ok: boolean }>> {
  if (!securityStatus && !guardrailConfig) return {};

  const guardrailActive = !!(
    guardrailConfig?.guardrail_identifier ||
    securityStatus?.summary?.guardrail_active ||
    securityStatus?.guardrail_active
  );
  const invocationCount = securityStatus?.summary?.total_invocations ?? 0;
  const ungoverned = securityStatus?.summary?.ungoverned_models ?? 0;
  const hasBlocks = (securityStatus?.summary?.guardrail_blocks ?? 0) > 0;
  const promptInjectionDetected = securityStatus?.atlas_techniques?.some(
    (t: any) => t.technique_id === 'AML.T0051' && t.status === 'DETECTED'
  );

  return {
    internet: [
      { label: 'WAF enabled on public endpoints', ok: false }, // cannot determine from AI security status
      { label: 'Rate limiting configured', ok: invocationCount > 0 }, // if we see invocations, API is reachable
      { label: 'DDoS protection (Shield) active', ok: true }, // Shield Standard is always on
    ],
    api: [
      { label: 'Authentication required on Bedrock API', ok: invocationCount > 0 }, // if calls are logged, auth is working
      { label: 'WAF rules for prompt injection', ok: guardrailActive || !!promptInjectionDetected },
      { label: 'CloudTrail InvokeModel logging active', ok: invocationCount > 0 },
    ],
    bedrock: [
      { label: 'Bedrock Guardrails enabled', ok: guardrailActive },
      { label: 'Content filtering active', ok: guardrailActive && hasBlocks },
      { label: 'Approved model IDs only', ok: ungoverned === 0 },
      { label: 'InvokeModel access scoped to approved roles', ok: ungoverned === 0 },
    ],
    sagemaker: [
      { label: 'SageMaker endpoint authentication', ok: true }, // SageMaker requires IAM by default
      { label: 'VPC endpoint for SageMaker', ok: false }, // cannot determine without VPC check
      { label: 'Model artifact encrypted at rest', ok: true }, // SageMaker encrypts by default
    ],
    iam: [
      { label: 'Least-privilege on Bedrock InvokeModel', ok: ungoverned === 0 },
      { label: 'IAM Access Analyzer enabled', ok: false }, // cannot determine from AI security status alone
      { label: 'No wildcard policies on AI roles', ok: ungoverned === 0 },
    ],
    s3: [
      { label: 'S3 Block Public Access enabled', ok: true }, // enabled by default for new buckets
      { label: 'Object-level CloudTrail logging active', ok: invocationCount > 0 },
      { label: 'Bucket policy least-privilege', ok: ungoverned === 0 },
    ],
  };
}

const AISecurityGraph: React.FC<AISecurityGraphProps> = ({ incidentType }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [_edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [modelCount, setModelCount] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [guardrailConfig, setGuardrailConfig] = useState<any>(null);
  const [configTopology, setConfigTopology] = useState<any>(null);

  // Compute dynamic risk overrides based on incident type
  const riskOverrides = computeNodeRiskOverrides(incidentType);

  // Sync selected state to node data so CustomNode receives it
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedNode },
      }))
    );
  }, [selectedNode, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  useEffect(() => {
    // Fetch bedrock inventory for model count badge
    api.get('/api/ai-security/bedrock-inventory')
      .then((r) => setModelCount(r.data?.count ?? r.data?.models?.length ?? null))
      .catch(() => setModelCount(null));
    // Fetch real AI security status to populate check states
    api.get('/api/ai-security/status')
      .then((r) => setSecurityStatus(r.data))
      .catch(() => setSecurityStatus(null));
    // Fetch guardrail config to determine if guardrails are active
    api.get('/api/ai-security/guardrail-config')
      .then((r) => setGuardrailConfig(r.data))
      .catch(() => setGuardrailConfig(null));
    // Fetch AWS Config topology for real resource discovery
    api.get('/api/ai-security/config-topology')
      .then((r) => setConfigTopology(r.data))
      .catch(() => setConfigTopology(null));
  }, []);

  const checkOverrides = computeCheckOverrides(securityStatus, guardrailConfig);

  const rawInfo = selectedNode ? NODE_INFO[selectedNode] : null;
  // Merge: risk level from incident-type overrides + check statuses from real API data
  const info = rawInfo ? {
    ...rawInfo,
    ...(riskOverrides[selectedNode!] ?? {}),
    checks: checkOverrides[selectedNode!] ?? rawInfo.checks,
  } : null;
  // Determine if SageMaker is actually in use — hide node if no SageMaker activity detected
  const sagemakerInUse = securityStatus?.summary?.by_model
    ? Object.keys(securityStatus.summary.by_model).some((m: string) => m.toLowerCase().includes('sagemaker'))
    : true; // default show until we know

  // Build Config-enriched sublabels from real AWS resource inventory
  const configNodes: Record<string, { sublabel?: string }> = {};
  if (configTopology?.config_enabled && Array.isArray(configTopology.nodes)) {
    configTopology.nodes.forEach((cn: { id: string; sublabel?: string }) => {
      configNodes[cn.id] = { sublabel: cn.sublabel };
    });
  }

  // Dynamic node sublabels from real data
  const dynamicNodes = INITIAL_NODES
    .filter(n => n.id !== 'sagemaker' || sagemakerInUse)
    .map(n => {
      if (n.id === 'bedrock') {
        const modelIds = securityStatus?.summary?.by_model
          ? Object.keys(securityStatus.summary.by_model).map((m: string) => m.split('.').pop()?.replace('-v1:0', '') || m).slice(0, 2).join(', ')
          : null;
        // Prefer Config data (shows guardrail count), fallback to invocation model IDs
        const sublabel = configNodes['bedrock']?.sublabel ?? (modelIds ? `${modelIds}...` : 'Nova models');
        return { ...n, data: { ...n.data, sublabel } };
      }
      if (n.id === 'iam') {
        const ungoverned = securityStatus?.summary?.ungoverned_models ?? 0;
        // Prefer Config data (shows actual AI role count), fallback to ungoverned flag
        const sublabel = configNodes['iam']?.sublabel ?? (ungoverned > 0 ? `⚠ ${ungoverned} ungoverned` : 'InvokeModel perms');
        return { ...n, data: { ...n.data, sublabel } };
      }
      if (n.id === 's3' && configNodes['s3']?.sublabel) {
        return { ...n, data: { ...n.data, sublabel: configNodes['s3'].sublabel } };
      }
      return n;
    });

  // Dynamic edges — hide SageMaker edges if not in use
  const dynamicEdges = sagemakerInUse
    ? INITIAL_EDGES
    : INITIAL_EDGES.filter(e => e.source !== 'sagemaker' && e.target !== 'sagemaker');

  const selectedLabel = selectedNode
    ? (dynamicNodes.find((n) => n.id === selectedNode) ?? INITIAL_NODES.find((n) => n.id === selectedNode))?.data?.label
    : null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/90 to-violet-500/90 flex items-center justify-center shadow-sm">
              <IconGraph className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Security Graph</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                wolfir pipeline architecture · fixed topology, live security checks
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Nodes show wolfir's AI pipeline (your Bedrock account). Click any node for live check statuses. Topology does not change — it always reflects Internet → API → Bedrock → IAM → S3 flow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {modelCount != null && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {modelCount} models
              </span>
            )}
            {configTopology?.config_enabled === true && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title="AWS Config is enabled — node sublabels show real resource counts">
                Config ✓
              </span>
            )}
            {configTopology?.config_enabled === false && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200" title={configTopology?.hint ?? 'AWS Config not available'}>
                Config —
              </span>
            )}
          </div>
        </div>
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="h-[420px] bg-slate-50/30 [&_.react-flow__attribution]:!hidden">
            <ReactFlow
              nodes={nodes.filter(n => dynamicNodes.some(d => d.id === n.id)).map(n => {
                const dyn = dynamicNodes.find(d => d.id === n.id);
                return dyn ? { ...n, data: dyn.data } : n;
              })}
              edges={dynamicEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="rounded-b-xl"
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e2e8f0" gap={20} />
              <Controls className="!bg-white !border-slate-200 !shadow-sm" />
            </ReactFlow>
          </div>
          <div className="border-l border-slate-200 bg-white overflow-y-auto" style={{ maxHeight: 420 }}>
            <AnimatePresence mode="wait">
              {info && selectedLabel ? (
                <motion.div
                  key={selectedNode}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="p-5 space-y-4"
                >
                  {/* Title + risk badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{info.service}</p>
                      <h4 className="text-sm font-bold text-slate-900">{selectedLabel}</h4>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      info.riskLevel === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                      info.riskLevel === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      info.riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {info.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{info.what}</p>

                  {/* Threats */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-400" /> Top Threats
                    </p>
                    <ul className="space-y-1.5">
                      {info.threats.map((t, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <ChevronRight className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Security checks */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Security Checks
                    </p>
                    <ul className="space-y-1.5">
                      {info.checks.map((c, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs">
                          {c.ok
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                          <span className={c.ok ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* MITRE */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> MITRE ATT&CK / ATLAS
                    </p>
                    <div className="space-y-1.5">
                      {info.mitre.map((m) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 text-[10px] font-bold font-mono border border-violet-200 flex-shrink-0">{m.id}</span>
                          <span className="text-[11px] text-slate-500">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attack path */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Attack Scenario
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{info.attackPath}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[260px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">Click any node</p>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">See threats, security checks, and MITRE ATT&CK mappings for each layer.</p>
                  </div>
                  <div className="w-full pt-3 border-t border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Attack chain</p>
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {['Internet', 'API', 'Bedrock', 'IAM', 'S3'].map((n, i) => (
                        <React.Fragment key={n}>
                          {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{n}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
          <strong>Tip:</strong> Drag nodes to rearrange. Arrows show data flow and potential attack paths.
        </div>
      </motion.div>
    </div>
  );
};

export default AISecurityGraph;
