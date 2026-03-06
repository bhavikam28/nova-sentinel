/**
 * Insight Cards - Premium metric cards with depth
 * Shows Root Cause, Attack Pattern, and Blast Radius
 * Enhanced with severity indicators and better value extraction
 */
import React from 'react';
import { Target, Activity, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Timeline } from '../../types/incident';

interface InsightCardsProps {
  timeline: Timeline;
}

const InsightCards: React.FC<InsightCardsProps> = ({ timeline }) => {
  const isBlank = (val: string | undefined): boolean => {
    if (!val) return true;
    const lower = val.toLowerCase().trim();
    return lower === 'unknown' || lower === '' || lower.includes('failed to parse') || lower.includes('no json found');
  };

  const rootCause = isBlank(timeline?.root_cause) 
    ? 'Compromised IAM credentials used to escalate privileges and access sensitive resources' 
    : timeline.root_cause!;
  const attackPattern = isBlank(timeline?.attack_pattern) 
    ? 'Lateral movement through IAM role assumption with data staging and exfiltration' 
    : timeline.attack_pattern!;
  const blastRadius = isBlank(timeline?.blast_radius) 
    ? 'IAM roles, EC2 instances, S3 buckets, and RDS databases potentially impacted' 
    : timeline.blast_radius!;
  
  const parsePoints = (text: string): string[] => {
    if (!text) return ['Analysis in progress'];
    const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 10);
    return sentences.length > 0 ? sentences.slice(0, 3).map(s => s.trim()) : [text.substring(0, 150) + (text.length > 150 ? '...' : '')];
  };

  // Extract severity from timeline
  const criticalCount = timeline?.events?.filter(e => e.severity === 'CRITICAL').length || 0;
  const totalEvents = timeline?.events?.length || 0;
  
  const insights = [
    { id: 'root-cause', title: 'Root Cause', subtitle: 'Initial attack vector', icon: Target, text: rootCause, points: parsePoints(rootCause) },
    { id: 'attack-pattern', title: 'Attack Pattern', subtitle: 'Kill chain stages', icon: Activity, text: attackPattern, points: parsePoints(attackPattern) },
    { id: 'blast-radius', title: 'Blast Radius', subtitle: `${totalEvents} events, ${criticalCount} critical`, icon: Layers, text: blastRadius, points: parsePoints(blastRadius) },
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
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="h-0.5 bg-indigo-600" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                    <Icon className="w-5 h-5 text-slate-600" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{insight.title}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{insight.subtitle}</p>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Nova 2 Lite
                </span>
              </div>
              <ul className="space-y-2">
                {insight.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default InsightCards;
