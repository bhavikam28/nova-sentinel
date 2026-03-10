/**
 * Detection Bar — Premium Nova pipeline visualization for Live Simulation
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Search, Brain, Gauge, Shield, CheckCircle2 } from 'lucide-react';

type Step = 'detecting' | 'temporal' | 'risk' | 'remediation' | 'contained';

interface DetectionBarProps {
  step: Step;
}

const STEPS: { id: Step; label: string; model?: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'detecting', label: 'Detecting', icon: Search },
  { id: 'temporal', label: 'Temporal Agent', model: 'Nova 2 Lite', icon: Brain },
  { id: 'risk', label: 'Risk Scorer', model: 'Nova Micro', icon: Gauge },
  { id: 'remediation', label: 'Remediation', model: 'Nova 2 Lite', icon: Shield },
  { id: 'contained', label: 'Contained', icon: CheckCircle2 },
];

export const DetectionBar: React.FC<DetectionBarProps> = ({ step }) => {
  const idx = STEPS.findIndex((s) => s.id === step);
  const activeIdx = idx >= 0 ? idx : 0;

  return (
    <div className="h-20 border-t border-slate-700/60 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-1 flex-1 max-w-4xl mx-auto">
        {STEPS.map((s, i) => {
          const isActive = i <= activeIdx;
          const isCurrent = i === activeIdx;
          const isContained = s.id === 'contained';
          const Icon = s.icon;
          return (
            <React.Fragment key={s.id}>
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.02 : 1,
                  opacity: 1,
                }}
                className={`
                  flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 transition-all duration-300
                  ${isActive
                    ? isContained
                      ? 'bg-emerald-500/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : 'bg-indigo-500/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-800/30 border-slate-700/50'
                  }
                `}
              >
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isActive ? (isContained ? 'bg-emerald-500/30' : 'bg-indigo-500/30') : 'bg-slate-700/50'}`}>
                  <Icon className={`w-3.5 h-3.5 ${isActive ? (isContained ? 'text-emerald-400' : 'text-indigo-400') : 'text-slate-500'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${isActive ? (isContained ? 'text-emerald-400' : 'text-indigo-300') : 'text-slate-500'}`}>
                    {s.label}
                  </span>
                  {s.model && isCurrent && !isContained && (
                    <span className="text-[9px] text-slate-400">{s.model}</span>
                  )}
                </div>
              </motion.div>
              {i < STEPS.length - 1 && (
                <motion.div
                  initial={false}
                  animate={{ opacity: isActive ? 1 : 0.3 }}
                  className={`w-4 h-0.5 rounded ${isActive ? 'bg-indigo-500/80' : 'bg-slate-600'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
