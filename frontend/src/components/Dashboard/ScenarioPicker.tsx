/**
 * Scenario Picker - Demo mode scenario selection
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Shield, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import type { DemoScenario } from '../../types/incident';

interface ScenarioPickerProps {
  scenarios: DemoScenario[];
  onSelectScenario: (scenarioId: string) => void;
  onStartSimulation?: (scenarioId: string) => void;
  loading?: boolean;
  useFullAI?: boolean;
  onUseFullAIChange?: (v: boolean) => void;
}

/* Per-scenario visual identity — accent color + what to look for */
const SCENARIO_META: Record<string, {
  accentBg: string;
  accentBorder: string;
  accentText: string;
  iconBg: string;
  tag: string;
  tagBg: string;
  tagText: string;
  focus: string;
}> = {
  'privilege-escalation': {
    accentBg: 'bg-red-50',
    accentBorder: 'border-red-100',
    accentText: 'text-red-600',
    iconBg: 'bg-red-100',
    tag: 'Identity Attack',
    tagBg: 'bg-red-100',
    tagText: 'text-red-700',
    focus: 'IAM kill chain · MITRE T1098 · AssumeRole abuse',
  },
  'crypto-mining': {
    accentBg: 'bg-amber-50',
    accentBorder: 'border-amber-100',
    accentText: 'text-amber-600',
    iconBg: 'bg-amber-100',
    tag: 'Financial Impact',
    tagBg: 'bg-amber-100',
    tagText: 'text-amber-700',
    focus: 'Cost anomaly · EC2 spot abuse · $2,400 in 4 hours',
  },
  'shadow-ai': {
    accentBg: 'bg-violet-50',
    accentBorder: 'border-violet-100',
    accentText: 'text-violet-600',
    iconBg: 'bg-violet-100',
    tag: 'AI Security',
    tagBg: 'bg-violet-100',
    tagText: 'text-violet-700',
    focus: 'Bedrock abuse · Prompt injection · MITRE ATLAS',
  },
  'organizations-breach': {
    accentBg: 'bg-indigo-50',
    accentBorder: 'border-indigo-100',
    accentText: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    tag: 'Multi-Account',
    tagBg: 'bg-indigo-100',
    tagText: 'text-indigo-700',
    focus: 'Cross-account lateral movement · SCP gaps · Org-wide blast radius',
  },
};

const SvgIcon = ({ children, className = 'w-5 h-5' }: { children: React.ReactNode; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const SCENARIO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'crypto-mining': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 6h8M8 12h8M8 18h4" /></SvgIcon>,
  'privilege-escalation': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></SvgIcon>,
  'shadow-ai': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><path d="M12 2a2 2 0 012 2v1a2 2 0 01-2 2h-1" /><path d="M12 8v4" /><path d="M8 16h8" /><path d="M4 12a8 8 0 0116 0" /></SvgIcon>,
  'data-exfiltration': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></SvgIcon>,
  'organizations-breach': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v4M12 11l-7 6M12 11l7 6" /></SvgIcon>,
  'unauthorized-access': (p) => <SvgIcon className={p.className || 'w-5 h-5'}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></SvgIcon>,
};

const DEFAULT_META = {
  accentBg: 'bg-slate-50',
  accentBorder: 'border-slate-100',
  accentText: 'text-slate-600',
  iconBg: 'bg-slate-100',
  tag: 'Security',
  tagBg: 'bg-slate-100',
  tagText: 'text-slate-600',
  focus: 'Multi-agent analysis · Incident response',
};

const ScenarioPicker: React.FC<ScenarioPickerProps> = ({
  scenarios,
  onSelectScenario,
  onStartSimulation,
  loading,
  useFullAI = false,
  onUseFullAIChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Demo Scenarios</h2>
        <p className="text-sm text-slate-500">
          Three distinct attack types — each showing a different dimension of wolfir's detection and response capabilities.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid gap-3">
        {scenarios.map((scenario, index) => {
          const meta = SCENARIO_META[scenario.id] || DEFAULT_META;
          const Icon = SCENARIO_ICONS[scenario.id] || SCENARIO_ICONS['crypto-mining'];

          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
            >
              <button
                onClick={() => !loading && onSelectScenario(scenario.id)}
                disabled={loading}
                className={`group w-full text-left bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-5 h-5 ${meta.accentText}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                        {scenario.name}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.tagBg} ${meta.tagText}`}>
                        {meta.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2">{scenario.description}</p>
                    <p className={`text-[11px] font-medium ${meta.accentText}`}>{meta.focus}</p>
                  </div>

                  {/* CTA */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-2 ml-2">
                    {loading ? (
                      <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                </div>

                {/* What-If Simulation button */}
                {onStartSimulation && !loading && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); onStartSimulation(scenario.id); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition-colors"
                    >
                      <Play className="w-3 h-3" strokeWidth={2.5} />
                      Run What-If Simulation
                    </button>
                  </div>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Mode toggle */}
      {onUseFullAIChange && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Analysis mode</span>
              <span
                className="text-slate-400 hover:text-slate-600 cursor-help"
                title="Instant Demo: Pre-computed results, no backend needed. Full AI: Live Bedrock pipeline (~45s) — requires backend running locally."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white text-[11px]">
              <button
                type="button"
                onClick={() => onUseFullAIChange(false)}
                className={`px-3 py-2 font-semibold transition-colors ${
                  !useFullAI ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Instant Demo
              </button>
              <button
                type="button"
                onClick={() => onUseFullAIChange(true)}
                className={`px-3 py-2 font-semibold transition-colors border-l border-slate-200 ${
                  useFullAI ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Full AI
              </button>
            </div>
          </div>
          {useFullAI && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                Full AI calls live Bedrock APIs (~45s). Requires backend running locally.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl">
        <Shield className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-indigo-700 leading-relaxed">
          {useFullAI
            ? '5-agent Nova pipeline: Detection (Nova Pro), Investigation (Nova 2 Lite), Classification (Nova Micro), Remediation, Documentation.'
            : 'Instant demo uses pre-computed results — all features work. Switch to Full AI to run the live Nova pipeline.'}
        </p>
      </div>
    </div>
  );
};

export default ScenarioPicker;
