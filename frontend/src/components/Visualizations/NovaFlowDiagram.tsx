/**
 * Nova Flow Diagram — Premium light theme
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Brain, Zap, Shield, FileText, ChevronRight } from 'lucide-react';

interface PipelineStep {
  id: string;
  icon: any;
  title: string;
  model: string;
  description: string;
  detail: string;
  color: string;
  bg: string;
  badgeClass: string;
}

const STEPS: PipelineStep[] = [
  { id: 'detect', icon: Eye, title: 'Detect', model: 'Nova Pro', description: 'Visual & architecture analysis',
    detail: 'Analyzes uploaded architecture diagrams, screenshots, and CloudTrail events to identify security misconfigurations.',
    color: '#4f46e5', bg: '#eef2ff', badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'investigate', icon: Brain, title: 'Investigate', model: 'Nova 2 Lite', description: 'Timeline & root cause',
    detail: 'Builds attack timelines from up to 90 days of CloudTrail. Traces kill chains to the initial compromise.',
    color: '#4f46e5', bg: '#eef2ff', badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'classify', icon: Zap, title: 'Classify', model: 'Nova Micro', description: 'Risk scoring in <1s',
    detail: 'Ultra-fast classification with confidence scores, severity ratings, and MITRE ATT&CK mapping.',
    color: '#64748b', bg: '#f1f5f9', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'remediate', icon: Shield, title: 'Remediate', model: 'Nova Act + Nova 2 Lite', description: 'Auto-fix via Nova Act browser automation',
    detail: 'Nova Act automates AWS Console remediation; Nova 2 Lite generates plans. IAM fixes, security group corrections, JIRA tickets.',
    color: '#4f46e5', bg: '#eef2ff', badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'document', icon: FileText, title: 'Document', model: 'Nova 2 Lite', description: 'JIRA, Slack & Confluence',
    detail: 'Incident tickets, Slack summaries, and Confluence post-mortem documentation generated automatically.',
    color: '#64748b', bg: '#f1f5f9', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const NovaFlowDiagram: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const hoveredStep = STEPS.find(s => s.id === activeStep);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-lg shadow-slate-200/50">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle, #c7d2fe 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px',
      }} />
      <div className="relative z-10 p-8 lg:p-10">
        <div className="text-center mb-10">
          <h3 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Model Specialization — One Pipeline</h3>
          <p className="text-sm text-slate-600">Each Nova model does what it&apos;s best at. Context-aware orchestration in one pipeline.</p>
        </div>

        <div className="relative flex items-stretch justify-between gap-2 lg:gap-3">
          <div className="absolute top-[48px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-indigo-200 via-slate-200 to-indigo-200 z-0 hidden lg:block" />

          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <React.Fragment key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative z-10 flex-1 min-w-0"
                  onMouseEnter={() => setActiveStep(step.id)}
                  onMouseLeave={() => setActiveStep(null)}
                >
                  <div className={`rounded-xl p-5 border text-center transition-all duration-300 h-full flex flex-col items-center group cursor-pointer ${
                    isActive ? 'border-indigo-300 bg-indigo-50/50 shadow-md -translate-y-1' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                  }`}>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                      style={{ backgroundColor: step.color }}>
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: step.bg }}>
                      <Icon className="h-6 w-6" strokeWidth={1.8} style={{ color: step.color }} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h4>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${step.badgeClass}`}>
                      {step.model}
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
                {index < STEPS.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center z-20 -mx-1">
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <AnimatePresence>
          {hoveredStep && (
            <motion.div
              key={hoveredStep.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="mt-6 mx-auto max-w-2xl"
            >
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: hoveredStep.bg }}>
                    <hoveredStep.icon className="w-4 h-4" style={{ color: hoveredStep.color }} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-slate-900 font-bold text-sm">{hoveredStep.title}</span>
                    <span className="text-slate-500 text-xs ml-2">powered by {hoveredStep.model}</span>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{hoveredStep.detail}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hoveredStep && (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }} className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 rounded-full border border-emerald-200">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Complete Incident Response Autonomously</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NovaFlowDiagram;
