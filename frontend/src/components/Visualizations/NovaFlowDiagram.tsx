/**
 * Nova Flow Diagram - Unique Dark SVG Animated Pipeline
 * A visual circuit-board style flow showing 5 Nova models
 * Not generic icon cards — this is a real interactive visualization
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Brain, Zap, Shield, FileText } from 'lucide-react';

interface PipelineStep {
  id: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  model: string;
  description: string;
  detail: string;
  color: string;
  lightColor: string;
  x: number;
}

const STEPS: PipelineStep[] = [
  {
    id: 'detect', icon: Eye, title: 'Detect', model: 'Nova Pro',
    description: 'Visual & architecture analysis',
    detail: 'Analyzes uploaded architecture diagrams, screenshots, and CloudTrail events to identify security misconfigurations, open ports, and policy violations.',
    color: '#3B82F6', lightColor: '#DBEAFE', x: 100
  },
  {
    id: 'investigate', icon: Brain, title: 'Investigate', model: 'Nova 2 Lite',
    description: 'Timeline & root cause',
    detail: 'Builds comprehensive attack timelines from up to 90 days of CloudTrail logs. Traces kill chains back to the initial compromise vector.',
    color: '#8B5CF6', lightColor: '#EDE9FE', x: 300
  },
  {
    id: 'classify', icon: Zap, title: 'Classify', model: 'Nova Micro',
    description: 'Risk scoring in <1s',
    detail: 'Ultra-fast classification of every security event with confidence scores, severity ratings, and MITRE ATT&CK mapping in under 1 second.',
    color: '#F59E0B', lightColor: '#FEF3C7', x: 500
  },
  {
    id: 'remediate', icon: Shield, title: 'Remediate', model: 'Orchestrator',
    description: 'Auto-fix with approval gates',
    detail: 'Generates targeted remediation plans with step-by-step IAM policy fixes, security group corrections, and compliance alignment.',
    color: '#10B981', lightColor: '#D1FAE5', x: 700
  },
  {
    id: 'document', icon: FileText, title: 'Document', model: 'Nova 2 Lite',
    description: 'JIRA, Slack & Confluence',
    detail: 'Automatically generates incident tickets, Slack summaries, and Confluence post-mortem documentation ready for your team.',
    color: '#A855F7', lightColor: '#F3E8FF', x: 900
  },
];

const NovaFlowDiagram: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const hoveredStep = STEPS.find(s => s.id === activeStep);

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      {/* Grid overlay */}
      <div className="absolute inset-0 hero-grid-dark opacity-30" />
      
      <div className="relative z-10 p-8 lg:p-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">How Nova Sentinel Works</h3>
          <p className="text-sm text-slate-400">
            5 specialized AI models — one autonomous pipeline — under 60 seconds
          </p>
        </div>

        {/* SVG Pipeline */}
        <div className="overflow-x-auto">
          <svg width="1000" height="200" viewBox="0 0 1000 200" className="w-full min-w-[700px]" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Connection arrow markers */}
              {STEPS.slice(0, -1).map((step, i) => (
                <marker key={`fm-${i}`} id={`flow-arrow-${i}`} markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={STEPS[i + 1].color} opacity="0.6" />
                </marker>
              ))}
              {/* Glow filters */}
              {STEPS.map((step) => (
                <filter key={`gf-${step.id}`} id={`glow-${step.id}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feFlood floodColor={step.color} floodOpacity="0.3" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            {/* Connection lines with animated flow */}
            {STEPS.slice(0, -1).map((step, i) => {
              const nextStep = STEPS[i + 1];
              const startX = step.x + 34;
              const endX = nextStep.x - 34;
              const y = 80;
              const mx = (startX + endX) / 2;

              return (
                <g key={`conn-${i}`}>
                  {/* Glow line */}
                  <line x1={startX} y1={y} x2={endX} y2={y} stroke={nextStep.color} strokeWidth="3" opacity="0.06" />
                  {/* Dashed animated line */}
                  <line
                    x1={startX} y1={y} x2={endX} y2={y}
                    stroke={nextStep.color} strokeWidth="2" opacity="0.4"
                    strokeDasharray="6 4"
                    className="attack-path-line"
                    markerEnd={`url(#flow-arrow-${i})`}
                  />
                  {/* Flowing particle */}
                  <motion.circle
                    r="3" fill={nextStep.color}
                    animate={{
                      cx: [startX, mx, endX],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: 'linear',
                    }}
                    cy={y}
                  />
                </g>
              );
            })}

            {/* Step nodes */}
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const y = 80;

              return (
                <motion.g
                  key={step.id}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4, type: 'spring' }}
                  onMouseEnter={() => setActiveStep(step.id)}
                  onMouseLeave={() => setActiveStep(null)}
                  className="cursor-pointer"
                >
                  {/* Active glow ring */}
                  {isActive && (
                    <motion.circle
                      cx={step.x} cy={y} r="38"
                      fill="none" stroke={step.color} strokeWidth="1.5"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.4, scale: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}

                  {/* Step number badge */}
                  <circle cx={step.x + 22} cy={y - 22} r="10" fill="#1e293b" stroke={step.color} strokeWidth="1.5" />
                  <text x={step.x + 22} y={y - 18} textAnchor="middle" fill={step.color} fontSize="10" fontWeight="700" fontFamily="Inter">{i + 1}</text>

                  {/* Node circle */}
                  <circle cx={step.x} cy={y} r="30" fill="#0f172a" stroke={step.color} strokeWidth="2"
                    filter={isActive ? `url(#glow-${step.id})` : undefined}
                  />
                  <circle cx={step.x} cy={y} r="30" fill={step.color} opacity={isActive ? 0.15 : 0.08} />

                  {/* Icon */}
                  <foreignObject x={step.x - 12} y={y - 12} width="24" height="24">
                    <div className="flex items-center justify-center h-full w-full">
                      <Icon className="w-5 h-5" strokeWidth={1.8} style={{ color: step.color }} />
                    </div>
                  </foreignObject>

                  {/* Title */}
                  <text x={step.x} y={y + 48} textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700" fontFamily="Inter">{step.title}</text>
                  
                  {/* Model badge bg */}
                  <rect x={step.x - 32} y={y + 56} width="64" height="18" rx="9" fill={step.color} opacity="0.15" stroke={step.color} strokeWidth="0.5" />
                  <text x={step.x} y={y + 68} textAnchor="middle" fill={step.color} fontSize="9" fontWeight="700" fontFamily="Inter">{step.model}</text>

                  {/* Description */}
                  <text x={step.x} y={y + 90} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500" fontFamily="Inter">{step.description}</text>
                </motion.g>
              );
            })}
          </svg>
        </div>

        {/* Detail panel on hover */}
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
              <div className="bg-white/[0.05] border border-white/[0.1] rounded-xl p-5 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: hoveredStep.color + '20' }}>
                    <hoveredStep.icon className="w-4 h-4" style={{ color: hoveredStep.color }} strokeWidth={2} />
                  </div>
                  <div>
                    <span className="text-white font-bold text-sm">{hoveredStep.title}</span>
                    <span className="text-slate-500 text-xs ml-2">powered by {hoveredStep.model}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{hoveredStep.detail}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom badge */}
        {!hoveredStep && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] rounded-full border border-white/[0.1]">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">
                Complete Incident Response in Under 60 Seconds
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NovaFlowDiagram;
