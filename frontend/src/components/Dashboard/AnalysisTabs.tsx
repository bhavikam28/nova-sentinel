/**
 * Analysis Tabs - Clean pill navigation without bulky icons
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface AnalysisTabsProps {
  children: {
    realAWS: React.ReactNode;
    demo: React.ReactNode;
  };
}

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'real' | 'demo'>('demo');

  const tabs = [
    { id: 'real' as const, label: 'Real AWS Account', live: true },
    { id: 'demo' as const, label: 'Demo Scenarios', live: false },
  ];

  return (
    <div className="w-full">
      <div className="bg-slate-100 rounded-xl p-1 flex mb-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 relative px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.label}
                {tab.live && (
                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-200">
                    LIVE
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'real' ? children.realAWS : children.demo}
      </motion.div>
    </div>
  );
};

export default AnalysisTabs;
