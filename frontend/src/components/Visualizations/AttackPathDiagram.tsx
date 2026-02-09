/**
 * Attack Path Diagram - Analysis Dashboard View
 * Premium Wiz.io-inspired network graph with animated flowing connections
 * Dark background, colorful nodes, particle-animated edges
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Key, Globe, Network,
  Wifi, Server, User, Database
} from 'lucide-react';

interface NodeDef {
  id: string;
  x: number;
  y: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  subLabel: string;
  color: string;
  borderColor: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  glowColor: string;
}

interface EdgeDef {
  from: string;
  to: string;
  color: string;
  delay: number;
}

const NODES: NodeDef[] = [
  { id: 'internet', x: 80, y: 200, icon: Globe, label: 'Internet', subLabel: 'External Origin', color: '#7C3AED', borderColor: '#8B5CF6', severity: 'high', glowColor: 'rgba(124,58,237,0.4)' },
  { id: 'gateway', x: 240, y: 200, icon: Network, label: 'API Gateway', subLabel: 'Entry Point', color: '#6366F1', borderColor: '#818CF8', severity: 'high', glowColor: 'rgba(99,102,241,0.4)' },
  { id: 'vpc', x: 400, y: 200, icon: Wifi, label: 'VPC', subLabel: 'Network Layer', color: '#3B82F6', borderColor: '#60A5FA', severity: 'medium', glowColor: 'rgba(59,130,246,0.3)' },
  { id: 'ec2', x: 560, y: 200, icon: Server, label: 'EC2 Instance', subLabel: 'Compromised', color: '#EF4444', borderColor: '#F87171', severity: 'critical', glowColor: 'rgba(239,68,68,0.5)' },
  { id: 'iam', x: 720, y: 200, icon: User, label: 'IAM Role', subLabel: 'Escalated', color: '#EF4444', borderColor: '#F87171', severity: 'critical', glowColor: 'rgba(239,68,68,0.5)' },
  { id: 'database', x: 880, y: 200, icon: Database, label: 'RDS Database', subLabel: 'Data Target', color: '#F97316', borderColor: '#FB923C', severity: 'high', glowColor: 'rgba(249,115,22,0.4)' },
  { id: 'sg', x: 320, y: 80, icon: Shield, label: 'Security Group', subLabel: 'Misconfigured', color: '#EF4444', borderColor: '#F87171', severity: 'critical', glowColor: 'rgba(239,68,68,0.5)' },
  { id: 'ssh', x: 560, y: 80, icon: AlertTriangle, label: 'SSH Exposed', subLabel: 'Port 22 Open', color: '#DC2626', borderColor: '#EF4444', severity: 'critical', glowColor: 'rgba(220,38,38,0.5)' },
  { id: 'secrets', x: 760, y: 80, icon: Key, label: 'Secrets Mgr', subLabel: 'Accessed', color: '#F97316', borderColor: '#FB923C', severity: 'high', glowColor: 'rgba(249,115,22,0.4)' },
];

const EDGES: EdgeDef[] = [
  { from: 'internet', to: 'gateway', color: '#7C3AED', delay: 0.3 },
  { from: 'gateway', to: 'vpc', color: '#6366F1', delay: 0.5 },
  { from: 'vpc', to: 'ec2', color: '#EF4444', delay: 0.7 },
  { from: 'ec2', to: 'iam', color: '#EF4444', delay: 0.9 },
  { from: 'iam', to: 'database', color: '#F97316', delay: 1.1 },
  { from: 'vpc', to: 'sg', color: '#EF4444', delay: 1.3 },
  { from: 'sg', to: 'ssh', color: '#DC2626', delay: 1.5 },
  { from: 'ec2', to: 'ssh', color: '#EF4444', delay: 1.6 },
  { from: 'ssh', to: 'secrets', color: '#F97316', delay: 1.7 },
  { from: 'iam', to: 'secrets', color: '#F97316', delay: 1.8 },
];

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

const AttackPathDiagram: React.FC = () => {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
        <div>
          <h2 className="text-base font-bold text-slate-900">Attack Path Graph</h2>
          <p className="text-xs text-slate-500 mt-0.5">Interactive security graph with real-time threat flow</p>
        </div>
        <div className="flex gap-4">
          {[
            { color: 'bg-red-500', label: 'Critical' },
            { color: 'bg-orange-500', label: 'High' },
            { color: 'bg-blue-500', label: 'Medium' },
            { color: 'bg-violet-500', label: 'Entry' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div className="relative overflow-x-auto" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)' }}>
        {/* Subtle grid */}
        <div className="absolute inset-0 hero-grid-dark opacity-40" />
        
        <svg width="960" height="320" viewBox="0 0 960 320" className="w-full relative z-10" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Glow filters for each severity */}
            <filter id="glow-critical" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#EF4444" floodOpacity="0.4" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-high" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor="#F97316" floodOpacity="0.3" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="glow-medium" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feFlood floodColor="#3B82F6" floodOpacity="0.25" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Arrow markers */}
            {EDGES.map((edge, i) => (
              <marker key={`m-${i}`} id={`arrow-${i}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                <polygon points="0 0, 10 3, 0 6" fill={edge.color} opacity="0.9" />
              </marker>
            ))}
          </defs>

          {/* ===== EDGES with flowing animation ===== */}
          {EDGES.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;

            // Calculate midpoint for curved paths
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const curveOffset = Math.abs(dy) > 50 ? 0 : (dx > 0 ? -15 : 15);
            
            const pathD = `M ${from.x} ${from.y} Q ${mx} ${my + curveOffset} ${to.x} ${to.y}`;

            return (
              <g key={`edge-${i}`}>
                {/* Background glow line */}
                <motion.path
                  d={pathD}
                  stroke={edge.color}
                  strokeWidth="3"
                  fill="none"
                  opacity="0.08"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: edge.delay, duration: 0.8, ease: 'easeInOut' }}
                />
                {/* Animated dashed line */}
                <motion.path
                  d={pathD}
                  stroke={edge.color}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.7"
                  strokeDasharray="8 6"
                  className="attack-path-line"
                  markerEnd={`url(#arrow-${i})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.7 }}
                  transition={{ delay: edge.delay, duration: 0.8, ease: 'easeInOut' }}
                />
                {/* Moving particle dot */}
                <motion.circle
                  r="3"
                  fill={edge.color}
                  opacity="0"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    cx: [from.x, mx, to.x],
                    cy: [from.y, my + curveOffset, to.y],
                  }}
                  transition={{
                    delay: edge.delay + 0.8,
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                    repeatDelay: 1,
                  }}
                />
              </g>
            );
          })}

          {/* ===== NODES ===== */}
          {NODES.map((node, i) => {
            const Icon = node.icon;
            const filterName = node.severity === 'critical' ? 'glow-critical' 
              : node.severity === 'high' ? 'glow-high' 
              : 'glow-medium';

            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4, type: 'spring', stiffness: 200 }}
                className="cursor-pointer"
              >
                {/* Outer glow ring for critical */}
                {node.severity === 'critical' && (
                  <motion.circle
                    cx={node.x} cy={node.y} r="30"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="1"
                    opacity="0.3"
                    animate={{ opacity: [0.15, 0.35, 0.15], r: [28, 32, 28] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Node circle with glow */}
                <circle
                  cx={node.x} cy={node.y} r="24"
                  fill={node.color}
                  opacity="0.15"
                  filter={`url(#${filterName})`}
                />
                <circle
                  cx={node.x} cy={node.y} r="22"
                  fill="#111827"
                  stroke={node.borderColor}
                  strokeWidth="2"
                />
                <circle
                  cx={node.x} cy={node.y} r="22"
                  fill={node.color}
                  opacity="0.1"
                />

                {/* Icon */}
                <foreignObject x={node.x - 11} y={node.y - 11} width="22" height="22">
                  <div className="flex items-center justify-center h-full w-full">
                    <Icon className="w-5 h-5" strokeWidth={1.8} style={{ color: node.borderColor }} />
                  </div>
                </foreignObject>

                {/* Label */}
                <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
                  {node.label}
                </text>
                <text x={node.x} y={node.y + 52} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="500" fontFamily="Inter, sans-serif">
                  {node.subLabel}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default AttackPathDiagram;
