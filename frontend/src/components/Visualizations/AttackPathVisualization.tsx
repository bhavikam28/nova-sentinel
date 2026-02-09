/**
 * Attack Path Visualization - Landing Page Hero Version
 * Premium dark-bg network graph with animated flowing particles
 * Wiz.io-inspired with colorful nodes on dark canvas
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Network, Server, User, Database, Shield, AlertTriangle, Key
} from 'lucide-react';

interface LandingNode {
  x: number;
  y: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  color: string;
  glow: string;
  delay: number;
}

const NODES: LandingNode[] = [
  { x: 80, y: 130, icon: Globe, label: 'Internet', color: '#8B5CF6', glow: 'rgba(139,92,246,0.4)', delay: 0 },
  { x: 220, y: 130, icon: Network, label: 'Gateway', color: '#6366F1', glow: 'rgba(99,102,241,0.4)', delay: 0.1 },
  { x: 360, y: 130, icon: Shield, label: 'Firewall', color: '#3B82F6', glow: 'rgba(59,130,246,0.3)', delay: 0.15 },
  { x: 500, y: 130, icon: Server, label: 'EC2', color: '#EF4444', glow: 'rgba(239,68,68,0.5)', delay: 0.2 },
  { x: 640, y: 130, icon: User, label: 'IAM Role', color: '#EF4444', glow: 'rgba(239,68,68,0.5)', delay: 0.25 },
  { x: 780, y: 130, icon: Database, label: 'Database', color: '#F97316', glow: 'rgba(249,115,22,0.4)', delay: 0.3 },
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
    <div className="w-full rounded-2xl overflow-hidden border border-white/[0.08]" style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0f172a 100%)' }}>
      {/* Subtle grid */}
      <div className="relative">
        <div className="absolute inset-0 hero-grid-dark opacity-30" />
        
        <div className="relative px-6 pt-5 pb-2 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white/90">Attack Path Analysis</h3>
              <p className="text-[11px] text-white/40 mt-0.5">Real-time threat chain visualization</p>
            </div>
            <div className="flex gap-3">
              {[
                { color: 'bg-red-500', label: 'Critical' },
                { color: 'bg-violet-500', label: 'Entry' },
                { color: 'bg-orange-500', label: 'High' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-[10px] font-medium text-white/40">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative px-4 pb-4 z-10">
          <svg width="860" height="230" viewBox="0 0 860 230" className="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Glow filter */}
              <filter id="landing-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow markers */}
              {EDGES.map((edge, i) => (
                <marker key={`lm-${i}`} id={`landing-arrow-${i}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={edge.color} opacity="0.8" />
                </marker>
              ))}
            </defs>

            {/* Edges with flowing particles */}
            {EDGES.map((edge, i) => {
              const from = NODES[edge.from];
              const to = NODES[edge.to];
              const mx = (from.x + to.x) / 2;

              return (
                <g key={`le-${i}`}>
                  {/* Background glow */}
                  <motion.line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={edge.color}
                    strokeWidth="3"
                    opacity="0.06"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: edge.delay, duration: 0.6 }}
                  />
                  {/* Animated dashed line */}
                  <motion.line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={edge.color}
                    strokeWidth="2"
                    opacity="0.6"
                    strokeDasharray="8 6"
                    className="attack-path-line"
                    markerEnd={`url(#landing-arrow-${i})`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 0.6 }}
                    viewport={{ once: true }}
                    transition={{ delay: edge.delay, duration: 0.6, ease: 'easeInOut' }}
                  />
                  {/* Flowing particle */}
                  <motion.circle
                    r="3"
                    fill={edge.color}
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0, 0.9, 0.9, 0],
                      cx: [from.x, mx, to.x],
                      cy: [from.y, from.y, to.y],
                    }}
                    transition={{
                      delay: edge.delay + 0.6,
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                      repeatDelay: 1.5,
                    }}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {NODES.map((node, i) => {
              const Icon = node.icon;
              const isCritical = node.color === '#EF4444' || node.color === '#DC2626';

              return (
                <motion.g
                  key={`ln-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: node.delay, duration: 0.4, type: 'spring', stiffness: 200 }}
                >
                  {/* Glow pulse for critical */}
                  {isCritical && (
                    <motion.circle
                      cx={node.x} cy={node.y} r="26"
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1"
                      animate={{ opacity: [0.1, 0.3, 0.1], r: [24, 28, 24] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Node bg */}
                  <circle cx={node.x} cy={node.y} r="20" fill="#111827" stroke={node.color} strokeWidth="2" opacity="1" />
                  <circle cx={node.x} cy={node.y} r="20" fill={node.color} opacity="0.1" />

                  {/* Icon */}
                  <foreignObject x={node.x - 10} y={node.y - 10} width="20" height="20">
                    <div className="flex items-center justify-center h-full w-full">
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} style={{ color: node.color }} />
                    </div>
                  </foreignObject>

                  {/* Label */}
                  <text x={node.x} y={node.y + 34} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">
                    {node.label}
                  </text>
                </motion.g>
              );
            })}

            {/* "Nova Sentinel Detected" badge in SVG */}
            <motion.g
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              <rect x="330" y="185" width="200" height="28" rx="14" fill="#10B981" opacity="0.15" stroke="#10B981" strokeWidth="1" />
              <text x="430" y="203" textAnchor="middle" fill="#34D399" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
                ✓ Nova Sentinel — Threat Detected
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AttackPathVisualization;
