/**
 * Timeline View - Premium vertical timeline with expandable events
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, User, Server, AlertCircle, Shield } from 'lucide-react';
import type { Timeline, TimelineEvent } from '../../types/incident';

interface TimelineViewProps {
  timeline: Timeline;
}

const TimelineView: React.FC<TimelineViewProps> = ({ timeline }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const toggleEvent = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) newExpanded.delete(index);
    else newExpanded.add(index);
    setExpandedEvents(newExpanded);
  };

  const getSeverityStyles = (severity: string) => {
    const styles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
      CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
      HIGH: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
      MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      LOW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    };
    return styles[severity] || styles.LOW;
  };

  const formatTimestamp = (timestamp: Date | string) => {
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(date.getTime())) return timestamp.toString();
      return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return timestamp.toString(); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Event Timeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {timeline.events.length} events • {(timeline.confidence * 100).toFixed(0)}% confidence
          </p>
        </div>
        <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
          <span className="text-xs font-bold text-emerald-700">
            {(timeline.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-3">
            {timeline.events.map((event, index) => {
              const isExpanded = expandedEvents.has(index);
              const severity = getSeverityStyles(event.severity || 'MEDIUM');

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="relative pl-12"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-3.5 top-4">
                    <div className={`w-3 h-3 rounded-full ${severity.dot} ring-2 ring-white shadow-sm`} />
                  </div>

                  {/* Event Card */}
                  <div 
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-card transition-all cursor-pointer"
                    onClick={() => toggleEvent(index)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${severity.bg} ${severity.text} ${severity.border}`}>
                            {event.severity || 'MEDIUM'}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">{event.action}</h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {event.actor}</span>
                          <span className="flex items-center gap-1"><Server className="w-3 h-3" /> {event.resource}</span>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0 ml-2">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-slate-100"
                        >
                          {event.details && (
                            <div className="mb-2">
                              <p className="text-xs font-bold text-slate-600 mb-1">Details</p>
                              <p className="text-xs text-slate-500">{event.details}</p>
                            </div>
                          )}
                          {event.significance && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs font-bold text-amber-700 mb-0.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Significance
                              </p>
                              <p className="text-xs text-amber-600">{event.significance}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
