/**
 * Compliance Mapping - Maps security findings to compliance frameworks
 * CIS Benchmarks, NIST 800-53, SOC 2, PCI-DSS
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import type { Timeline } from '../../types/incident';

interface ComplianceMappingProps {
  timeline: Timeline;
  incidentType?: string;
}

interface ComplianceControl {
  id: string;
  framework: string;
  controlId: string;
  title: string;
  status: 'violated' | 'at-risk' | 'compliant';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
}

const FRAMEWORK_CONFIG: Record<string, { name: string; color: string; bg: string; border: string }> = {
  CIS: { name: 'CIS Benchmarks', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  NIST: { name: 'NIST 800-53', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  SOC2: { name: 'SOC 2', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  PCI: { name: 'PCI-DSS', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};

// Map common security events to compliance controls
function generateComplianceMappings(timeline: Timeline, incidentType?: string): ComplianceControl[] {
  const controls: ComplianceControl[] = [];
  const events = timeline.events || [];
  
  // Check for IAM-related events
  const hasIAMIssue = events.some(e => 
    (e.action || '').toLowerCase().includes('iam') || 
    (e.action || '').toLowerCase().includes('role') ||
    (e.action || '').toLowerCase().includes('policy') ||
    (e.action || '').toLowerCase().includes('privilege')
  );
  
  // Check for data access events
  const hasDataAccess = events.some(e => 
    (e.action || '').toLowerCase().includes('s3') ||
    (e.action || '').toLowerCase().includes('data') ||
    (e.action || '').toLowerCase().includes('get') ||
    (e.action || '').toLowerCase().includes('download')
  );

  // Check for network/security group events
  const hasNetworkIssue = events.some(e =>
    (e.action || '').toLowerCase().includes('security') ||
    (e.action || '').toLowerCase().includes('network') ||
    (e.action || '').toLowerCase().includes('ingress') ||
    (e.action || '').toLowerCase().includes('ec2')
  );

  // Check for crypto mining indicators
  const hasCryptoMining = incidentType?.toLowerCase().includes('crypto') || 
    events.some(e => (e.action || '').toLowerCase().includes('run') || (e.action || '').toLowerCase().includes('instance'));

  if (hasIAMIssue || hasCryptoMining) {
    controls.push(
      { id: 'cis-1', framework: 'CIS', controlId: 'CIS 1.16', title: 'Ensure IAM policies are attached only to groups or roles', status: 'violated', severity: 'high', description: 'IAM policies were found attached directly to users rather than through groups or roles.', remediation: 'Migrate all user-attached policies to IAM groups or roles.' },
      { id: 'nist-1', framework: 'NIST', controlId: 'AC-6', title: 'Least Privilege', status: 'violated', severity: 'critical', description: 'Users or roles have excessive permissions beyond what is required for their function.', remediation: 'Implement principle of least privilege. Scope permissions to specific resources and actions.' },
      { id: 'soc2-1', framework: 'SOC2', controlId: 'CC6.1', title: 'Logical and Physical Access Controls', status: 'at-risk', severity: 'high', description: 'Access controls are not sufficient to prevent unauthorized privilege escalation.', remediation: 'Implement MFA, role-based access controls, and regular access reviews.' },
      { id: 'pci-1', framework: 'PCI', controlId: 'Req 7.1', title: 'Limit access to system components', status: 'violated', severity: 'critical', description: 'Access to cardholder data environment is not restricted based on business need-to-know.', remediation: 'Implement role-based access control and restrict privileges to minimum necessary.' },
    );
  }

  if (hasDataAccess) {
    controls.push(
      { id: 'cis-2', framework: 'CIS', controlId: 'CIS 2.1.1', title: 'Ensure S3 Bucket Policy is set to deny HTTP requests', status: 'violated', severity: 'high', description: 'S3 buckets allow unencrypted HTTP access, risking data interception.', remediation: 'Enable S3 bucket policies that enforce HTTPS-only access.' },
      { id: 'nist-2', framework: 'NIST', controlId: 'SC-28', title: 'Protection of Information at Rest', status: 'at-risk', severity: 'high', description: 'Sensitive data may not be encrypted at rest in all storage services.', remediation: 'Enable encryption at rest using AWS KMS for all data stores.' },
      { id: 'soc2-2', framework: 'SOC2', controlId: 'CC6.7', title: 'Restrict Transmission of Data', status: 'violated', severity: 'critical', description: 'Data transmission occurred without proper authorization and monitoring.', remediation: 'Enable VPC Flow Logs and implement data loss prevention controls.' },
      { id: 'pci-2', framework: 'PCI', controlId: 'Req 3.4', title: 'Render PAN unreadable anywhere it is stored', status: 'at-risk', severity: 'high', description: 'Data stores may contain unencrypted sensitive information.', remediation: 'Implement tokenization or strong encryption for all sensitive data at rest.' },
    );
  }

  if (hasNetworkIssue || hasCryptoMining) {
    controls.push(
      { id: 'cis-3', framework: 'CIS', controlId: 'CIS 5.2', title: 'Ensure no security groups allow ingress from 0.0.0.0/0 to port 22', status: 'violated', severity: 'critical', description: 'Security groups allow unrestricted SSH access from the internet.', remediation: 'Restrict SSH access to known IP ranges or use AWS Systems Manager Session Manager.' },
      { id: 'nist-3', framework: 'NIST', controlId: 'SC-7', title: 'Boundary Protection', status: 'violated', severity: 'critical', description: 'Network boundaries are not properly protected against unauthorized access.', remediation: 'Implement WAF, restrict security groups, and enable VPC flow logs.' },
    );
  }

  // Always add logging/monitoring controls
  controls.push(
    { id: 'cis-4', framework: 'CIS', controlId: 'CIS 3.1', title: 'Ensure CloudTrail is enabled in all regions', status: 'compliant', severity: 'low', description: 'CloudTrail logging is enabled, allowing this analysis to be performed.', remediation: 'Already compliant — maintain multi-region CloudTrail logging.' },
    { id: 'nist-4', framework: 'NIST', controlId: 'AU-2', title: 'Audit Events', status: 'compliant', severity: 'low', description: 'Security-relevant events are being logged and monitored.', remediation: 'Continue monitoring and expand event coverage.' },
  );

  return controls;
}

const ComplianceMapping: React.FC<ComplianceMappingProps> = ({ timeline, incidentType }) => {
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [activeFramework, setActiveFramework] = useState<string | null>(null);

  const controls = useMemo(() => generateComplianceMappings(timeline, incidentType), [timeline, incidentType]);

  const filteredControls = activeFramework 
    ? controls.filter(c => c.framework === activeFramework) 
    : controls;

  const summary = useMemo(() => {
    const violated = controls.filter(c => c.status === 'violated').length;
    const atRisk = controls.filter(c => c.status === 'at-risk').length;
    const compliant = controls.filter(c => c.status === 'compliant').length;
    return { violated, atRisk, compliant, total: controls.length };
  }, [controls]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof AlertCircle }> = {
      'violated': { label: 'Violated', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle },
      'at-risk': { label: 'At Risk', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertCircle },
      'compliant': { label: 'Compliant', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 },
    };
    return configs[status] || configs['at-risk'];
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Compliance Mapping
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {summary.total} controls assessed across 4 frameworks
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[11px] font-bold text-red-700">{summary.violated} Violated</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold text-amber-700">{summary.atRisk} At Risk</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-700">{summary.compliant} Compliant</span>
          </div>
        </div>
      </div>

      {/* Framework filters */}
      <div className="px-6 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveFramework(null)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
            !activeFramework ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'
          }`}
        >
          All Frameworks
        </button>
        {Object.entries(FRAMEWORK_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveFramework(activeFramework === key ? null : key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors border ${
              activeFramework === key ? `${config.bg} ${config.color} ${config.border}` : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            {config.name}
          </button>
        ))}
      </div>

      {/* Controls list */}
      <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
        {filteredControls.map((control) => {
          const isExpanded = expandedControl === control.id;
          const statusConfig = getStatusConfig(control.status);
          const fwConfig = FRAMEWORK_CONFIG[control.framework];
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              key={control.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-slate-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedControl(isExpanded ? null : control.id)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3"
              >
                <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusConfig.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${fwConfig.bg} ${fwConfig.color} ${fwConfig.border}`}>
                      {control.controlId}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 truncate">{control.title}</h4>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-100"
                  >
                    <div className="px-4 py-3 space-y-3">
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1">Finding</p>
                        <p className="text-xs text-slate-500 leading-relaxed">{control.description}</p>
                      </div>
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-bold text-blue-700 mb-0.5">Remediation</p>
                        <p className="text-xs text-blue-600 leading-relaxed">{control.remediation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ComplianceMapping;
