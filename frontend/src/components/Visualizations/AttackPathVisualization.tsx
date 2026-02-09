/**
 * Attack Path Visualization - Landing Page Version
 * Clean, animated network graph with premium design
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Key, Globe, Network, 
  Wifi, Server, User, Database
} from 'lucide-react';

interface NodeProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  color: string;
  delay: number;
}

const SecurityNode: React.FC<NodeProps> = ({ icon: Icon, label, color, delay }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    whileInView={{ scale: 1, opacity: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
    className="flex flex-col items-center"
  >
    <motion.div whileHover={{ scale: 1.1 }} className="relative">
      <div
        className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/20"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" strokeWidth={1.5} />
      </div>
    </motion.div>
    <div className="mt-2 text-xs font-bold text-slate-700 text-center">{label}</div>
  </motion.div>
);

const AnimatedArrow: React.FC<{ delay: number; color?: string }> = ({ delay, color = '#EF4444' }) => (
  <motion.svg
    width="60" height="30" viewBox="0 0 60 30"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.3 }}
    className="flex-shrink-0 hidden sm:block"
  >
    <defs>
      <marker id={`arrow-${delay}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill={color} />
      </marker>
    </defs>
    <motion.path
      d="M 0 15 L 50 15"
      stroke={color}
      strokeWidth="2"
      fill="none"
      markerEnd={`url(#arrow-${delay})`}
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: "easeInOut" }}
    />
  </motion.svg>
);

const AttackPathVisualization: React.FC = () => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 lg:p-10 shadow-elevated">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">Sample Attack Path</h2>
        <p className="text-sm text-slate-500">How Nova Sentinel traces and visualizes attack chains</p>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 lg:p-10 overflow-x-auto">
        <div className="flex items-center justify-center gap-3 lg:gap-4 min-w-[600px]">
          <SecurityNode icon={Globe} label="Internet" color="#8B5CF6" delay={0.1} />
          <AnimatedArrow delay={0.3} color="#8B5CF6" />
          <SecurityNode icon={Network} label="Gateway" color="#6366F1" delay={0.2} />
          <AnimatedArrow delay={0.4} color="#F97316" />
          <SecurityNode icon={Server} label="EC2" color="#EF4444" delay={0.3} />
          <AnimatedArrow delay={0.5} color="#EF4444" />
          <SecurityNode icon={User} label="IAM Role" color="#EF4444" delay={0.4} />
          <AnimatedArrow delay={0.6} color="#EF4444" />
          <SecurityNode icon={Database} label="Data" color="#F97316" delay={0.5} />
        </div>
      </div>

      <div className="flex gap-6 justify-center mt-6">
        {[
          { color: 'bg-red-500', label: 'Critical' },
          { color: 'bg-violet-500', label: 'Attack Path' },
          { color: 'bg-orange-500', label: 'High Severity' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-xs font-medium text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttackPathVisualization;
