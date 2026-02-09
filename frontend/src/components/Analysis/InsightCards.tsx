/**
 * Insight Cards - Premium metric cards with depth
 * Shows Root Cause, Attack Pattern, and Blast Radius
 */
import React from 'react';
import { AlertCircle, TrendingUp, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Timeline } from '../../types/incident';

interface InsightCardsProps {
  timeline: Timeline;
}

const InsightCards: React.FC<InsightCardsProps> = ({ timeline }) => {
  const rootCause = timeline?.root_cause || 'Security Incident Detected';
  const attackPattern = timeline?.attack_pattern || 'Unknown Attack Pattern';
  const blastRadius = timeline?.blast_radius || 'Impact Assessment Pending';
  
  const parsePoints = (text: string): string[] => {
    if (!text) return ['Analysis in progress'];
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10);
    return sentences.length > 0 ? sentences.slice(0, 3).map(s => s.trim()) : [text.substring(0, 120) + (text.length > 120 ? '...' : '')];
  };
  
  const insights = [
    {
      id: 'root-cause',
      title: 'Root Cause',
      icon: AlertCircle,
      text: rootCause,
      points: parsePoints(rootCause),
      gradient: 'from-red-500 to-rose-600',
      lightBg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-600',
      dotColor: 'bg-red-400',
    },
    {
      id: 'attack-pattern',
      title: 'Attack Pattern',
      icon: TrendingUp,
      text: attackPattern,
      points: parsePoints(attackPattern),
      gradient: 'from-violet-500 to-purple-600',
      lightBg: 'bg-violet-50',
      border: 'border-violet-200',
      iconColor: 'text-violet-600',
      dotColor: 'bg-violet-400',
    },
    {
      id: 'blast-radius',
      title: 'Blast Radius',
      icon: Zap,
      text: blastRadius,
      points: parsePoints(blastRadius),
      gradient: 'from-amber-500 to-orange-600',
      lightBg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-600',
      dotColor: 'bg-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {insights.map((insight, index) => {
        const Icon = insight.icon;
        return (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className={`${insight.lightBg} border ${insight.border} rounded-2xl p-5 hover:shadow-elevated transition-all duration-300`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${insight.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900">{insight.title}</h3>
            </div>
            
            {/* Points */}
            <ul className="space-y-2">
              {insight.points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <div className={`w-1.5 h-1.5 rounded-full ${insight.dotColor} mt-2 flex-shrink-0`} />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        );
      })}
    </div>
  );
};

export default InsightCards;
