/**
 * Attack Path Visualization - Landing Page
 * Light background, Wiz.io/Orca-inspired clean security graph
 * Professional enterprise aesthetic with subtle dot grid
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Network, Server, User, Database, Shield
} from 'lucide-react';

const NODES = [
  { x: 80, y: 120, icon: Globe, label: 'Internet', color: '#8B5CF6', bg: '#F5F3FF', delay: 0 },
  { x: 240, y: 120, icon: Network, label: 'API Gateway', color: '#6366F1', bg: '#EEF2FF', delay: 0.1 },
  { x: 400, y: 120, icon: Shield, label: 'Firewall', color: '#3B82F6', bg: '#EFF6FF', delay: 0.15 },
  { x: 560, y: 120, icon: Server, label: 'EC2', color: '#EF4444', bg: '#FEF2F2', delay: 0.2 },
  { x: 720, y: 120, icon: User, label: 'IAM Role', color: '#EF4444', bg: '#FEF2F2', delay: 0.25 },
  { x: 880, y: 120, icon: Database, label: 'Database', color: '#F97316', bg: '#FFF7ED', delay: 0.3 },
];

const EDGES = [
  { from: 0, to: 1, color: '#8B5CF6', delay: 0.4 },
  { from: 1, to: 2, color: '#6366F1', delay: 0.55 },
  { from: 2, to: 3, color: '#EF4444', delay: 0.7 },
  { from: 3, to: 4, color: '#EF4444', delay: 0.85 },
  { from: 4, to: 5, color: '#F97316', delay: 1.0 },
];

const AttackPathVisualization: React.FC = () => {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-card">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Attack Path Analysis</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time threat chain visualization</p>
        </div>
        <div className="flex gap-3">
          {[
            { color: 'bg-red-500', label: 'Critical' },
            { color: 'bg-violet-500', label: 'Entry' },
            { color: 'bg-orange-500', label: 'High' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] font-medium text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph - Light Background */}
      <div className="relative px-4 py-8">
        {/* Subtle dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #e2e8f0 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
        }} />

        <svg width="960" height="200" viewBox="0 0 960 200" className="w-full relative z-10" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Arrow markers */}
            {EDGES.map((edge, i) => (
              <marker key={`lm-${i}`} id={`lp-arrow-${i}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={edge.color} opacity="0.7" />
              </marker>
            ))}
            {/* Drop shadow filter */}
            <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Edges with flowing particles */}
          {EDGES.map((edge, i) => {
            const from = NODES[edge.from];
            const to = NODES[edge.to];
            const mx = (from.x + to.x) / 2;

            return (
              <g key={`e-${i}`}>
                {/* Subtle shadow line */}
                <motion.line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edge.color} strokeWidth="3" opacity="0.06"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: edge.delay, duration: 0.5 }}
                />
                {/* Main dashed line */}
                <motion.line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edge.color} strokeWidth="1.5" opacity="0.4"
                  strokeDasharray="6 4"
                  markerEnd={`url(#lp-arrow-${i})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 0.4 }}
                  viewport={{ once: true }}
                  transition={{ delay: edge.delay, duration: 0.5 }}
                />
                {/* Flowing particle */}
                <motion.circle
                  r="3" fill={edge.color}
                  animate={{
                    cx: [from.x, mx, to.x],
                    cy: [from.y, from.y, to.y],
                    opacity: [0, 0.7, 0],
                  }}
                  transition={{ delay: edge.delay + 0.5, duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node, i) => {
            const Icon = node.icon;
            const isCritical = node.color === '#EF4444';

            return (
              <motion.g
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: node.delay, duration: 0.4, type: 'spring', stiffness: 200 }}
              >
                {/* Pulse ring for critical nodes */}
                {isCritical && (
                  <motion.circle
                    cx={node.x} cy={node.y} r="30"
                    fill="none" stroke={node.color} strokeWidth="1"
                    animate={{ opacity: [0.08, 0.2, 0.08], r: [28, 33, 28] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Node circle - white fill with colored border */}
                <circle cx={node.x} cy={node.y} r="24" fill={node.bg} stroke={node.color} strokeWidth="2" filter="url(#node-shadow)" />

                {/* Icon */}
                <foreignObject x={node.x - 10} y={node.y - 10} width="20" height="20">
                  <div className="flex items-center justify-center h-full w-full">
                    <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} style={{ color: node.color }} />
                  </div>
                </foreignObject>

                {/* Label */}
                <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="600" fontFamily="Inter, sans-serif">
                  {node.label}
                </text>
              </motion.g>
            );
          })}

          {/* Detection badge */}
          <motion.g
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.3, duration: 0.4 }}
          >
            <rect x="380" y="172" width="200" height="26" rx="13" fill="#ECFDF5" stroke="#10B981" strokeWidth="1" />
            <text x="480" y="189" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
              ✓ Nova Sentinel — Threat Detected
            </text>
          </motion.g>
        </svg>
      </div>
    </div>
  );
};

export default AttackPathVisualization;
