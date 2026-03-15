/**
 * By the numbers — premium horizontal stat strip, big-tech style
 */
import React from 'react';
import { motion } from 'framer-motion';

const STATS = [
  {
    value: '960+',
    label: 'Alerts per day',
    sub: 'avg SOC · 40% uninvestigated',
  },
  {
    value: '5',
    label: 'Nova Models',
    sub: 'Pro, Lite, Micro, Sonic, Canvas',
  },
  {
    value: '23',
    label: 'MCP Tools',
    sub: 'across 6 AWS MCP servers',
  },
  {
    value: '97%',
    label: 'AI breach victims',
    sub: 'lacked AI access controls',
  },
  {
    value: '90d',
    label: 'CloudTrail lookback',
    sub: 'kill chain tracing',
  },
];

const StatsCards: React.FC = () => {
  return (
    <section className="py-20 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="eyebrow mb-3">By the numbers</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cloud + AI security, unified in one platform
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="bg-white px-6 py-8 flex flex-col items-center text-center group hover:bg-blue-50/40 transition-colors duration-200"
            >
              <span
                className="font-extrabold text-slate-900 tracking-tight leading-none mb-2 font-mono"
                style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)' }}
              >
                <span
                  style={{
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #6366F1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </span>
              </span>
              <p className="text-sm font-bold text-slate-800 mb-1">{stat.label}</p>
              <p className="text-xs text-slate-400 leading-snug">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCards;
