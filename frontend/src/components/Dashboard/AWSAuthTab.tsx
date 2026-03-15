/**
 * AWS Authentication — CLI Profile only (the secure, recommended method).
 * Access Keys and SSO removed: long-lived keys are a security anti-pattern;
 * SSO is handled externally via `aws sso login` before launching wolfir.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, CheckCircle2, AlertCircle, 
  Copy, Loader2, Terminal, Info
} from 'lucide-react';

interface AWSAuthTabProps {
  onAuthMethodSelected: (method: 'profile') => void;
  currentMethod?: string;
  onTestConnection: () => Promise<boolean>;
  loading?: boolean;
}

const AWSAuthTab: React.FC<AWSAuthTabProps> = ({ 
  onAuthMethodSelected, 
  onTestConnection,
  loading = false 
}) => {
  const [profileName, setProfileName] = useState('default');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    onAuthMethodSelected('profile');
    try {
      const success = await onTestConnection();
      setTestResult({
        success,
        message: success 
          ? 'Connected — credentials verified via AWS STS.' 
          : 'Connection failed. Run the setup command below and try again.',
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const setupCmd = profileName === 'default'
    ? 'aws sso login'
    : `aws sso login --profile ${profileName}`;

  const copyCmd = () => {
    navigator.clipboard.writeText(setupCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-1">Connect Your AWS Account</h3>
        <p className="text-sm text-slate-500">
          Credentials stay <span className="font-semibold text-slate-700">local</span> — never stored or transmitted to wolfir servers.
        </p>
      </div>

      {/* Why CLI Profile only */}
      <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
        <Shield className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-indigo-700 mb-0.5">Why no Access Keys?</p>
          <p className="text-xs text-indigo-600 leading-relaxed">
            Long-lived access keys are the #1 cause of AWS account compromise. wolfir requires a CLI profile — credentials come from your local <code className="bg-indigo-100 px-1 rounded font-mono">~/.aws/</code> config and auto-expire. For SSO users, run <code className="bg-indigo-100 px-1 rounded font-mono">aws sso login</code> first, then use the resulting profile here.
          </p>
        </div>
      </div>

      {/* Profile config */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">AWS CLI Profile</p>
            <p className="text-[11px] text-slate-500">From <code className="font-mono bg-slate-100 px-1 rounded">~/.aws/credentials</code> or SSO</p>
          </div>
        </div>

        {/* Profile input + test */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Profile Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="default"
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
            />
            <button
              onClick={handleTestConnection}
              disabled={testing || loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-sm transition-colors"
            >
              {testing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Test Connection</>
              )}
            </button>
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl flex items-center gap-3 ${
              testResult.success 
                ? 'bg-emerald-50 border border-emerald-200' 
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className={`text-xs font-medium ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
              {testResult.message}
            </span>
          </motion.div>
        )}

        {/* Quick Setup command */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Setup command</p>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <code className="text-sm text-indigo-900 font-mono flex-1">{setupCmd}</code>
            <button
              onClick={copyCmd}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors shrink-0 shadow-sm"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
            <Info className="w-3 h-3" /> After running, use the same profile name above and click Test Connection.
          </p>
        </div>
      </div>

      {/* Supported auth flows */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'AWS SSO / IAM Identity Center', sub: 'aws sso login → profile' },
          { label: 'IAM User Credentials', sub: 'aws configure → profile' },
          { label: 'EC2 Instance Role', sub: 'Auto-detected profile' },
        ].map(item => (
          <div key={item.label} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold text-slate-700 leading-snug">{item.label}</p>
            <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{item.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AWSAuthTab;
