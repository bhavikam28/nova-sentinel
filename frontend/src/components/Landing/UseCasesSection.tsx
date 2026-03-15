/**
 * Use Cases Section — Premium cards, Cloud + AI security outcomes
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Database, UserCog, Lock, Brain, ShieldAlert, FileCheck, Activity, ArrowRight,
} from 'lucide-react';

const useCases = [
  {
    icon: Cpu,
    title: 'Crypto Mining & Compute Abuse',
    tag: 'Cloud',
    tagColor: { bg: 'rgba(37,99,235,0.08)', border: 'rgba(37,99,235,0.2)', text: '#2563EB' },
    bullets: ['EC2 abuse detection', 'Coin-mining fingerprints', 'MITRE ATT&CK mapping', '<60s remediation'],
    outcome: 'Stop runaway costs before they hit the bill.',
    iconColor: '#2563EB',
    iconBg: 'rgba(37,99,235,0.08)',
    accentLine: 'rgba(37,99,235,0.6)',
  },
  {
    icon: Database,
    title: 'Data Exfiltration',
    tag: 'Cloud',
    tagColor: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', text: '#6366F1' },
    bullets: ['S3 GetObject bursts', 'Cross-account access', 'Attack path visualization', 'T1530, T1041'],
    outcome: 'Contain before data leaves your perimeter.',
    iconColor: '#6366F1',
    iconBg: 'rgba(99,102,241,0.08)',
    accentLine: 'rgba(99,102,241,0.6)',
  },
  {
    icon: UserCog,
    title: 'Privilege Escalation',
    tag: 'Cloud',
    tagColor: { bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', text: '#7C3AED' },
    bullets: ['IAM policy changes', 'Role assumption chains', 'Least-privilege recommendations', 'Kill-chain tracing'],
    outcome: 'Catch escalation before it becomes persistence.',
    iconColor: '#7C3AED',
    iconBg: 'rgba(124,58,237,0.08)',
    accentLine: 'rgba(124,58,237,0.6)',
  },
  {
    icon: Lock,
    title: 'Unauthorized Access',
    tag: 'Cloud',
    tagColor: { bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.2)', text: '#0EA5E9' },
    bullets: ['Failed login patterns', 'MFA bypass detection', 'Root-user activity alerts', 'Credential misuse'],
    outcome: 'Reduce MTTD for compromised credentials.',
    iconColor: '#0EA5E9',
    iconBg: 'rgba(14,165,233,0.08)',
    accentLine: 'rgba(14,165,233,0.6)',
  },
  {
    icon: Brain,
    title: 'AI Pipeline Monitoring',
    tag: 'AI Security',
    tagColor: { bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)', text: '#059669' },
    bullets: ['MITRE ATLAS coverage', 'OWASP LLM Top 10', '6 techniques in real time', 'Self-monitoring loop'],
    outcome: 'Who protects the AI? wolfir monitors its own pipeline.',
    iconColor: '#059669',
    iconBg: 'rgba(5,150,105,0.08)',
    accentLine: 'rgba(5,150,105,0.6)',
  },
  {
    icon: ShieldAlert,
    title: 'Prompt Injection & Shadow AI',
    tag: 'AI Security',
    tagColor: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#D97706' },
    bullets: ['Ungoverned Bedrock calls', 'Prompt injection detection', 'Shadow AI discovery', 'Guardrails integration'],
    outcome: 'Detect and contain AI abuse before it spreads.',
    iconColor: '#D97706',
    iconBg: 'rgba(245,158,11,0.08)',
    accentLine: 'rgba(245,158,11,0.6)',
  },
  {
    icon: FileCheck,
    title: 'Compliance Audits',
    tag: 'Both',
    tagColor: { bg: 'rgba(20,184,166,0.08)', border: 'rgba(20,184,166,0.2)', text: '#0D9488' },
    bullets: ['CIS, NIST, SOC 2, PCI-DSS', 'Audit-ready PDF reports', 'Evidence deep-links', 'Gap analysis'],
    outcome: 'Audit-ready in minutes, not weeks.',
    iconColor: '#0D9488',
    iconBg: 'rgba(20,184,166,0.08)',
    accentLine: 'rgba(20,184,166,0.6)',
  },
  {
    icon: Activity,
    title: 'Security Health Check',
    tag: 'Both',
    tagColor: { bg: 'rgba(71,85,105,0.08)', border: 'rgba(71,85,105,0.2)', text: '#475569' },
    bullets: ['IAM audit', 'CloudTrail anomalies', 'Billing drift detection', 'No incident required'],
    outcome: 'Continuous visibility without alert fatigue.',
    iconColor: '#475569',
    iconBg: 'rgba(71,85,105,0.08)',
    accentLine: 'rgba(71,85,105,0.6)',
  },
];

const UseCasesSection: React.FC = () => {
  return (
    <section className="py-24 relative overflow-hidden border-y border-slate-200/60" id="use-cases" style={{ background: '#f8fafc' }}>
      {/* SOC analyst background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: 'url(/images/soc-analyst.png)', opacity: 0.055 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(248,250,252,0.7) 0%, rgba(248,250,252,0.85) 100%)' }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="eyebrow mb-3">Use Cases</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Cloud + AI Security
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto">
            Incident response for AWS. AI pipeline monitoring with MITRE ATLAS.{' '}
            <span className="font-semibold text-slate-700">Both in one platform.</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {useCases.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                {/* Accent top line */}
                <div className="h-0.5 w-full" style={{ background: uc.accentLine }} />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: uc.iconBg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: uc.iconColor }} strokeWidth={1.75} />
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide"
                      style={{ background: uc.tagColor.bg, border: `1px solid ${uc.tagColor.border}`, color: uc.tagColor.text }}
                    >
                      {uc.tag}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-3 leading-snug">{uc.title}</h3>

                  <ul className="space-y-1.5 mb-5">
                    {uc.bullets.map((b) => (
                      <li key={b} className="text-xs text-slate-500 flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: uc.iconColor, opacity: 0.6 }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div
                    className="pt-4 border-t text-xs font-semibold leading-snug"
                    style={{ borderColor: 'rgba(0,0,0,0.06)', color: uc.iconColor }}
                  >
                    {uc.outcome}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <a
            href="#demo"
            onClick={(e) => { e.preventDefault(); window.location.hash = '#demo'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
              boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
            }}
          >
            Try a scenario
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>

  );
};

export default UseCasesSection;
