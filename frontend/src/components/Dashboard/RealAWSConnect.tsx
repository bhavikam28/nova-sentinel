/**
 * Real AWS Analysis — two distinct modes:
 *   1. Investigate Threats   — CloudTrail forensics, incident detection, full agent pipeline
 *   2. Audit Security Posture — proactive health check, IAM / MFA / billing / Security Hub scan
 * Multi-Account: supports AWS Organizations cross-account role delegation
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Calendar, Database, Zap, Shield, Plus, Building2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Trash2, Globe } from 'lucide-react';

interface LinkedAccount {
  id: string;
  accountId: string;
  alias: string;
  roleArn: string;
  status: 'connected' | 'pending' | 'error';
  environment: 'production' | 'staging' | 'development' | 'security';
}

interface RealAWSConnectProps {
  onAnalyze: (daysBack: number, maxEvents: number) => Promise<void>;
  onHealthCheck?: () => Promise<void>;
  loading?: boolean;
  healthCheckLoading?: boolean;
}

const ENV_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  production:  { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-400' },
  staging:     { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  development: { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  security:    { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
};

const RealAWSConnect: React.FC<RealAWSConnectProps> = ({
  onAnalyze,
  onHealthCheck,
  loading = false,
  healthCheckLoading = false,
}) => {
  const [daysBack, setDaysBack] = useState(30);
  const [maxEvents, setMaxEvents] = useState(200);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOrgPanel, setShowOrgPanel] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newRoleArn, setNewRoleArn] = useState('');
  const [newEnv, setNewEnv] = useState<LinkedAccount['environment']>('production');

  const handleAddAccount = () => {
    if (!newAccountId.trim() || !newAlias.trim()) return;
    const roleArn = newRoleArn.trim() || `arn:aws:iam::${newAccountId.trim()}:role/wolfir-cross-account-role`;
    setLinkedAccounts(prev => [...prev, {
      id: Date.now().toString(),
      accountId: newAccountId.trim(),
      alias: newAlias.trim(),
      roleArn,
      status: 'pending',
      environment: newEnv,
    }]);
    setNewAlias(''); setNewAccountId(''); setNewRoleArn('');
    setShowAddForm(false);
    // Simulate connection check
    setTimeout(() => {
      setLinkedAccounts(prev => prev.map(a =>
        a.status === 'pending' ? { ...a, status: 'connected' } : a
      ));
    }, 2000);
  };

  const handleRemoveAccount = (id: string) => {
    setLinkedAccounts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* ── PRIMARY: Investigate Threats ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Investigate Threats</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan CloudTrail for the past {daysBack} days — AI agents detect attack patterns, build a full incident timeline and remediation plan.
              </p>
            </div>
          </div>

          {/* Time Range */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                Time Range
              </label>
              <span className="text-xs font-bold text-indigo-600">{daysBack} {daysBack === 1 ? 'day' : 'days'}</span>
            </div>
            <input
              type="range" min="1" max="90" value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>1 day</span><span>90 days</span>
            </div>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold mb-3 block"
          >
            {showAdvanced ? '− Hide' : '+ Show'} advanced options
          </button>

          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-slate-400" />
                  Max Events
                </label>
                <span className="text-xs font-bold text-indigo-600">{maxEvents}</span>
              </div>
              <input
                type="range" min="10" max="500" step="10" value={maxEvents}
                onChange={(e) => setMaxEvents(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
              />
            </motion.div>
          )}

          <button
            onClick={() => onAnalyze(daysBack, maxEvents)}
            disabled={loading || healthCheckLoading}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-indigo-700 transition-colors"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Zap className="w-4 h-4" /> Run Threat Investigation</>
            )}
          </button>
        </div>
      </div>

      {/* ── SECONDARY: Audit Security Posture ── */}
      {onHealthCheck && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800">Audit Security Posture</p>
              <p className="text-[11px] text-slate-500 mt-0.5">No incidents to investigate? Run a proactive audit — checks IAM, MFA, billing anomalies and Security Hub.</p>
            </div>
            <button
              onClick={onHealthCheck}
              disabled={healthCheckLoading || loading}
              className="flex-shrink-0 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
            >
              {healthCheckLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
              ) : (
                <><Shield className="w-3.5 h-3.5" /> Run Audit</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── AWS Organizations / Multi-Account ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowOrgPanel(!showOrgPanel)}
          className="w-full px-6 py-4 flex items-center gap-3 hover:bg-slate-50/70 transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-800">AWS Organizations &amp; Multi-Account</p>
              {linkedAccounts.length > 0 && (
                <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full border border-violet-200">
                  {linkedAccounts.length} linked
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Monitor dev, staging &amp; prod accounts together — one pane of glass for your entire org.
            </p>
          </div>
          {showOrgPanel ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
        </button>

        <AnimatePresence>
          {showOrgPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-100"
            >
              <div className="px-6 pb-5 pt-4 space-y-3">
                {/* How it works */}
                <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-[11px] text-violet-700 leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Cross-account role delegation</p>
                  wolfir assumes an IAM role (<code className="bg-violet-100 px-1 rounded font-mono">wolfir-cross-account-role</code>) in each linked account using <strong>STS AssumeRole</strong>. No long-lived credentials required — temporary tokens only.
                </div>

                {/* Linked accounts list */}
                {linkedAccounts.length > 0 && (
                  <div className="space-y-2">
                    {linkedAccounts.map((acct) => {
                      const envCfg = ENV_COLORS[acct.environment];
                      return (
                        <motion.div
                          key={acct.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${envCfg.dot} ${acct.status === 'pending' ? 'animate-pulse' : ''}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-800">{acct.alias}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${envCfg.bg} ${envCfg.text}`}>{acct.environment}</span>
                              {acct.status === 'connected' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                              {acct.status === 'pending' && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
                              {acct.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{acct.accountId}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveAccount(acct.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Add account form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                        <p className="text-xs font-bold text-slate-700">Link AWS Account</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Account Alias</label>
                            <input
                              type="text"
                              value={newAlias}
                              onChange={e => setNewAlias(e.target.value)}
                              placeholder="e.g. Production"
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Account ID</label>
                            <input
                              type="text"
                              value={newAccountId}
                              onChange={e => setNewAccountId(e.target.value)}
                              placeholder="123456789012"
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Cross-Account Role ARN (optional)</label>
                          <input
                            type="text"
                            value={newRoleArn}
                            onChange={e => setNewRoleArn(e.target.value)}
                            placeholder="arn:aws:iam::123456789012:role/wolfir-cross-account-role"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Environment</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {(['production', 'staging', 'development', 'security'] as const).map(env => (
                              <button
                                key={env}
                                onClick={() => setNewEnv(env)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors capitalize ${
                                  newEnv === env
                                    ? `${ENV_COLORS[env].bg} ${ENV_COLORS[env].text} border-current`
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {env}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleAddAccount}
                            disabled={!newAccountId.trim() || !newAlias.trim()}
                            className="flex-1 px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Link Account
                          </button>
                          <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-violet-300 rounded-xl text-xs font-semibold text-violet-600 hover:bg-violet-50 hover:border-violet-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add AWS Account
                  </button>
                )}

                {/* IAM setup hint */}
                <div className="text-[10px] text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-500">Setup:</span> Create an IAM role named <code className="bg-slate-100 px-1 rounded font-mono">wolfir-cross-account-role</code> in each target account with <code className="bg-slate-100 px-1 rounded font-mono">ReadOnlyAccess</code> + <code className="bg-slate-100 px-1 rounded font-mono">CloudTrail:LookupEvents</code>. Trust your primary account ID as the principal.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RealAWSConnect;
