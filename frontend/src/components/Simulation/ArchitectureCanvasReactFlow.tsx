/**
 * Architecture Canvas — React Flow version for Live Simulation
 * Fixed: no vibration (fitView called once via onInit, useNodesState for stable positions)
 * Premium: glowing nodes, animated attack path, threat actor tracker
 */
import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  Node,
  Edge,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  AmazonSimpleStorageService,
  AwsCloudTrail,
  AwsIdentityAndAccessManagement,
  AwsShield,
  AmazonEc2,
  AmazonCloudFront,
} from '@nxavis/aws-icons';

interface ArchitectureCanvasReactFlowProps {
  scenarioId: string;
  attackerPosition: 'internet' | 'iam' | 'iam2' | 'iam3' | 'ec2' | 's3' | 'contained' | null;
  compromisedResources: Set<string>;
  remediationStep: number;
  onNodeClick?: (nodeId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AWS_ICONS: Record<string, React.ComponentType<any>> = {
  internet: AmazonCloudFront,
  iam: AwsIdentityAndAccessManagement,
  ec2: AmazonEc2,
  s3: AmazonSimpleStorageService,
  sg: AwsShield,
  cloudtrail: AwsCloudTrail,
};

const LAYOUTS: Record<string, {
  nodes: Array<{ id: string; x: number; y: number; label: string; subLabel?: string; icon: string; mitreId?: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
}> = {
  // Matches AttackPathReactFlow 'crypto' variant topology
  'crypto-mining': {
    nodes: [
      { id: 'internet',   x: 60,  y: 200, label: 'Internet',      subLabel: 'External Origin',     icon: 'internet',   mitreId: 'T1190' },
      { id: 'iam',        x: 240, y: 200, label: 'IAM Role',       subLabel: 'contractor-temp',     icon: 'iam',        mitreId: 'T1078' },
      { id: 'ec2',        x: 430, y: 110, label: 'EC2 Spot ×3',   subLabel: 'p3.2xlarge GPU',      icon: 'ec2',        mitreId: 'T1578' },
      { id: 'sg',         x: 430, y: 290, label: 'Security Group', subLabel: 'sg-abc123 open',      icon: 'sg',         mitreId: 'T1021' },
      { id: 'cloudtrail', x: 640, y: 200, label: 'CloudTrail',     subLabel: 'GuardDuty alert',     icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam',        label: 'AssumeRole' },
      { from: 'iam',      to: 'ec2',        label: 'RunInstances' },
      { from: 'iam',      to: 'sg',         label: 'AuthorizeSG' },
      { from: 'ec2',      to: 'cloudtrail', label: 'Logged' },
      { from: 'sg',       to: 'cloudtrail', label: 'Logged' },
    ],
  },
  // Matches AttackPathReactFlow standard topology (internet → iam → s3 → cloudtrail)
  'data-exfiltration': {
    nodes: [
      { id: 'internet',   x: 60,  y: 200, label: 'Internet',     subLabel: 'External Actor',       icon: 'internet',   mitreId: 'T1190' },
      { id: 'iam',        x: 250, y: 200, label: 'IAM',          subLabel: 'data-analyst role',    icon: 'iam',        mitreId: 'T1078' },
      { id: 's3',         x: 450, y: 130, label: 'S3 Bucket',    subLabel: 'company-sensitive-db', icon: 's3',         mitreId: 'T1530' },
      { id: 'ec2',        x: 450, y: 270, label: 'RDS Database',  subLabel: 'prod-mysql-instance',  icon: 'ec2',        mitreId: 'T1213' },
      { id: 'cloudtrail', x: 660, y: 200, label: 'CloudTrail',   subLabel: 'Monitoring',           icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam',        label: 'Authenticate' },
      { from: 'iam',      to: 's3',         label: 'GetObject ×4K' },
      { from: 'iam',      to: 'ec2',        label: 'SELECT *' },
      { from: 's3',       to: 'cloudtrail', label: 'Logged' },
      { from: 'ec2',      to: 'cloudtrail', label: 'Logged' },
    ],
  },
  // Matches AttackPathReactFlow 'priv-esc' variant topology
  'privilege-escalation': {
    nodes: [
      { id: 'internet',   x: 50,  y: 200, label: 'Stolen Creds',  subLabel: 'junior-dev leaked',   icon: 'internet',   mitreId: 'T1078' },
      { id: 'iam',        x: 230, y: 200, label: 'IAM User',       subLabel: 'junior-dev (low priv)',icon: 'iam',        mitreId: 'T1098' },
      { id: 'iam2',       x: 430, y: 120, label: 'Admin Role',     subLabel: 'contractor-temp admin',icon: 'iam',        mitreId: 'T1098' },
      { id: 'iam3',       x: 430, y: 280, label: 'Backdoor User',  subLabel: 'CreateUser + keys',   icon: 'iam',        mitreId: 'T1136' },
      { id: 'cloudtrail', x: 640, y: 200, label: 'CloudTrail',     subLabel: 'Monitoring',          icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam',        label: 'Login' },
      { from: 'iam',      to: 'iam2',       label: 'AssumeRole' },
      { from: 'iam2',     to: 'iam3',       label: 'CreateUser' },
      { from: 'iam2',     to: 'cloudtrail', label: 'Logged' },
      { from: 'iam3',     to: 'cloudtrail', label: 'Logged' },
    ],
  },
  // Same as data-exfiltration but secrets-focused
  'unauthorized-access': {
    nodes: [
      { id: 'internet',   x: 60,  y: 200, label: 'Internet',     subLabel: '198.51.100.100',        icon: 'internet',   mitreId: 'T1190' },
      { id: 'iam',        x: 260, y: 200, label: 'IAM Role',     subLabel: 'external-user',         icon: 'iam',        mitreId: 'T1078' },
      { id: 's3',         x: 460, y: 130, label: 'S3 Secrets',   subLabel: 'company-secrets-bucket',icon: 's3',         mitreId: 'T1552' },
      { id: 'ec2',        x: 460, y: 270, label: 'Secrets Mgr',  subLabel: 'prod/db/credentials',   icon: 'ec2',        mitreId: 'T1555' },
      { id: 'cloudtrail', x: 660, y: 200, label: 'CloudTrail',   subLabel: 'Monitoring',            icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam',        label: 'AssumeRole' },
      { from: 'iam',      to: 's3',         label: 'GetSecretValue' },
      { from: 'iam',      to: 'ec2',        label: 'GetSecretValue' },
      { from: 's3',       to: 'cloudtrail', label: 'Logged' },
      { from: 'ec2',      to: 'cloudtrail', label: 'Logged' },
    ],
  },
  // Matches AttackPathReactFlow 'ai' variant topology
  'shadow-ai': {
    nodes: [
      { id: 'internet',   x: 50,  y: 200, label: 'Internet',     subLabel: 'External prompt inj.',  icon: 'internet',   mitreId: 'T1190' },
      { id: 'iam',        x: 230, y: 200, label: 'API Gateway',  subLabel: 'Lambda UnapprovedAI',   icon: 'iam',        mitreId: 'T1078' },
      { id: 'iam2',       x: 420, y: 120, label: 'Bedrock',      subLabel: 'InvokeModel claude-3',  icon: 'iam',        mitreId: 'AML.T0051' },
      { id: 's3',         x: 420, y: 280, label: 'S3 Training',  subLabel: 'corp-training-data',    icon: 's3',         mitreId: 'T1530' },
      { id: 'cloudtrail', x: 630, y: 200, label: 'CloudTrail',   subLabel: 'AI Audit Logging',      icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam',        label: 'InvokeModel' },
      { from: 'iam',      to: 'iam2',       label: 'AssumeRole' },
      { from: 'iam2',     to: 's3',         label: 'GetObject' },
      { from: 'iam2',     to: 'cloudtrail', label: 'Logged' },
      { from: 's3',       to: 'cloudtrail', label: 'Logged' },
    ],
  },
};

function attackerPosToNodeId(pos: string | null, scenarioId: string): string | null {
  if (!pos || pos === 'contained') return null;
  if (scenarioId === 'crypto-mining') {
    if (pos === 'internet') return 'internet';
    if (pos === 'ec2') return 'ec2';
    if (pos === 'sg') return 'sg';
    return 'iam';
  }
  if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') {
    return pos === 'internet' ? 'internet' : pos === 's3' ? 's3' : pos === 'ec2' ? 'ec2' : 'iam';
  }
  if (scenarioId === 'privilege-escalation') {
    if (pos === 'internet') return 'internet';
    return pos; // iam, iam2, iam3 map directly
  }
  if (scenarioId === 'shadow-ai') {
    if (pos === 'internet') return 'internet';
    if (pos === 'iam2') return 'iam2';
    if (pos === 's3') return 's3';
    return 'iam';
  }
  return 'internet';
}

interface SimNodeData {
  label: string;
  subLabel?: string;
  icon: string;
  mitreId?: string;
  compromised: boolean;
  remediated: boolean;
  isAttacker: boolean;
  contained: boolean;
}

function SimNode({ data }: { data: SimNodeData }) {
  const Icon = AWS_ICONS[data.icon];
  const { compromised, remediated, isAttacker, contained } = data;

  const borderColor = remediated
    ? 'rgba(52,211,153,0.7)'
    : compromised
    ? 'rgba(239,68,68,0.8)'
    : isAttacker
    ? 'rgba(251,146,60,0.9)'
    : 'rgba(71,85,105,0.6)';

  const bgColor = remediated
    ? 'rgba(6,78,59,0.35)'
    : compromised
    ? 'rgba(69,10,10,0.6)'
    : 'rgba(15,23,42,0.9)';

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: 92, minHeight: 78 }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0, left: -12, width: 6, height: 6 }} />
      <div
        className="relative w-full rounded-xl flex flex-col items-center justify-center px-1.5 py-2.5 transition-all duration-500"
        style={{
          backgroundColor: bgColor,
          border: `1.5px solid ${borderColor}`,
          boxShadow: compromised && !remediated
            ? `0 0 16px rgba(239,68,68,0.4), 0 0 32px rgba(239,68,68,0.15), inset 0 0 12px rgba(239,68,68,0.08)`
            : remediated
            ? `0 0 12px rgba(52,211,153,0.3)`
            : isAttacker
            ? `0 0 16px rgba(251,146,60,0.5), 0 0 32px rgba(251,146,60,0.2)`
            : `0 0 8px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Scan line effect on compromised */}
        {compromised && !remediated && (
          <div
            className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(239,68,68,0.04) 3px, rgba(239,68,68,0.04) 4px)',
            }}
          />
        )}

        {/* THREAT badge */}
        {isAttacker && !contained && (
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-black tracking-widest whitespace-nowrap"
            style={{
              background: 'rgba(239,68,68,0.9)',
              border: '1px solid rgba(255,100,100,0.6)',
              color: '#fff',
              boxShadow: '0 0 8px rgba(239,68,68,0.6)',
            }}
          >
            ▶ THREAT
          </div>
        )}

        {/* Remediated badge */}
        {remediated && (
          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center z-10">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
        )}

        {/* Icon */}
        <div className="w-10 h-10 flex items-center justify-center">
          {Icon && (
            <Icon
              size={32}
              color={remediated ? '#34d399' : compromised ? '#f87171' : isAttacker ? '#fb923c' : '#FF9900'}
            />
          )}
        </div>

        {/* Label */}
        <span
          className="text-[10px] font-bold text-center leading-tight mt-0.5 w-full px-1"
          style={{ color: compromised && !remediated ? '#fca5a5' : remediated ? '#6ee7b7' : '#f1f5f9' }}
        >
          {data.label}
        </span>
        {data.subLabel && (
          <span className="text-[8px] text-center font-mono truncate w-full px-1" style={{ color: '#64748b', maxWidth: 88 }}>
            {data.subLabel.length > 16 ? data.subLabel.slice(0, 14) + '…' : data.subLabel}
          </span>
        )}
        {data.mitreId && (
          <span className="text-[7.5px] font-mono mt-0.5" style={{ color: compromised ? '#f87171' : '#475569' }}>
            {data.mitreId}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, right: -12, width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { sim: SimNode };

export const ArchitectureCanvasReactFlow: React.FC<ArchitectureCanvasReactFlowProps> = ({
  scenarioId,
  attackerPosition,
  compromisedResources,
  remediationStep,
  onNodeClick,
}) => {
  const layout = LAYOUTS[scenarioId] || LAYOUTS['crypto-mining'];
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  // Build initial nodes/edges ONCE — positions never change after init
  const initialNodes: Node[] = useMemo(() =>
    layout.nodes.map((n) => ({
      id: n.id,
      type: 'sim',
      position: { x: n.x - 46, y: n.y - 39 },
      data: {
        label: n.label,
        subLabel: n.subLabel,
        icon: n.icon,
        mitreId: n.mitreId,
        compromised: false,
        remediated: false,
        isAttacker: false,
        contained: false,
      } as SimNodeData,
      draggable: false,
      selectable: false,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [scenarioId]);

  const initialEdges: Edge[] = useMemo(() =>
    layout.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.from,
      target: e.to,
      type: 'smoothstep',
      label: e.label,
      labelStyle: { fill: '#94a3b8', fontSize: 9, fontWeight: 700 },
      labelBgStyle: { fill: 'rgba(2,6,23,0.97)' },
      labelBgBorderRadius: 4,
      labelBgPadding: [3, 6] as [number, number],
      animated: false,
      style: { stroke: '#334155', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#334155', width: 14, height: 14 },
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [scenarioId]);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Reset nodes/edges when scenario changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => rfInstance.current?.fitView({ duration: 300, padding: 0.15 }), 50);
  }, [scenarioId, initialNodes, initialEdges, setNodes, setEdges]);

  // Update only data (not positions) to avoid jitter
  const attackerNodeId = attackerPosToNodeId(attackerPosition, scenarioId);
  const contained = attackerPosition === 'contained';

  const isCompromised = useCallback((nodeId: string): boolean => {
    if (remediationStep >= 3) return false;
    return compromisedResources.has(nodeId);
  }, [compromisedResources, remediationStep]);

  const isRemediated = useCallback((nodeId: string): boolean => {
    if (nodeId === 'iam' || nodeId === 'iam2' || nodeId === 'iam3') return remediationStep >= 2;
    if (nodeId === 'ec2') return remediationStep >= 3;
    if (nodeId === 'sg') return remediationStep >= 4;
    if (nodeId === 's3') return remediationStep >= 2;
    return false;
  }, [remediationStep]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        compromised: isCompromised(n.id),
        remediated: isRemediated(n.id),
        isAttacker: attackerNodeId === n.id && !contained,
        contained,
      } as SimNodeData,
    })));
  }, [attackerNodeId, contained, isCompromised, isRemediated, setNodes]);

  // Update edge animations and colors based on attacker position
  useEffect(() => {
    setEdges((eds) => eds.map((e) => {
      const isActive = attackerNodeId && (e.source === attackerNodeId || e.target === attackerNodeId);
      const isRemedying = remediationStep > 0 && (e.target === 'iam' || e.target === 'ec2' || e.target === 's3');
      const stroke = contained
        ? 'rgba(52,211,153,0.4)'
        : isRemedying
        ? 'rgba(52,211,153,0.6)'
        : isActive
        ? '#ef4444'
        : '#334155';
      return {
        ...e,
        animated: !!(isActive && !contained),
        style: { stroke, strokeWidth: isActive ? 2 : 1.5, strokeDasharray: isActive ? '8 4' : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
        labelStyle: { ...e.labelStyle, fill: isActive ? '#fca5a5' : '#64748b' },
      };
    }));
  }, [attackerNodeId, contained, remediationStep, setEdges]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
    instance.fitView({ duration: 400, padding: 0.15 });
  }, []);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeClick?.(node.id);
  }, [onNodeClick]);

  // Calculate AWS account bounding box for the dashed rectangle
  const awsNodes = layout.nodes.filter(n => n.id !== 'internet');
  const minX = Math.min(...awsNodes.map(n => n.x)) - 72;
  const maxX = Math.max(...awsNodes.map(n => n.x)) + 72;
  const minY = Math.min(...awsNodes.map(n => n.y)) - 64;
  const maxY = Math.max(...awsNodes.map(n => n.y)) + 64;

  // Scenario-specific group colors to match AttackPathReactFlow group style
  const SCENARIO_GROUP: Record<string, { color: string; bg: string; label: string }> = {
    'crypto-mining':        { color: '#d97706', bg: 'rgba(217,119,6,0.07)',   label: 'AWS Account · us-east-1 (Crypto Mining Attack)' },
    'data-exfiltration':    { color: '#dc2626', bg: 'rgba(220,38,38,0.06)',   label: 'AWS Account · us-east-1 (Data Exfiltration)' },
    'privilege-escalation': { color: '#dc2626', bg: 'rgba(220,38,38,0.06)',   label: 'AWS Account · us-east-1 (Privilege Escalation)' },
    'unauthorized-access':  { color: '#7c3aed', bg: 'rgba(124,58,237,0.06)', label: 'AWS Account · us-east-1 (Unauthorized Access)' },
    'shadow-ai':            { color: '#0891b2', bg: 'rgba(8,145,178,0.06)',   label: 'AWS Account · us-east-1 (Shadow AI)' },
  };
  const grp = SCENARIO_GROUP[scenarioId] || SCENARIO_GROUP['crypto-mining'];

  return (
    <div className="relative w-full h-full min-h-[320px]">
      {/* AWS Account boundary — scenario-colored dashed container matching AttackPathReactFlow */}
      <div
        className="absolute pointer-events-none z-10"
        style={{
          left: `${(minX / 800) * 100}%`,
          top: `${(minY / 400) * 100}%`,
          width: `${((maxX - minX) / 800) * 100}%`,
          height: `${((maxY - minY) / 400) * 100}%`,
          border: `1.5px dashed ${grp.color}`,
          borderRadius: 14,
          background: grp.bg,
        }}
      />
      <div
        className="absolute z-10 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded"
        style={{
          left: `${(minX / 800) * 100}%`,
          top: `calc(${(minY / 400) * 100}% - 12px)`,
          background: 'rgba(2,6,23,0.95)',
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: grp.color }} />
        <span className="text-[9px] font-bold tracking-wider" style={{ color: grp.color }}>
          {grp.label}
        </span>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        nodeTypes={nodeTypes}
        onInit={onInit}
        onNodeClick={handleNodeClick}
        panOnScroll={false}
        zoomOnScroll={false}
        panOnDrag={false}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <Background color="#1e293b" gap={24} className="opacity-30" />
      </ReactFlow>
    </div>
  );
};
