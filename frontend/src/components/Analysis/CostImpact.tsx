/**
 * Cost Impact Estimation - Financial impact analysis of security incidents
 * Estimates compute costs, breach fines, downtime costs, remediation costs
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, AlertTriangle, Server, Database, Scale } from 'lucide-react';
import type { Timeline } from '../../types/incident';

interface CostImpactProps {
  timeline: Timeline;
  incidentType?: string;
}

interface CostCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  amount: number;
  description: string;
  color: string;
  bg: string;
}

function estimateCosts(timeline: Timeline, incidentType?: string): CostCategory[] {
  const eventCount = timeline.events?.length || 0;
  const hasCritical = timeline.events?.some(e => e.severity === 'CRITICAL');
  const hasDataAccess = timeline.events?.some(e => 
    (e.action || '').toLowerCase().includes('data') ||
    (e.action || '').toLowerCase().includes('s3') ||
    (e.action || '').toLowerCase().includes('get')
  );
  const isCryptoMining = incidentType?.toLowerCase().includes('crypto');
  const isDataExfil = incidentType?.toLowerCase().includes('exfil') || incidentType?.toLowerCase().includes('data');
  const isPrivilegeEsc = incidentType?.toLowerCase().includes('privilege');

  const costs: CostCategory[] = [];

  // Compute costs (especially for crypto mining)
  if (isCryptoMining) {
    costs.push({
      id: 'compute',
      label: 'Unauthorized Compute',
      icon: Server,
      amount: 2400 + Math.floor(eventCount * 180),
      description: 'Estimated cost of unauthorized EC2 instances running crypto mining workloads over the incident duration.',
      color: 'text-red-700',
      bg: 'bg-red-50',
    });
  } else {
    costs.push({
      id: 'compute',
      label: 'Compromised Resources',
      icon: Server,
      amount: 350 + Math.floor(eventCount * 45),
      description: 'Estimated cost of compromised cloud resources during the incident window.',
      color: 'text-orange-700',
      bg: 'bg-orange-50',
    });
  }

  // Data breach costs
  if (isDataExfil || hasDataAccess) {
    costs.push({
      id: 'breach',
      label: 'Data Breach Exposure',
      icon: Database,
      amount: 15000 + (hasCritical ? 25000 : 5000),
      description: 'Potential liability based on IBM Cost of Data Breach Report 2025 — average $4.88M per breach. This estimates exposure for the scope observed.',
      color: 'text-red-700',
      bg: 'bg-red-50',
    });
  }

  // Downtime costs
  costs.push({
    id: 'downtime',
    label: 'Operational Downtime',
    icon: Clock,
    amount: hasCritical ? 8500 : 2200,
    description: 'Estimated revenue impact from service disruption during investigation and remediation.',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  });

  // Remediation labor costs
  costs.push({
    id: 'remediation',
    label: 'Manual Remediation (Traditional)',
    icon: AlertTriangle,
    amount: hasCritical ? 12000 : 4500,
    description: 'Estimated cost of security team labor for manual incident response without Nova Sentinel.',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
  });

  // Compliance penalty risk
  if (hasCritical || isDataExfil) {
    costs.push({
      id: 'compliance',
      label: 'Compliance Penalty Risk',
      icon: Scale,
      amount: 50000,
      description: 'Potential regulatory fines for non-compliance with GDPR, CCPA, HIPAA, or PCI-DSS depending on data types involved.',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
    });
  }

  return costs;
}

const CompactBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
};

const CostImpact: React.FC<CostImpactProps> = ({ timeline, incidentType }) => {
  const costs = useMemo(() => estimateCosts(timeline, incidentType), [timeline, incidentType]);

  const totalTraditional = useMemo(() => costs.reduce((sum, c) => sum + c.amount, 0), [costs]);
  const novaSentinelSavings = useMemo(() => {
    // Nova Sentinel reduces manual remediation to near-zero and cuts downtime significantly
    const remediationSaving = costs.find(c => c.id === 'remediation')?.amount || 0;
    const downtimeSaving = (costs.find(c => c.id === 'downtime')?.amount || 0) * 0.85; // 85% reduction
    return Math.round(remediationSaving + downtimeSaving);
  }, [costs]);

  const maxCost = Math.max(...costs.map(c => c.amount));
  const barColors: Record<string, string> = {
    'text-red-700': '#EF4444',
    'text-orange-700': '#F97316',
    'text-amber-700': '#F59E0B',
    'text-purple-700': '#8B5CF6',
    'text-indigo-700': '#6366F1',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Cost Impact Estimation
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Estimated financial exposure and Nova Sentinel savings
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Total Exposure</div>
            <div className="text-xl font-black text-red-700 metric-value">
              ${totalTraditional.toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Nova Sentinel Saves</div>
            <div className="text-xl font-black text-emerald-700 metric-value">
              ${novaSentinelSavings.toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Response Time</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-indigo-700 metric-value">&lt;60s</span>
              <span className="text-[10px] text-indigo-400">vs 45min avg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="p-5 space-y-3">
        {costs.map((cost, i) => {
          const Icon = cost.icon;
          return (
            <motion.div
              key={cost.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group"
            >
              <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                <div className={`w-8 h-8 rounded-lg ${cost.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${cost.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-slate-900">{cost.label}</h4>
                    <span className={`text-sm font-bold ${cost.color} metric-value`}>
                      ${cost.amount.toLocaleString()}
                    </span>
                  </div>
                  <CompactBar value={cost.amount} max={maxCost} color={barColors[cost.color] || '#6366F1'} />
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{cost.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Nova Sentinel ROI */}
      <div className="px-5 pb-5">
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-900">Nova Sentinel ROI</h4>
              <p className="text-xs text-indigo-600">
                Autonomous response reduces manual remediation by <span className="font-bold">100%</span> and 
                cuts downtime by <span className="font-bold">85%</span>, saving an estimated <span className="font-bold">${novaSentinelSavings.toLocaleString()}</span> per incident.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostImpact;
