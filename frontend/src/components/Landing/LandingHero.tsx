/**
 * wolfir Hero — Premium dark navy, big-tech feel
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Play, Sparkles, Eye, Brain, Target, ShieldCheck, FileText, ChevronRight } from 'lucide-react';

const PIPELINE_STEPS = [
  { id: 'detect', label: 'Detect', icon: Eye },
  { id: 'investigate', label: 'Investigate', icon: Brain },
  { id: 'classify', label: 'Classify', icon: Target },
  { id: 'remediate', label: 'Remediate', icon: ShieldCheck },
  { id: 'document', label: 'Document', icon: FileText },
];

const NOVA_BADGES = [
  { name: 'Nova Pro', bg: 'rgba(37,99,235,0.15)', border: 'rgba(96,165,250,0.3)', color: '#93C5FD' },
  { name: 'Nova 2 Lite', bg: 'rgba(99,102,241,0.15)', border: 'rgba(129,140,248,0.3)', color: '#A5B4FC' },
  { name: 'Nova Micro', bg: 'rgba(245,158,11,0.1)', border: 'rgba(251,191,36,0.25)', color: '#FCD34D' },
  { name: 'Nova 2 Sonic', bg: 'rgba(16,185,129,0.1)', border: 'rgba(52,211,153,0.25)', color: '#6EE7B7' },
  { name: 'Nova Canvas', bg: 'rgba(236,72,153,0.1)', border: 'rgba(244,114,182,0.25)', color: '#F9A8D4' },
  { name: 'Nova Act', bg: 'rgba(239,68,68,0.1)', border: 'rgba(252,165,165,0.25)', color: '#FCA5A5' },
];

const LandingHero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveIndex((i) => (i + 1) % PIPELINE_STEPS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #020817 0%, #080D1F 35%, #0D1B3E 65%, #06101E 100%)' }}
    >
      {/* Hero background image — network nodes */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: 'url(/images/hero-bg.png)', opacity: 0.18 }}
      />
      {/* Dark overlay to keep text readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(2,8,23,0.75) 0%, rgba(8,13,31,0.55) 50%, rgba(13,27,62,0.70) 100%)' }}
      />

      {/* Decorative right-side glow — replaces globe image */}
      <div
        className="absolute hidden xl:block pointer-events-none"
        style={{
          right: '-120px', top: '50%', transform: 'translateY(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle at 60% 50%, rgba(99,102,241,0.18) 0%, rgba(37,99,235,0.10) 35%, transparent 70%)',
          borderRadius: '50%',
        }}
      />
      {/* Inner tighter glow ring */}
      <div
        className="absolute hidden xl:block pointer-events-none"
        style={{
          right: '-40px', top: '50%', transform: 'translateY(-50%)',
          width: '380px', height: '380px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 65%)',
          borderRadius: '50%',
          border: '1px solid rgba(99,102,241,0.08)',
        }}
      />

      {/* Radial gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute rounded-full"
          style={{
            width: '900px', height: '900px',
            top: '-300px', right: '-200px',
            background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '700px', height: '700px',
            bottom: '-200px', left: '-150px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: '500px', height: '500px',
            top: '40%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
            opacity: 0.4,
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-28 w-full">
        <div className="text-center">

          {/* Announcement badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-10 cursor-default"
            style={{
              background: 'rgba(37,99,235,0.12)',
              border: '1px solid rgba(96,165,250,0.25)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold tracking-wide">Cloud + AI Security on AWS · Built with Amazon Nova</span>
            <ChevronRight className="w-3.5 h-3.5 text-blue-500" />
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-extrabold text-white tracking-tight leading-[1.03] mb-6"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}
          >
            <span className="block">From Signal to Resolution.</span>
            <span
              className="block mt-2"
              style={{
                background: 'linear-gradient(135deg, #60A5FA 0%, #818CF8 45%, #C4B5FD 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              And the AI Watches Itself.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            960+ alerts/day. 40% go uninvestigated.{' '}
            <span className="text-slate-300 font-medium">wolfir</span> resolves them
            autonomously using 5 AI agents — cloud incidents and AI pipeline threats, unified.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-20"
          >
            <a
              href="#demo"
              className="group inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl font-bold text-base text-white transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                boxShadow: '0 4px 28px rgba(37,99,235,0.45), 0 1px 0 rgba(255,255,255,0.1) inset',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 36px rgba(37,99,235,0.6), 0 1px 0 rgba(255,255,255,0.1) inset';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 28px rgba(37,99,235,0.45), 0 1px 0 rgba(255,255,255,0.1) inset';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              <Play className="w-5 h-5" />
              Try Demo Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
            <a
              href="#login"
              className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl font-semibold text-base text-white transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            >
              <Shield className="w-5 h-5 text-blue-400" />
              Launch Console
            </a>
          </motion.div>

          {/* Pipeline — 5 steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.42 }}
            className="mb-16"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] mb-6 text-blue-400/70">
              5-Agent Autonomous Pipeline
            </p>
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
              {PIPELINE_STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = activeIndex === i;
                return (
                  <React.Fragment key={s.id}>
                    <motion.div
                      animate={{
                        scale: isActive ? 1.07 : 1,
                        boxShadow: isActive
                          ? '0 0 0 1px rgba(96,165,250,0.5), 0 8px 32px rgba(37,99,235,0.4)'
                          : '0 1px 4px rgba(0,0,0,0.4)',
                      }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl cursor-default min-w-[100px]"
                      style={{
                        background: isActive ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.04)',
                        border: isActive ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: isActive ? 'rgba(37,99,235,0.45)' : 'rgba(255,255,255,0.06)' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: isActive ? '#93C5FD' : '#475569' }} />
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={{ color: isActive ? '#93C5FD' : '#475569' }}
                      >
                        {s.label}
                      </span>
                    </motion.div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <motion.div
                        animate={{ opacity: activeIndex === i ? 1 : 0.25 }}
                        className="hidden sm:block h-px w-8 rounded-full"
                        style={{ background: 'linear-gradient(90deg, rgba(96,165,250,0.8), rgba(96,165,250,0.15))' }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="w-px h-8 bg-gradient-to-b from-transparent via-slate-700 to-transparent mx-auto mb-8"
          />

          {/* Nova model badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center items-center gap-2.5"
          >
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mr-1">Powered by</span>
            {NOVA_BADGES.map((tech) => (
              <span
                key={tech.name}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide"
                style={{ background: tech.bg, border: `1px solid ${tech.border}`, color: tech.color }}
              >
                {tech.name}
              </span>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 text-xs text-slate-600"
          >
            Credentials stay local · No AWS account needed for demo
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
