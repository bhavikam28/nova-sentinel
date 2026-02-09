/**
 * Nova Flow Diagram - Premium Pipeline Visualization
 * Shows the 5 Nova model workflow with animated connections
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Brain, Zap, Mic, FileText, ArrowRight, Shield, ChevronRight } from 'lucide-react';

const NovaFlowDiagram: React.FC = () => {
  const steps = [
    {
      icon: Eye,
      title: 'Detect',
      model: 'Nova Pro',
      description: 'Visual analysis of architecture diagrams',
      color: 'from-blue-500 to-indigo-600',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      icon: Brain,
      title: 'Investigate',
      model: 'Nova 2 Lite',
      description: 'Temporal timeline & root cause analysis',
      color: 'from-purple-500 to-pink-600',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      icon: Zap,
      title: 'Classify',
      model: 'Nova Micro',
      description: 'Real-time risk scoring in <1 second',
      color: 'from-amber-500 to-orange-600',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      icon: Shield,
      title: 'Remediate',
      model: 'Orchestrator',
      description: 'Generate & execute remediation plans',
      color: 'from-emerald-500 to-green-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      icon: FileText,
      title: 'Document',
      model: 'Nova 2 Lite',
      description: 'JIRA, Slack & Confluence automation',
      color: 'from-violet-500 to-purple-600',
      badge: 'bg-violet-50 text-violet-700 border-violet-200',
    },
  ];

  return (
    <div className="relative bg-slate-50 rounded-2xl border border-slate-200 p-8 lg:p-12 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 hero-grid opacity-50" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            How Nova Sentinel Works
          </h3>
          <p className="text-slate-500 text-sm">
            Incident detected → Analyzed → Scored → Remediated → Documented — all autonomously
          </p>
        </div>

        {/* Pipeline */}
        <div className="relative flex items-stretch justify-between gap-3">
          {/* Connection line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-blue-200 via-purple-200 via-amber-200 via-emerald-200 to-violet-200 -translate-y-1/2 z-0 hidden lg:block" />
          
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative z-10 flex-1 min-w-0"
                >
                  <div className="bg-white rounded-xl p-5 border border-slate-200 text-center hover:shadow-card-hover hover:border-indigo-200 transition-all duration-300 h-full flex flex-col items-center">
                    {/* Step number */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-500">{index + 1}</span>
                    </div>

                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-3 shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Model badge */}
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${step.badge}`}>
                      {step.model}
                    </span>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-900 mb-1">{step.title}</h4>

                    {/* Description */}
                    <p className="text-[11px] text-slate-500 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>

                {/* Arrow between steps */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center z-20 -mx-1">
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 rounded-full border border-indigo-200">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-700">
              Complete Incident Response in Under 60 Seconds
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NovaFlowDiagram;
