/**
 * Nova Sentinel Hero - Dark, cinematic, Wiz.io-inspired
 * Animated grid background with floating orbs and bold typography
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Clock, Brain, Sparkles } from 'lucide-react';
import NovaSentinelLogo from '../Logo';

const LandingHero: React.FC = () => {
  const stats = [
    { value: '<60s', label: 'Incident Resolution', icon: Clock },
    { value: '5', label: 'Nova AI Models', icon: Brain },
    { value: '100%', label: 'Autonomous', icon: Zap },
  ];

  return (
    <section className="hero-dark relative min-h-screen flex items-center justify-center noise-overlay">
      {/* Animated grid */}
      <div className="absolute inset-0 hero-grid-dark opacity-60" />
      
      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{ 
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            top: '10%', left: '10%'
          }}
          animate={{ 
            x: [0, 30, -20, 0], 
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full"
          style={{ 
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            top: '50%', right: '5%'
          }}
          animate={{ 
            x: [0, -40, 30, 0], 
            y: [0, 20, -30, 0],
            scale: [1, 0.9, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{ 
            background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
            bottom: '15%', left: '30%'
          }}
          animate={{ 
            x: [0, 50, -30, 0], 
            y: [0, -20, 40, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-10"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">
              Amazon Nova AI Hackathon 2026
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-8xl font-black text-white mb-8 tracking-tight leading-[0.9]"
          >
            <span className="block">Security Incidents</span>
            <span className="block mt-2 gradient-text-hero">Resolved in Seconds</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Nova Sentinel autonomously detects, investigates, and remediates cloud security threats 
            using <span className="text-white font-semibold">5 Amazon Nova AI models</span> working 
            in perfect orchestration.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20"
          >
            <a
              href="#demo"
              className="btn-nova group px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-base flex items-center gap-3"
            >
              <Shield className="w-5 h-5" />
              Launch Live Demo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#features"
              className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-semibold text-base hover:bg-white/10 transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-3">
                    <Icon className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mb-1 metric-value">{stat.value}</div>
                  <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

      {/* Nova Models Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap justify-center items-center gap-3">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mr-4">Powered by</span>
            {[
              { name: 'Nova Pro', color: 'text-blue-600 bg-blue-50 border-blue-200' },
              { name: 'Nova 2 Lite', color: 'text-purple-600 bg-purple-50 border-purple-200' },
              { name: 'Nova Micro', color: 'text-amber-600 bg-amber-50 border-amber-200' },
              { name: 'Nova 2 Sonic', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              { name: 'Nova Act', color: 'text-rose-600 bg-rose-50 border-rose-200' },
            ].map((tech) => (
              <span 
                key={tech.name} 
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tech.color}`}
              >
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
