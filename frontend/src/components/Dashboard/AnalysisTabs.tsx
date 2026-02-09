/**
 * Premium Analysis Tabs - Pill-style navigation with animations
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, PlayCircle, Shield, Zap } from 'lucide-react';

interface AnalysisTabsProps {
  children: {
    realAWS: React.ReactNode;
    demo: React.ReactNode;
  };
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'real' | 'demo'>('demo');

  const tabs = [
    { 
      id: 'real' as const, 
      label: 'Real AWS Account', 
      icon: Cloud,
      description: 'Analyze live CloudTrail events',
      accent: 'indigo'
    },
    { 
      id: 'demo' as const, 
      label: 'Demo Scenarios', 
      icon: PlayCircle,
      description: 'Pre-built attack simulations',
      accent: 'violet'
    },
  ];

  return (
    <div className="w-full">
      {/* Tab Navigation - Premium Pill Design */}
      <div className="bg-slate-100 rounded-2xl p-1.5 flex mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 relative px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 ${
                isActive
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-card"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2.5">
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.id === 'real' && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full border border-indigo-200">
                    LIVE
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content with Animation */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {activeTab === 'real' ? children.realAWS : children.demo}
      </motion.div>
    </div>
  );
};

export default AnalysisTabs;
