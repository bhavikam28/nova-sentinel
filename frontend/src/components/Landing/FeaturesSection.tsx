/**
 * Features Section - Bento Grid Layout with Premium Design
 * Wiz.io inspired with modern SaaS aesthetics
 */
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, Brain, Zap, Mic, FileText, Shield, 
  Clock, Target, Network, Lock, ArrowRight,
  Workflow, Cpu
} from 'lucide-react';
import NovaFlowDiagram from '../Visualizations/NovaFlowDiagram';

const FeaturesSection: React.FC = () => {
  // Primary features (large cards)
  const primaryFeatures = [
    {
      icon: Eye,
      title: 'Visual Architecture Analysis',
      description: 'Upload architecture diagrams and Nova Pro identifies security misconfigurations, drift from intended state, and missing controls in real-time.',
      badge: 'Nova Pro',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      gradient: 'from-blue-500 to-indigo-600',
      accentColor: 'blue',
    },
    {
      icon: Brain,
      title: 'Temporal Intelligence & Root Cause',
      description: 'Build comprehensive attack timelines from 90 days of CloudTrail logs. Automatically trace the kill chain back to the initial compromise.',
      badge: 'Nova 2 Lite',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      gradient: 'from-purple-500 to-pink-600',
      accentColor: 'purple',
    },
    {
      icon: Zap,
      title: 'Real-Time Risk Classification',
      description: 'Classify every security event in under 1 second. Nova Micro provides instant confidence scores and severity ratings across your entire environment.',
      badge: 'Nova Micro',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      gradient: 'from-amber-500 to-orange-600',
      accentColor: 'amber',
    },
  ];

  // Secondary features (smaller cards)
  const secondaryFeatures = [
    {
      icon: Mic,
      title: 'Voice-Powered Investigation',
      description: 'Hands-free incident analysis with natural language.',
      badge: 'Nova 2 Sonic',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      icon: FileText,
      title: 'Automated Documentation',
      description: 'JIRA tickets, Slack alerts, and Confluence post-mortems.',
      badge: 'Nova 2 Lite',
      badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      icon: Shield,
      title: 'Autonomous Remediation',
      description: 'AI-generated remediation plans with approval gates.',
      badge: 'Automated',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      gradient: 'from-rose-500 to-red-600',
    },
    {
      icon: Network,
      title: 'Multi-Agent Orchestration',
      description: 'Coordinate specialized agents with state management.',
      badge: 'Agentic AI',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      gradient: 'from-sky-500 to-cyan-600',
    },
    {
      icon: Target,
      title: 'Configuration Drift Detection',
      description: 'Compare intended vs actual AWS security posture.',
      badge: 'Visual AI',
      badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      gradient: 'from-fuchsia-500 to-pink-600',
    },
    {
      icon: Lock,
      title: 'Compliance Guardrails',
      description: 'CIS Benchmarks, NIST 800-53, and AWS best practices.',
      badge: 'RAG Enabled',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      gradient: 'from-indigo-500 to-blue-600',
    },
  ];

  return (
    <section className="py-24 bg-white relative" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 mb-6">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">5 Nova Models</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tight">
            Complete Security Automation
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Every model chosen for a specific purpose. Every agent optimized for its task.
          </p>
        </motion.div>

        {/* Nova Flow Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-24"
        >
          <NovaFlowDiagram />
        </motion.div>

        {/* Primary Features - Large Bento Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {primaryFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group card-premium p-8 relative overflow-hidden"
              >
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  {/* Badge */}
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-4 ${feature.badgeColor}`}>
                    {feature.badge}
                  </span>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                    {feature.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-slate-500 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Secondary Features - Smaller Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secondaryFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="group flex items-start gap-4 p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-card-hover transition-all duration-300"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-900 text-sm">{feature.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${feature.badgeColor}`}>
                    {feature.badge}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
