/**
 * MITRE ATLAS Teaser — AI pipeline self-monitoring, premium dark design
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, Lock } from 'lucide-react';

const TECHNIQUES = [
  { id: 'AML.T0051', name: 'Prompt Injection', status: 'CLEAN' },
  { id: 'AML.T0016', name: 'Capability Theft', status: 'CLEAN' },
  { id: 'AML.T0040', name: 'API Abuse', status: 'CLEAN' },
  { id: 'AML.T0025', name: 'Adversarial Inputs', status: 'CLEAN' },
  { id: 'AML.T0024', name: 'Data Exfiltration', status: 'CLEAN' },
  { id: 'AML.T0044', name: 'Model Poisoning', status: 'CLEAN' },
];

const MITREAtlasTeaser: React.FC = () => {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #020817 0%, #080D1F 100%)' }}
    >
      {/* AI Brain threat vector background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: 'url(/images/mitre-bg.png)', opacity: 0.14 }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(2,8,23,0.60) 0%, rgba(8,13,31,0.75) 100%)' }}
      />
      {/* Subtle gradient top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent)' }}
      />
      {/* Glow orb */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: '600px', height: '300px',
          top: '0', left: '50%', transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(37,99,235,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
            }}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-300 text-xs font-bold tracking-wide">
              MITRE ATLAS · OWASP LLM Top 10
            </span>
          </div>
          <h2
            className="font-extrabold text-white tracking-tight mb-4"
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}
          >
            wolfir monitors its own AI pipeline
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base leading-relaxed">
            Six ATLAS techniques monitored in real time. Who protects the AI?{' '}
            <span className="text-slate-300 font-medium">We do.</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          {TECHNIQUES.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex flex-col items-center text-center px-4 py-5 rounded-2xl transition-all duration-200 group"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(96,165,250,0.25)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(96,165,250,0.15)' }}
              >
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[9px] font-mono text-slate-600 mb-1.5 tracking-widest">{t.id}</span>
              <span className="text-xs font-bold text-slate-200 mb-3 leading-snug">{t.name}</span>
              <span
                className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold"
                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.2)', color: '#6EE7B7' }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {t.status}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.15), transparent)' }}
      />
    </section>
  );
};

export default MITREAtlasTeaser;
