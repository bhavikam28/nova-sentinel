/**
 * Real AWS Connection - Premium analysis trigger component
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Loader2, Calendar, Database, Zap } from 'lucide-react';

interface RealAWSConnectProps {
  onAnalyze: (daysBack: number, maxEvents: number) => Promise<void>;
  loading?: boolean;
}

const RealAWSConnect: React.FC<RealAWSConnectProps> = ({ onAnalyze, loading = false }) => {
  const [daysBack, setDaysBack] = useState(7);
  const [maxEvents, setMaxEvents] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 shadow-glow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Analyze Real CloudTrail Events</h3>
          <p className="text-sm text-slate-500">
            Fetch and analyze security events from the past {daysBack} days.
          </p>
        </div>
      </div>

      {/* Time Range Slider */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Time Range
          </label>
          <span className="text-sm font-bold text-indigo-600 tabular-nums">
            {daysBack} {daysBack === 1 ? 'day' : 'days'}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="90"
          value={daysBack}
          onChange={(e) => setDaysBack(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>1 day</span>
          <span>90 days</span>
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-5"
        >
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              Max Events
            </label>
            <span className="text-sm font-bold text-indigo-600 tabular-nums">{maxEvents}</span>
          </div>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={maxEvents}
            onChange={(e) => setMaxEvents(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </motion.div>
      )}

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-indigo-600 hover:text-indigo-700 font-bold mb-5 block"
      >
        {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
      </button>

      {/* CTA */}
      <button
        onClick={() => onAnalyze(daysBack, maxEvents)}
        disabled={loading}
        className="btn-nova w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Real AWS Account...</>
        ) : (
          <><Zap className="w-5 h-5" /> Start CloudTrail Analysis</>
        )}
      </button>
    </div>
  );
};

export default RealAWSConnect;
