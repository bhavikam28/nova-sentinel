/**
 * Premium Demo Scenarios - Enterprise card design with severity indicators
 */
import React from 'react';
import { Database, Zap, ArrowRight, Brain, Shield, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
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
  const getScenarioIcon = (id: string) => {
    switch (id) {
      case 'crypto-mining': return Zap;
      case 'data-exfiltration': return Database;
      case 'privilege-escalation': return TrendingUp;
      case 'unauthorized-access': return AlertCircle;
      default: return Shield;
    }
  };

  const getScenarioConfig = (scenario: DemoScenario) => {
    const configs: Record<string, any> = {
      CRITICAL: {
        gradient: 'from-red-500 to-rose-600',
        lightBg: 'bg-red-50',
        border: 'border-red-200 hover:border-red-300',
        badge: 'bg-red-100 text-red-700 border-red-200',
        ring: 'ring-red-500/20',
        dot: 'bg-red-500',
      },
      HIGH: {
        gradient: 'from-orange-500 to-amber-600',
        lightBg: 'bg-orange-50',
        border: 'border-orange-200 hover:border-orange-300',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        ring: 'ring-orange-500/20',
        dot: 'bg-orange-500',
      },
    };
    return configs[scenario.severity] || {
      gradient: 'from-blue-500 to-indigo-600',
      lightBg: 'bg-blue-50',
      border: 'border-blue-200 hover:border-blue-300',
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      ring: 'ring-blue-500/20',
      dot: 'bg-blue-500',
    };
  };

  return (
    <div className="space-y-8">
      {/* Scenario Cards */}
      <div className="grid md:grid-cols-2 gap-5">
        {scenarios.map((scenario, index) => {
          const Icon = getScenarioIcon(scenario.id);
          const config = getScenarioConfig(scenario);
          
          return (
            <motion.button
              key={scenario.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => !loading && onSelectScenario(scenario.id)}
              disabled={loading}
              className={`group relative text-left bg-white rounded-2xl p-6 border ${config.border} hover:shadow-card-hover transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {scenario.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.badge} flex-shrink-0`}>
                      {scenario.severity}
                    </span>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                    {scenario.description}
                  </p>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium">
                      {scenario.event_count} CloudTrail events
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Analyze
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Bottom Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-4 gap-3"
      >
        {[
          { icon: Zap, value: '<60s', label: 'Resolution' },
          { icon: Brain, value: '5 Models', label: 'Nova AI' },
          { icon: Shield, value: '100%', label: 'Automated' },
          { icon: TrendingUp, value: '95%+', label: 'Accuracy' },
        ].map((stat, i) => (
          <div key={i} className="text-center p-3 rounded-xl bg-slate-50 border border-slate-200">
            <stat.icon className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
            <div className="text-sm font-bold text-slate-900 metric-value">{stat.value}</div>
            <div className="text-[10px] text-slate-500 font-medium">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default DemoScenarios;
