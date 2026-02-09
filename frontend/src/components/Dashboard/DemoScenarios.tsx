/**
 * Demo Scenarios - Clean minimal cards without bulky icons
 * Severity-driven left border accent, professional layout
 */
import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DemoScenario } from '../../types/incident';

interface DemoScenariosProps {
  scenarios: DemoScenario[];
  onSelectScenario: (scenarioId: string) => void;
  loading?: boolean;
}

const DemoScenarios: React.FC<DemoScenariosProps> = ({ 
  scenarios, 
  onSelectScenario,
  loading 
}) => {
  const getSeverityConfig = (severity: string) => {
    const configs: Record<string, { border: string; badge: string }> = {
      CRITICAL: { border: 'border-l-red-500', badge: 'bg-red-50 text-red-700 border-red-200' },
      HIGH: { border: 'border-l-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
      MEDIUM: { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
      LOW: { border: 'border-l-blue-400', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
    };
    return configs[severity] || configs.MEDIUM;
  };

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        {scenarios.map((scenario, index) => {
          const config = getSeverityConfig(scenario.severity);
          
          return (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              onClick={() => !loading && onSelectScenario(scenario.id)}
              disabled={loading}
              className={`group relative text-left bg-white rounded-xl p-5 border border-slate-200 border-l-[3px] ${config.border} hover:shadow-md hover:border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {scenario.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${config.badge}`}>
                    {scenario.severity}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
              </div>
              
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                {scenario.description}
              </p>
              
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-medium">
                  {scenario.event_count} CloudTrail events
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Analyze →
                </span>
              </div>

              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default DemoScenarios;
