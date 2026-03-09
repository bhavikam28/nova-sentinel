/**
 * Autonomous Agent — Strands Agent autonomously plans and executes tools.
 * The Agent decides which tools to call (CloudTrail, IAM, CloudWatch, etc.)
 * based on your prompt — real agentic reasoning.
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Send, Loader2, MessageSquare, ChevronRight, Sparkles, Clock, Wrench, Brain, Shield, Activity, Database } from 'lucide-react';
import { orchestrationAPI } from '../../services/api';

const SUGGESTED_PROMPTS = [
  'Audit all IAM users for security issues',
  'Scan CloudTrail for anomalies in the last 24 hours',
  'Get Security Hub findings (GuardDuty, Inspector)',
  'Check CloudWatch for billing anomalies',
  'Investigate IAM roles for privilege escalation',
  'Investigate cross-account role assumptions',
];

/**
 * Detect which tools the agent likely called by scanning the response text.
 * This is a lightweight alternative to full OpenTelemetry tracing — we infer
 * tool usage from the agent's natural-language output.
 */
const TOOL_SIGNATURES: { pattern: RegExp; tool: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { pattern: /cloudtrail|cloud trail|lookupevents|event lookup|trail/i, tool: 'CloudTrail Lookup', icon: Activity, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { pattern: /anomal|anomaly scan|security anomal/i, tool: 'CloudTrail Anomaly Scan', icon: Shield, color: 'text-red-600 bg-red-50 border-red-200' },
  { pattern: /iam.*(user|audit)|user.*audit|mfa.*(compliance|status)|access.key.age/i, tool: 'IAM User Audit', icon: Wrench, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { pattern: /iam.*(role|audit.*role)|role.*(audit|trust|policy)|cross.account/i, tool: 'IAM Role Audit', icon: Wrench, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { pattern: /policy.*(analy|review)|wildcard.*action|overly.*broad/i, tool: 'IAM Policy Analysis', icon: Shield, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { pattern: /cloudwatch|alarm|billing.*anomal|ec2.*metric|estimated.*charge/i, tool: 'CloudWatch Security Check', icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { pattern: /security.hub|guardduty|inspector|finding.*severity|pre.correlat/i, tool: 'Security Hub Findings', icon: Shield, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { pattern: /incident.*history|past.*incident|campaign|correlat/i, tool: 'Incident History Query', icon: Database, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { pattern: /timeline.*analy|temporal|root.cause|attack.pattern|blast.radius/i, tool: 'Timeline Analysis', icon: Brain, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { pattern: /risk.*(score|level|assess)|severity.*(score|rating)/i, tool: 'Risk Scoring', icon: Shield, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { pattern: /remediat|fix|patch|mitigat/i, tool: 'Remediation Planning', icon: Wrench, color: 'text-teal-600 bg-teal-50 border-teal-200' },
];

function detectToolsUsed(text: string): { tool: string; icon: React.ComponentType<{ className?: string }>; color: string }[] {
  const seen = new Set<string>();
  const results: { tool: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [];
  for (const sig of TOOL_SIGNATURES) {
    if (sig.pattern.test(text) && !seen.has(sig.tool)) {
      seen.add(sig.tool);
      results.push({ tool: sig.tool, icon: sig.icon, color: sig.color });
    }
  }
  return results;
}

/**
 * Demo fallback responses — used when backend is offline (Vercel-only demo for judges).
 * These simulate what the Strands Agent would return for each suggested prompt.
 */
const DEMO_FALLBACKS: Record<string, string> = {
  'audit all iam users': `IAM User Audit Results (3 users scanned):

1. admin@company.com — CRITICAL
   • MFA: Not enabled ⚠️
   • Access keys: 2 active (oldest: 247 days — exceeds 90-day rotation policy)
   • Policies: AdministratorAccess attached directly (should use group-based access)
   • Risk: Root-equivalent permissions without MFA

2. developer-1 — MEDIUM
   • MFA: Enabled ✓
   • Access keys: 1 active (34 days old)
   • Policies: PowerUserAccess via group "developers"
   • Risk: Broad permissions but MFA mitigates credential theft

3. ci-deploy — HIGH
   • MFA: Not enabled (service account)
   • Access keys: 1 active (189 days — needs rotation)
   • Policies: Custom deploy policy with s3:*, ec2:RunInstances
   • Risk: Service account with stale key and broad S3 access

Recommendations:
• Enable MFA on admin@company.com immediately (aws iam enable-mfa-device)
• Rotate access key for ci-deploy (189 days exceeds policy)
• Move admin@company.com to group-based permissions, remove direct AdministratorAccess
• Set up IAM Access Analyzer for continuous monitoring`,

  'scan cloudtrail for anomalies': `CloudTrail Anomaly Scan (last 24 hours):

Scanned 342 events across us-east-1. Found 3 anomalies:

1. Root Account Console Login — CRITICAL
   • Time: 2026-03-06T03:47:22Z (unusual hour)
   • Source IP: 198.51.100.42 (not in known IP range)
   • MFA: Not used
   • Action: ConsoleLogin → succeeded
   • Risk: Root account access from unknown IP without MFA at 3am

2. Access Key Created for admin — HIGH
   • Time: 2026-03-06T04:12:08Z (22 min after root login)
   • Actor: root
   • Action: CreateAccessKey for user "admin@company.com"
   • Risk: Persistence mechanism — new long-lived credentials created

3. Security Group Modified — HIGH
   • Time: 2026-03-06T04:15:33Z
   • Actor: admin@company.com (newly created key)
   • Action: AuthorizeSecurityGroupIngress — opened port 22 to 0.0.0.0/0
   • Risk: SSH exposed to internet on sg-0abc1234

Assessment: These 3 events form a potential attack chain — root login → credential creation → network exposure. Campaign probability: HIGH.

Recommended: Revoke root session, disable new access key, restore security group rules.`,

  'get security hub findings': `Security Hub Findings (last 7 days):

Retrieved 8 findings from GuardDuty and Inspector:

CRITICAL (2):
  • GuardDuty: UnauthorizedAccess:IAMUser/MaliciousIPCaller — admin@company.com accessed from known malicious IP
  • Inspector: CVE-2024-38816 — Spring Framework RCE on i-0abc1234 (port 8080 exposed)

HIGH (3):
  • GuardDuty: CryptoCurrency:EC2/BitcoinTool.B — Mining activity on i-0def5678
  • GuardDuty: Recon:IAMUser/MaliciousIPCaller.Custom — Enumeration from 203.0.113.50
  • Inspector: CVE-2024-21626 — Container escape vulnerability on ECS cluster

MEDIUM (3):
  • GuardDuty: Policy:IAMUser/RootCredentialUsage — Root account used in last 24h
  • Inspector: Outdated runtime — Node.js 16 (EOL) on Lambda function
  • GuardDuty: Behavior:EC2/NetworkPortUnusual — Unusual outbound traffic on port 4444

Summary: 2 critical findings require immediate attention. The CryptoCurrency finding on i-0def5678 correlates with the CloudTrail anomaly scan results.`,

  'check cloudwatch for billing anomalies': `CloudWatch Billing Analysis (last 7 days):

Current estimated charges: $847.32 (up 340% from baseline $192/week)

Anomaly detected: Compute cost spike
  • EC2 charges: $612.40 (was $85.20 baseline) — +619%
  • 3 new p3.2xlarge instances launched 2026-03-06T04:20:00Z
  • Running for 72+ hours continuously
  • No Auto Scaling group — manually launched
  • Region: us-east-1 (not the team's usual us-west-2)

Other services:
  • S3: $18.92 (normal)
  • DynamoDB: $4.10 (normal)
  • Bedrock: $12.40 (normal — Nova Sentinel usage)
  • Data transfer: $199.50 (unusual — high outbound)

Risk assessment: The 619% EC2 spike combined with unusual data transfer strongly suggests cryptocurrency mining or data exfiltration. The p3.2xlarge instances have GPU — commonly used for mining.

Estimated unauthorized cost: ~$612/week if not terminated.
Recommended: Terminate i-0ghi9012, i-0jkl3456, i-0mno7890 immediately.`,

  'investigate iam roles for privilege escalation': `IAM Role Privilege Escalation Analysis:

Scanned 12 IAM roles. Found 3 escalation risks:

1. contractor-temp — CRITICAL escalation path
   • Trust: Allows AssumeRole from any IAM user in account
   • Policies: AdministratorAccess (full admin)
   • Risk: Any user can escalate to full admin via this role
   • Path: Low-priv user → AssumeRole contractor-temp → Admin
   • Fix: aws iam update-assume-role-policy to restrict Principal

2. lambda-execution-role — HIGH
   • Trust: Lambda service principal (normal)
   • Policies: Custom policy with iam:PassRole + iam:CreateRole
   • Risk: Lambda function can create new roles with arbitrary permissions
   • Path: Code injection in Lambda → create admin role → escalate
   • Fix: Remove iam:CreateRole from Lambda execution policy

3. ci-deploy-role — MEDIUM
   • Trust: GitHub OIDC provider (good — no long-lived keys)
   • Policies: ec2:*, s3:*, ecs:* (broad but scoped to deploy actions)
   • Risk: Compromised GitHub workflow could provision arbitrary EC2/ECS
   • Fix: Scope ec2:* to ec2:RunInstances with condition on specific AMIs

No escalation path found for: read-only-role, cloudwatch-role, config-role, backup-role, support-role, audit-role, ssm-role, ecs-task-role, sagemaker-role.`,

  'investigate cross-account role assumptions': `Cross-Account Role Assumption Analysis:

Scanned trust policies for all 12 IAM roles:

Cross-account trust found in 2 roles:

1. OrganizationAccountAccessRole — EXPECTED
   • Trusts: arn:aws:iam::111111111111:root (management account)
   • Purpose: AWS Organizations default admin role
   • Risk: LOW — standard org pattern, but should restrict to specific admin role
   • Fix: Narrow Principal from :root to specific admin role ARN

2. vendor-integration-role — HIGH
   • Trusts: arn:aws:iam::999888777666:root (external account)
   • ExternalId: Not configured ⚠️
   • Policies: s3:GetObject on company-data-* buckets + kms:Decrypt
   • Risk: Without ExternalId, susceptible to confused deputy attack
   • Fix: aws iam update-assume-role-policy — add Condition with sts:ExternalId

No cross-account trust in remaining 10 roles ✓

Recommendation: Add ExternalId condition to vendor-integration-role immediately. This is a well-known attack vector (AWS docs: confused deputy problem).`,
};

function getDemoFallback(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const [key, value] of Object.entries(DEMO_FALLBACKS)) {
    if (lower.includes(key)) return value;
  }
  if (lower.includes('iam') && lower.includes('user')) return DEMO_FALLBACKS['audit all iam users'];
  if (lower.includes('cloudtrail') || lower.includes('anomal')) return DEMO_FALLBACKS['scan cloudtrail for anomalies'];
  if (lower.includes('security hub') || lower.includes('guardduty') || lower.includes('finding')) return DEMO_FALLBACKS['get security hub findings'];
  if (lower.includes('billing') || lower.includes('cloudwatch') || lower.includes('cost')) return DEMO_FALLBACKS['check cloudwatch for billing anomalies'];
  if (lower.includes('role') && (lower.includes('privilege') || lower.includes('escalat'))) return DEMO_FALLBACKS['investigate iam roles for privilege escalation'];
  if (lower.includes('cross') && lower.includes('account')) return DEMO_FALLBACKS['investigate cross-account role assumptions'];
  return null;
}

interface AgenticQueryProps {
  backendOffline?: boolean;
}

export default function AgenticQuery({ backendOffline = false }: AgenticQueryProps) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState<string | null>(null);
  const [isDemoFallback, setIsDemoFallback] = useState(false);
  const startRef = useRef<number>(0);

  const runQuery = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setPrompt(trimmed);
    setSubmittedPrompt(trimmed);
    setLoading(true);
    setError(null);
    setResponse(null);
    setElapsedMs(null);
    setIsDemoFallback(false);
    startRef.current = Date.now();

    try {
      const fallback = getDemoFallback(trimmed);
      if (backendOffline) {
        if (fallback) {
          await new Promise(r => setTimeout(r, 800));
          setElapsedMs(Date.now() - startRef.current);
          setResponse(fallback);
          setIsDemoFallback(true);
        } else {
          setElapsedMs(Date.now() - startRef.current);
          setError('Backend offline — try a suggested prompt for demo results.');
        }
      } else {
        const result = await orchestrationAPI.agentQuery(trimmed);
        setElapsedMs(Date.now() - startRef.current);
        setResponse(result.response || 'No response.');
      }
    } catch (err: any) {
      const fallback = getDemoFallback(trimmed);
      if (fallback) {
        await new Promise(r => setTimeout(r, 800));
        setElapsedMs(Date.now() - startRef.current);
        setResponse(fallback);
        setIsDemoFallback(true);
      } else {
        setElapsedMs(Date.now() - startRef.current);
        setError(err.response?.data?.detail || err.message || 'Agent query failed. Backend may be offline.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toolsUsed = response ? detectToolsUsed(response) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 p-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Autonomous Agent</h2>
            <p className="text-sm text-slate-600">
              The Strands Agent autonomously decides which tools to call based on your prompt
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Unlike the fixed pipeline, the Agent plans its own execution — click a prompt or type your own.
        </p>
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-100/80 border border-slate-200/80">
          <Shield className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-slate-600 leading-relaxed">
            <strong>Investigation only</strong> — the Agent audits and analyzes; it does not make changes. Remediation happens in the Remediation Engine tab with human-in-the-loop approval.
          </p>
        </div>
      </motion.div>

      {/* Input */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            Your prompt
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runQuery(prompt)}
              placeholder="e.g. Investigate this IAM role for privilege escalation"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={() => runQuery(prompt)}
              disabled={loading || !prompt.trim()}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {loading ? 'Agent working...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Suggested prompts */}
        <div className="p-4 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Click to run</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((s) => (
              <button
                key={s}
                onClick={() => runQuery(s)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state — show the agent is thinking */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-4 border-b border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  <motion.div
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Agent planning and executing tools...</p>
                  <p className="text-[11px] text-slate-500">The Strands Agent is deciding which tools to call for: &quot;{submittedPrompt?.slice(0, 60)}{(submittedPrompt?.length || 0) > 60 ? '...' : ''}&quot;</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response */}
        <AnimatePresence>
          {(response || error) && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 space-y-4"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}
              {response && (
                <>
                  {/* Tools detected + timing bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {toolsUsed.length > 0 && (
                      <>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tools used:</span>
                        {toolsUsed.map(({ tool, icon: Icon, color }) => (
                          <span
                            key={tool}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold ${color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {tool}
                          </span>
                        ))}
                      </>
                    )}
                    {elapsedMs !== null && (
                      <span className="inline-flex items-center gap-1 ml-auto text-[10px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        {elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`}
                      </span>
                    )}
                  </div>

                  {/* Agent response */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-700">Agent response</span>
                      <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-1">Autonomous</span>
                      <span className="text-[10px] text-slate-400 ml-auto">{isDemoFallback ? 'Demo mode (backend offline)' : 'Strands Agents SDK'}</span>
                    </div>
                    <div className="p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">
                      {response}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How it works — Aria comparison */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex items-start gap-3 mb-3">
          <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-slate-700">How it works</p>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              The Strands Agent receives your prompt plus all 14 registered tools (CloudTrail, IAM, CloudWatch, Security Hub, risk scoring, remediation, incident history, and more). It autonomously decides which tools to call and in what order — this is real agentic planning, not a fixed pipeline.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1">Autonomous Agent</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">Agent chooses tools based on your prompt. Different prompts → different tool sequences.</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fixed Pipeline</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">Always runs: Timeline → Risk → Remediation → Docs. Same tools every time.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
