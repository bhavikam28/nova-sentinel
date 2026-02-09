/**
 * Attack Path Diagram - Analysis View
 * Clean SVG-based network graph with Wiz.io-style grid background
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Key, Globe, Network,
  Wifi, Server, User, Database
} from 'lucide-react';

interface SecurityNodeProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  subLabel?: string;
  color: string;
  delay: number;
  severity?: 'critical' | 'high' | 'medium';
  x: number;
  y: number;
}

const SecurityNode: React.FC<SecurityNodeProps> = ({ 
  icon: Icon, label, subLabel, color, delay, severity = 'medium', x, y
}) => (
  <motion.g
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay, duration: 0.4 }}
    className="cursor-pointer"
  >
    {severity === 'critical' && (
      <circle cx={x} cy={y} r="36" fill="none" stroke="#EF4444" strokeWidth="2" opacity="0.3" strokeDasharray="4 4" />
    )}
    {severity === 'high' && (
      <circle cx={x} cy={y} r="36" fill="none" stroke="#F97316" strokeWidth="1.5" opacity="0.3" strokeDasharray="4 4" />
    )}
    
    <circle cx={x} cy={y} r="22" fill={color} stroke="white" strokeWidth="3" className="drop-shadow-lg" />
    
    <foreignObject x={x - 10} y={y - 10} width="20" height="20">
      <div className="flex items-center justify-center h-full w-full" style={{ color: 'white' }}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
    </foreignObject>
    
    <text x={x} y={y + 38} textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">
      {label}
    </text>
    {subLabel && (
      <text x={x} y={y + 52} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="Inter, sans-serif">
        {subLabel}
      </text>
    )}
  </motion.g>
);

const AttackPathDiagram: React.FC = () => {
  const nodes = {
    internet: { x: 100, y: 300, icon: Globe, label: 'Internet', subLabel: 'External', color: '#8B5CF6', severity: 'high' as const },
    gateway: { x: 260, y: 300, icon: Network, label: 'Gateway', subLabel: 'Network', color: '#6366F1', severity: 'high' as const },
    network: { x: 420, y: 300, icon: Wifi, label: 'VPC', subLabel: 'Network', color: '#6366F1', severity: 'high' as const },
    ec2: { x: 580, y: 300, icon: Server, label: 'EC2', subLabel: 'Compute', color: '#EF4444', severity: 'critical' as const },
    iam: { x: 740, y: 300, icon: User, label: 'IAM Role', subLabel: 'Identity', color: '#EF4444', severity: 'critical' as const },
    database: { x: 900, y: 300, icon: Database, label: 'Database', subLabel: 'Data Store', color: '#F97316', severity: 'high' as const },
    sg: { x: 420, y: 140, icon: Shield, label: 'Sec Group', subLabel: 'Firewall', color: '#EF4444', severity: 'critical' as const },
    ssh: { x: 580, y: 140, icon: AlertTriangle, label: 'SSH Open', subLabel: 'Vuln', color: '#EF4444', severity: 'critical' as const },
    secret: { x: 740, y: 140, icon: Key, label: 'Secrets', subLabel: 'Creds', color: '#F97316', severity: 'high' as const },
  };

  const connections = [
    { from: nodes.internet, to: nodes.gateway, color: '#6366F1', delay: 0.2 },
    { from: nodes.gateway, to: nodes.network, color: '#6366F1', delay: 0.3 },
    { from: nodes.network, to: nodes.ec2, color: '#EF4444', delay: 0.4 },
    { from: nodes.ec2, to: nodes.iam, color: '#EF4444', delay: 0.5 },
    { from: nodes.iam, to: nodes.database, color: '#EF4444', delay: 0.6 },
    { from: nodes.sg, to: nodes.ssh, color: '#EF4444', delay: 0.7 },
    { from: nodes.ssh, to: nodes.secret, color: '#F97316', delay: 0.8 },
    { from: nodes.network, to: nodes.sg, color: '#EF4444', delay: 0.9 },
    { from: nodes.ec2, to: nodes.ssh, color: '#EF4444', delay: 1.0 },
    { from: nodes.iam, to: nodes.secret, color: '#F97316', delay: 1.1 },
  ];

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Security Attack Path</h2>
          <p className="text-xs text-slate-500 mt-0.5">Critical attack chain visualization</p>
        </div>
        <div className="flex gap-4">
          {[
            { color: 'bg-red-500', label: 'Critical' },
            { color: 'bg-indigo-500', label: 'Attack Path' },
            { color: 'bg-orange-500', label: 'High' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${item.color}`} />
              <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative bg-white p-4 overflow-x-auto">
        <svg width="1000" height="420" className="w-full" viewBox="0 0 1000 420" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="attackGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
            {connections.map((_, i) => (
              <marker key={`arrow-${i}`} id={`ah-${i}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={connections[i].color} opacity="0.8" />
              </marker>
            ))}
          </defs>
          <rect width="100%" height="100%" fill="url(#attackGrid)" />

          {connections.map((conn, i) => (
            <motion.line
              key={`line-${i}`}
              x1={conn.from.x} y1={conn.from.y}
              x2={conn.to.x} y2={conn.to.y}
              stroke={conn.color}
              strokeWidth="1.5"
              opacity="0.6"
              markerEnd={`url(#ah-${i})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ delay: conn.delay, duration: 0.8, ease: "easeInOut" }}
            />
          ))}

          {Object.entries(nodes).map(([key, node], i) => (
            <SecurityNode
              key={key}
              icon={node.icon}
              label={node.label}
              subLabel={node.subLabel}
              color={node.color}
              delay={0.1 + i * 0.05}
              severity={node.severity}
              x={node.x}
              y={node.y}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default AttackPathDiagram;
