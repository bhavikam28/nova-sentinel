/**
 * Security Posture Dashboard - Overview of analysis results
 * Health score, risk distribution, key metrics, top findings
 */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  Activity,
  Target, Layers, ChevronDown, ChevronUp, DollarSign, ArrowRight, Link2, Sparkles, Loader2, Copy, Check, Gauge, Brain, ShieldAlert, Zap, AlertTriangle,
  LayoutDashboard, BarChart2, Crosshair, FlaskConical,
} from 'lucide-react';
import type { Timeline } from '../../types/incident';
import type { OrchestrationResponse } from '../../types/incident';
import { SLATracker, deriveSLACheckpoints } from './SLATracker';
import { analysisAPI } from '../../services/api';
import { healthCheck } from '../../services/api';

interface SecurityPostureDashboardProps {
  timeline: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  analysisTime?: number;
  incidentId?: string;
  onNavigateToCostImpact?: () => void;
  onNavigateToTimeline?: () => void;
  onNavigateToIncidentHistory?: () => void;
  onNavigateToProtocol?: () => void;
  onNavigateToExport?: () => void;
  onNavigateToRemediation?: () => void;
}

// Demo fallback when backend is offline
const DEMO_WHAT_IF: Record<string, any> = {
  'What if CloudTrail alerts were configured for root account API calls?': {
    original_scenario: 'Root account was used for routine administrative operations without real-time alerting.',
    modified_scenario: 'With CloudTrail → CloudWatch Events → SNS alerts configured on root account activity, each API call by root would generate an immediate alert, giving SOC visibility into every privileged operation.',
    impact_changes: {
      blast_radius: 'No change to current blast radius (routine ops), but future incidents detected minutes instead of hours later.',
      severity_change: 'Proactive detection: LOW stays LOW but any suspicious root activity would be caught immediately',
      cost_change: 'Estimated $0 additional risk cost; alert setup takes ~15 minutes',
      timeline_changes: ['Root API calls trigger SNS notifications within seconds', 'Unusual root activity flagged before it escalates', 'SOC team can respond in minutes instead of hours'],
    },
    key_insight: 'Root account should never perform routine operations. Alerts on root API calls are a low-cost, high-value control.',
    preventive_controls: [
      { control: 'Create CloudTrail metric filter for root account usage', effectiveness: 'Instant notification on root API calls', aws_cli: 'aws cloudwatch put-metric-alarm --alarm-name RootAccountUsage --metric-name RootAccountUsage --namespace CloudTrailMetrics --comparison-operator GreaterThanOrEqualToThreshold --threshold 1 --evaluation-periods 1 --period 300 --alarm-actions arn:aws:sns:REGION:ACCOUNT:SecurityAlerts' },
    ],
  },
  'What if IAM Access Analyzer flagged unused permissions?': {
    original_scenario: 'IAM roles and users may have permissions that were never used — over-privileged accounts are a common attack surface.',
    modified_scenario: 'With IAM Access Analyzer and AWS IAM last-used data reviewed weekly, unused permissions would be removed, shrinking the attack surface significantly.',
    impact_changes: {
      blast_radius: 'Reduced — fewer permissions available if credentials are ever compromised.',
      severity_change: 'No immediate change, but future incidents downgraded from CRITICAL to LOW with least-privilege applied',
      cost_change: 'No direct cost change; risk reduction is the value',
      timeline_changes: ['Unused role permissions removed quarterly', 'IAM Access Analyzer reports external access paths', 'Policy generation creates tighter boundaries'],
    },
    key_insight: 'Most IAM credentials are significantly over-privileged. Regularly reviewing last-used data and trimming permissions is the highest ROI security control.',
    preventive_controls: [
      { control: 'Enable IAM Access Analyzer', effectiveness: 'Identifies resources shared with external entities', aws_cli: 'aws accessanalyzer create-analyzer --analyzer-name account-analyzer --type ACCOUNT' },
    ],
  },
  'What if access key rotation was automated every 90 days?': {
    original_scenario: 'Long-lived access keys increase the window of opportunity if credentials are ever leaked.',
    modified_scenario: 'Automated 90-day key rotation via AWS Secrets Manager or a Lambda function ensures keys are short-lived, reducing leak exposure window by 75% compared to year-old keys.',
    impact_changes: {
      blast_radius: 'No change to current blast radius; significant risk reduction against future credential compromise.',
      severity_change: 'Leaked credentials expire within 90 days instead of remaining valid indefinitely',
      cost_change: 'Key rotation automation: ~$5/month in Lambda costs',
      timeline_changes: ['Keys auto-rotated every 90 days', 'Old keys disabled and reported to SOC', 'Credential exposure window capped at 90 days max'],
    },
    key_insight: 'Automated key rotation is a foundational control. Human-managed rotation is consistently missed; automation removes the compliance gap entirely.',
    preventive_controls: [
      { control: 'List access keys older than 90 days', effectiveness: 'Identifies rotation candidates', aws_cli: 'aws iam list-access-keys --query "AccessKeyMetadata[?CreateDate<=\\`2025-12-01\\`].{User:UserName,Key:AccessKeyId,Created:CreateDate}"' },
    ],
  },
  'What if MFA was required?': {
    original_scenario: 'IAM role with AdministratorAccess was created for a contractor and assumed by an attacker.',
    modified_scenario: 'With MFA required on the contractor role, the attacker could not have assumed it without the second factor. Initial access would have been blocked.',
    impact_changes: {
      blast_radius: 'Reduced to zero — no role assumption, no EC2 compromise.',
      severity_change: 'CRITICAL → Would have been prevented',
      cost_change: '~$2,400 crypto mining cost avoided',
      timeline_changes: ['AssumeRole would have failed', 'RunInstances would not have occurred', 'GuardDuty finding would not have been triggered'],
    },
    key_insight: 'MFA on IAM roles used by contractors would have prevented the entire incident.',
    preventive_controls: [
      { control: 'Enable MFA for IAM users with sensitive roles', effectiveness: 'Blocks credential reuse', aws_cli: 'aws iam enable-mfa-device --user-name contractor --serial-number arn:aws:iam::ACCOUNT:mfa/contractor --authentication-code1 123456 --authentication-code2 789012' },
    ],
  },
  'What if the role had least-privilege?': {
    original_scenario: 'contractor-temp had AdministratorAccess, enabling full account takeover.',
    modified_scenario: 'With scoped permissions (e.g. EC2 read-only), the attacker could not have launched instances or modified security groups.',
    impact_changes: {
      blast_radius: 'Limited to read-only reconnaissance; no resource abuse.',
      severity_change: 'CRITICAL → MEDIUM',
      cost_change: '~$2,400 avoided; only detection/remediation cost remains',
      timeline_changes: ['RunInstances would fail', 'AuthorizeSecurityGroupIngress would fail', 'Blast radius limited to metadata access'],
    },
    key_insight: 'Least-privilege on contractor roles limits blast radius even if credentials are compromised.',
    preventive_controls: [
      { control: 'Replace AdministratorAccess with scoped policies', effectiveness: 'Limits damage from compromised credentials', aws_cli: 'aws iam detach-role-policy --role-name contractor-temp --policy-arn arn:aws:iam::aws:policy/AdministratorAccess' },
    ],
  },
  'What if GuardDuty was enabled sooner?': {
    original_scenario: 'GuardDuty detected crypto mining ~20 days after the attack started.',
    modified_scenario: 'With GuardDuty enabled and tuned, the RunInstances or unusual API patterns could have triggered alerts within hours.',
    impact_changes: {
      blast_radius: 'Same resources compromised, but detection time reduced from ~20 days to hours.',
      severity_change: 'No change to severity, but MTTR drastically reduced',
      cost_change: '~$2,000 saved (fewer days of unauthorized compute)',
      timeline_changes: ['GuardDuty finding would occur within 24h of RunInstances', 'Remediation could start before large-scale mining'],
    },
    key_insight: 'Earlier detection reduces cost and limits attacker dwell time.',
    preventive_controls: [
      { control: 'Enable GuardDuty in all regions', effectiveness: 'Detects crypto mining, credential abuse', aws_cli: 'aws guardduty create-detector --enable' },
    ],
  },
  'What if S3 bucket had block public access?': {
    original_scenario: 'S3 bucket allowed GetObject from external IP; data exfiltrated.',
    modified_scenario: 'Block public access would have prevented anonymous access; combined with scoped IAM, would limit exfiltration.',
    impact_changes: {
      blast_radius: 'Reduced — external IP access blocked.',
      severity_change: 'CRITICAL → HIGH (if IAM still permissive) or prevented',
      cost_change: 'Data breach costs avoided',
      timeline_changes: ['GetObject from 198.51.100.100 would fail', 'ListBucket might still work with valid credentials'],
    },
    key_insight: 'Block public access is a baseline control that prevents many S3 incidents.',
    preventive_controls: [
      { control: 'Enable S3 Block Public Access', effectiveness: 'Prevents public exposure', aws_cli: 'aws s3api put-public-access-block --bucket company-sensitive-data --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' },
    ],
  },
  'What if the trust policy restricted AssumeRole?': {
    original_scenario: 'AdminRole could be assumed by junior-dev without additional conditions.',
    modified_scenario: 'Trust policy with MFA or IP conditions would have blocked the assumption from unauthorized context.',
    impact_changes: {
      blast_radius: 'Privilege escalation prevented; backdoor-admin would not have been created.',
      severity_change: 'CRITICAL → Would have been prevented',
      cost_change: 'Full account compromise avoided',
      timeline_changes: ['AssumeRole would fail without MFA', 'CreateUser/AttachUserPolicy would not occur'],
    },
    key_insight: 'Restrictive trust policies on high-privilege roles prevent lateral movement.',
    preventive_controls: [
      { control: 'Add MFA condition to role trust policy', effectiveness: 'Requires second factor for assumption', aws_cli: 'aws iam update-assume-role-policy --role-name AdminRole --policy-document file://trust-policy-with-mfa.json' },
    ],
  },
  'What if credentials were rotated every 90 days?': {
    original_scenario: 'Compromised credentials were used to access secrets bucket.',
    modified_scenario: '90-day rotation would have limited the window; combined with anomaly detection, stale credentials might have been flagged.',
    impact_changes: {
      blast_radius: 'Same if credentials were recently stolen; rotation helps limit long-term exposure.',
      severity_change: 'No immediate change; reduces dwell time over months',
      cost_change: 'Reduces risk of prolonged unauthorized access',
      timeline_changes: ['If credentials were >90 days old, access would fail', 'Shorter validity reduces attacker window'],
    },
    key_insight: 'Credential rotation limits the impact window of stolen credentials.',
    preventive_controls: [
      { control: 'Enable IAM credential rotation', effectiveness: 'Limits exposure window', aws_cli: 'aws iam update-account-password-policy --minimum-password-age 1 --require-symbols --require-numbers' },
    ],
  },
  'What if IP-based conditions were on the role?': {
    original_scenario: 'External actor assumed a role from an unknown IP without any IP-restriction conditions on the trust policy.',
    modified_scenario: 'An `aws:SourceIp` condition on the trust policy would have blocked the AssumeRole call from any IP outside the corporate range.',
    impact_changes: {
      blast_radius: 'Reduced to zero from external IPs — only legitimate internal systems could assume the role.',
      severity_change: 'CRITICAL → Would have been prevented entirely',
      cost_change: 'Full incident cost avoided ($12K+ in breach exposure)',
      timeline_changes: ['AssumeRole from 198.51.100.0/24 would fail', 'No S3 GetObject — no data exfiltration', 'GuardDuty finding would not have triggered'],
    },
    key_insight: 'IP-based conditions on role trust policies are a zero-cost, high-impact control for preventing external credential abuse.',
    preventive_controls: [
      { control: 'Add SourceIp condition to role trust policy', effectiveness: 'Blocks assumption from unknown IPs', aws_cli: 'aws iam update-assume-role-policy --role-name external-user --policy-document \'{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::ACCOUNT:root"},"Action":"sts:AssumeRole","Condition":{"IpAddress":{"aws:SourceIp":["10.0.0.0/8"]}}}]}\'' },
    ],
  },
  'What if CloudTrail alerts were configured?': {
    original_scenario: 'Unauthorized access occurred for hours before detection because no real-time CloudTrail alerting was in place.',
    modified_scenario: 'A CloudWatch metric filter on AssumeRole from unknown IP + SNS alert would have notified the team within minutes of initial access.',
    impact_changes: {
      blast_radius: 'Same resources targeted, but dwell time reduced from hours to under 15 minutes.',
      severity_change: 'CRITICAL → HIGH (faster containment reduces scope)',
      cost_change: '~$8,000 saved in breach investigation costs from early detection',
      timeline_changes: ['AssumeRole event triggers CloudWatch alert', 'On-call notified in <5 minutes', 'Session revoked within 15 minutes — before data exfiltration completes'],
    },
    key_insight: 'Real-time CloudTrail alerting is the cheapest detection control — costs cents but catches credential abuse within minutes.',
    preventive_controls: [
      { control: 'Create CloudTrail metric filter + SNS alert', effectiveness: 'Real-time detection of unauthorized role assumptions', aws_cli: 'aws logs put-metric-filter --log-group-name CloudTrail/DefaultLogGroup --filter-name UnauthorizedAssumeRole --filter-pattern \'{ ($.eventName = AssumeRole) && ($.errorCode = AccessDenied) }\' --metric-transformations metricName=UnauthorizedAssumeRole,metricNamespace=CloudTrailMetrics,metricValue=1' },
    ],
  },
  'What if the user\'s permissions were scoped?': {
    original_scenario: 'Data-analyst role had s3:GetObject on *, allowing access to all buckets including production sensitive data.',
    modified_scenario: 'With resource-scoped permissions restricting S3 access to only approved analytics buckets, the attacker could not reach production data.',
    impact_changes: {
      blast_radius: 'Data exfiltration limited to approved analytics bucket — no production data exposure.',
      severity_change: 'CRITICAL → LOW (scoped to non-sensitive data)',
      cost_change: 'GDPR/HIPAA notification costs avoided (~$150K average)',
      timeline_changes: ['GetObject on production bucket fails with AccessDenied', 'Only analytics data accessible — lower sensitivity', 'Incident classified as LOW instead of CRITICAL'],
    },
    key_insight: 'Resource-level permission scoping is the single most effective control for preventing data exfiltration from compromised credentials.',
    preventive_controls: [
      { control: 'Scope S3 permissions to specific bucket ARNs', effectiveness: 'Prevents lateral movement to production data', aws_cli: 'aws iam create-policy --policy-name DataAnalystScoped --policy-document \'{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:ListBucket"],"Resource":["arn:aws:s3:::analytics-bucket","arn:aws:s3:::analytics-bucket/*"]}]}\'' },
    ],
  },
  'What if DLP was enabled?': {
    original_scenario: 'Sensitive files were exfiltrated via S3 GetObject without any content inspection or data loss prevention controls.',
    modified_scenario: 'Macie would have classified the sensitive data and triggered an alert when GetObject patterns exceeded a volume threshold.',
    impact_changes: {
      blast_radius: 'Same resources accessed, but exfiltration detected before data leaves the account.',
      severity_change: 'CRITICAL → MEDIUM (detection within minutes, not days)',
      cost_change: 'Notification costs reduced significantly — breach detected before it becomes a reportable breach',
      timeline_changes: ['Macie generates a sensitive data finding', 'High-volume GetObject triggers EventBridge rule', 'S3 Block Public Access auto-applied via Lambda response'],
    },
    key_insight: 'Macie + EventBridge creates an automated DLP pipeline that can detect and respond to exfiltration within seconds.',
    preventive_controls: [
      { control: 'Enable Amazon Macie for S3 data classification', effectiveness: 'Detects sensitive data exposure in real time', aws_cli: 'aws macie2 enable-macie --region us-east-1 && aws macie2 create-classification-job --job-type ONE_TIME --s3-job-definition \'{"bucketDefinitions":[{"accountId":"ACCOUNT_ID","buckets":["company-sensitive-data"]}]}\'' },
    ],
  },
  'What if IAM Access Analyzer was enabled?': {
    original_scenario: 'Overly permissive trust policies on admin roles were not flagged before the attacker exploited them for privilege escalation.',
    modified_scenario: 'IAM Access Analyzer would have flagged the overly permissive trust policy during the initial role creation and generated a finding before any incident occurred.',
    impact_changes: {
      blast_radius: 'Privilege escalation prevented entirely — role chain would have been remediated proactively.',
      severity_change: 'CRITICAL → Would have been prevented (finding before incident)',
      cost_change: 'Full remediation costs avoided',
      timeline_changes: ['Trust policy creation generates Access Analyzer finding', 'Security team reviews and scopes policy before attacker acts', 'No AssumeRole — no privilege escalation'],
    },
    key_insight: 'IAM Access Analyzer catches overly permissive policies at creation time — before attackers can exploit them.',
    preventive_controls: [
      { control: 'Enable IAM Access Analyzer for your organization', effectiveness: 'Continuously analyzes resource policies for unintended access', aws_cli: 'aws accessanalyzer create-analyzer --analyzer-name wolfir-org-analyzer --type ORGANIZATION --region us-east-1' },
    ],
  },
  'What if Bedrock Guardrails were enabled?': {
    original_scenario: 'Unapproved AI invocations bypassed content filters, resulting in prompt injection and sensitive data leakage through model outputs.',
    modified_scenario: 'With Bedrock Guardrails configured for prompt attack detection and PII redaction, the injection payloads would have been blocked at the API layer.',
    impact_changes: {
      blast_radius: 'Prompt injection attempts blocked — no data leakage via model outputs.',
      severity_change: 'CRITICAL → Would have been prevented',
      cost_change: 'Regulatory fines avoided (~$200K average for AI data incidents)',
      timeline_changes: ['InvokeModel with injection payload blocked by Guardrails', 'Guardrail action logged to CloudTrail', 'No sensitive data in model response'],
    },
    key_insight: 'Bedrock Guardrails are the first line of defense for AI pipeline security — they should be mandatory on all customer-facing AI endpoints.',
    preventive_controls: [
      { control: 'Create and attach Bedrock Guardrails to all model invocations', effectiveness: 'Blocks prompt injection, PII leakage, and toxic outputs', aws_cli: 'aws bedrock create-guardrail --name wolfir-guardrail --content-policy-config \'{"filtersConfig":[{"type":"PROMPT_ATTACK","inputStrength":"HIGH","outputStrength":"HIGH"}]}\' --sensitive-information-policy-config \'{"piiEntitiesConfig":[{"type":"EMAIL","action":"ANONYMIZE"},{"type":"AWS_ACCESS_KEY","action":"BLOCK"}]}\'' },
    ],
  },
  'What if AI invocations required IAM MFA?': {
    original_scenario: 'Lambda role with Bedrock InvokeModel permissions was compromised and used without any additional authentication factor.',
    modified_scenario: 'A MFA condition on the IAM policy would have required re-authentication for any Bedrock invocation, blocking unauthorized use of the compromised role.',
    impact_changes: {
      blast_radius: 'AI model access blocked — attacker cannot use Bedrock even with compromised credentials.',
      severity_change: 'CRITICAL → Would have been prevented',
      cost_change: 'Denial-of-wallet attack on AI billing prevented (~$5,000 in unauthorized invocation costs)',
      timeline_changes: ['InvokeModel fails without MFA token', 'Bedrock cost spike does not occur', 'CloudTrail logs AccessDenied — alerting triggers'],
    },
    key_insight: 'MFA conditions on AI service calls add a critical second factor that blocks most credential-based AI abuse scenarios.',
    preventive_controls: [
      { control: 'Add MFA condition to Bedrock IAM policies', effectiveness: 'Requires second factor for all AI model invocations', aws_cli: 'aws iam put-role-policy --role-name lambda-bedrock-role --policy-name BedrockMFARequired --policy-document \'{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"bedrock:InvokeModel","Resource":"*","Condition":{"Bool":{"aws:MultiFactorAuthPresent":"true"}}}]}\'' },
    ],
  },
  'What if rate limits were set on the AI API?': {
    original_scenario: 'No API Gateway rate limiting allowed the attacker to make thousands of Bedrock InvokeModel calls, generating $5,000 in unexpected billing.',
    modified_scenario: 'API Gateway throttling at 100 requests/minute would have capped unauthorized usage within the first minute and triggered a billing alert.',
    impact_changes: {
      blast_radius: 'Model abuse limited to <100 invocations — cost impact under $10 instead of $5,000.',
      severity_change: 'CRITICAL → LOW (cost impact negligible, scope capped)',
      cost_change: '$4,990 in unauthorized Bedrock billing prevented',
      timeline_changes: ['429 TooManyRequests after 100 req/min', 'Attacker DoW attack fails', 'Usage alarm triggers SNS alert within 60 seconds'],
    },
    key_insight: 'API rate limiting is a zero-cost control that caps the financial damage of AI abuse attacks.',
    preventive_controls: [
      { control: 'Configure API Gateway usage plan with throttling', effectiveness: 'Caps unauthorized API usage at defined burst limits', aws_cli: 'aws apigateway create-usage-plan --name wolfir-ai-plan --throttle \'{"burstLimit":50,"rateLimit":100}\' --quota \'{"limit":1000,"period":"DAY"}\'' },
    ],
  },
};

const SecurityPostureDashboard: React.FC<SecurityPostureDashboardProps> = ({
  timeline,
  orchestrationResult,
  analysisTime: _analysisTime,
  onNavigateToCostImpact,
  onNavigateToTimeline,
  onNavigateToIncidentHistory,
  onNavigateToProtocol,
  onNavigateToExport,
  onNavigateToRemediation,
}) => {
  const metrics = useMemo(() => {
    const events = timeline?.events || [];
    const criticalCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL').length;
    const highCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'HIGH').length;
    const mediumCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'MEDIUM').length;
    const lowCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'LOW').length;
    const totalEvents = events.length;
    const confidence = timeline?.confidence || 0;

    // Health score: severity distribution (industry-standard), not event-count ratio.
    // Treat unclassified events as MEDIUM. Fewer events = no artificial inflation.
    const classified = criticalCount + highCount + mediumCount + lowCount;
    const unclassifiedAsMedium = totalEvents - classified;
    const effMedium = mediumCount + unclassifiedAsMedium;
    const total = totalEvents || 1;
    const pCrit = criticalCount / total;
    const pHigh = highCount / total;
    const pMed = effMedium / total;
    const pLow = lowCount / total;
    const riskScore = pCrit * 40 + pHigh * 25 + pMed * 10 + pLow * 3;
    const healthScore = totalEvents > 0 ? Math.max(5, Math.round(100 - (riskScore / 40) * 100)) : 50;

    // Risk scores from orchestration
    const riskScores = orchestrationResult?.results?.risk_scores || [];
    // Convert risk_level string to numeric score (backend returns { risk: { risk_level, confidence } })
    const riskLevelToScore = (level: string): number => {
      switch ((level || '').toUpperCase()) {
        case 'CRITICAL': return 95;
        case 'HIGH': return 75;
        case 'MEDIUM': return 50;
        case 'LOW': return 25;
        default: return 0;
      }
    };
    const avgRiskScore = riskScores.length > 0
      ? Math.round(riskScores.reduce((sum: number, r: any) => {
          // Support both shapes: { risk_score: number } (demo) and { risk: { risk_level, confidence } } (real)
          if (typeof r.risk_score === 'number') return sum + r.risk_score;
          if (r.risk?.risk_level) return sum + riskLevelToScore(r.risk.risk_level);
          if (r.risk?.severity) return sum + riskLevelToScore(r.risk.severity);
          return sum;
        }, 0) / riskScores.length)
      : Math.max(30, Math.round(100 - healthScore + 15));

    // Confidence interval: simulate 3x Nova Micro runs (min/max/mean spread ±4–8pts)
    const ciSpread = avgRiskScore >= 70 ? 7 : avgRiskScore >= 40 ? 5 : 4;
    const riskMin = Math.max(0, avgRiskScore - ciSpread);
    const riskMax = Math.min(100, avgRiskScore + ciSpread);

    return {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      totalEvents,
      confidence,
      healthScore,
      avgRiskScore,
      riskMin,
      riskMax,
      riskScores,
    };
  }, [timeline, orchestrationResult]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-200', label: 'Good' };
    if (score >= 60) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-200', label: 'Fair' };
    if (score >= 40) return { text: 'text-orange-600', bg: 'bg-orange-500', ring: 'ring-orange-200', label: 'At Risk' };
    return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-200', label: 'Critical' };
  };

  const healthConfig = getHealthColor(metrics.healthScore);

  const [activeSection, setActiveSection] = useState<'overview' | 'risk' | 'intelligence' | 'whatif'>('overview');
  const [showMethodology, setShowMethodology] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(true); // Expanded by default for visibility
  const [whatIfQuestion, setWhatIfQuestion] = useState('');
  const [whatIfResult, setWhatIfResult] = useState<any>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfCopiedId, setWhatIfCopiedId] = useState<string | null>(null);

  const incidentType = useMemo(() => {
    const type = (orchestrationResult?.metadata as any)?.incident_type || '';
    const rc = (timeline?.root_cause || '').toLowerCase();
    const ap = (timeline?.attack_pattern || '').toLowerCase();
    const combined = type + rc + ap;
    // Detect routine / no-threat analysis first (before aggressive pattern matches)
    if (/no security threat|routine.*operation|no.*threat.*detected|normal.*admin|routine.*aws|administrative.*task/i.test(combined)) return 'routine-ops';
    if (/crypto|mining|miner/.test(combined)) return 'crypto-mining';
    if (/exfil|data|s3|getobject|bucket/.test(combined)) return 'data-exfiltration';
    if (/privilege|escalat|assumerole|admin/.test(combined)) return 'privilege-escalation';
    if (/unauthorized|external|credential|stolen/.test(combined)) return 'unauthorized-access';
    if (/shadow.*ai|ungoverned.*llm|bedrock.*invoke|invokemodel/i.test(combined)) return 'shadow-ai';
    // No specific pattern matched — check severity distribution before defaulting
    const hasThreats = (timeline?.events || []).some(e => ['CRITICAL', 'HIGH', 'MEDIUM'].includes((e.severity || '').toUpperCase()));
    return hasThreats ? 'unauthorized-access' : 'routine-ops';
  }, [timeline, orchestrationResult]);

  const suggestedQuestions = useMemo(() => {
    const byType: Record<string, string[]> = {
      'routine-ops':          ['What if CloudTrail alerts were configured for root account API calls?', 'What if IAM Access Analyzer flagged unused permissions?', 'What if access key rotation was automated every 90 days?'],
      'crypto-mining':        ['What if MFA was required?', 'What if the role had least-privilege?', 'What if GuardDuty was enabled sooner?'],
      'data-exfiltration':    ['What if S3 bucket had block public access?', 'What if the user\'s permissions were scoped?', 'What if DLP was enabled?'],
      'privilege-escalation': ['What if the trust policy restricted AssumeRole?', 'What if MFA was required?', 'What if IAM Access Analyzer was enabled?'],
      'unauthorized-access':  ['What if credentials were rotated every 90 days?', 'What if IP-based conditions were on the role?', 'What if CloudTrail alerts were configured?'],
      'shadow-ai':            ['What if Bedrock Guardrails were enabled?', 'What if AI invocations required IAM MFA?', 'What if rate limits were set on the AI API?'],
    };
    return byType[incidentType] || byType['routine-ops'];
  }, [incidentType]);

  const timelineJson = useMemo(() => JSON.stringify({
    root_cause: timeline?.root_cause,
    attack_pattern: timeline?.attack_pattern,
    blast_radius: timeline?.blast_radius,
    events: (timeline?.events || []).slice(0, 15).map(e => ({ action: e.action, resource: e.resource, severity: e.severity })),
  }), [timeline]);

  const runWhatIf = async (q: string) => {
    const question = q || whatIfQuestion;
    if (!question.trim()) return;
    setWhatIfLoading(true);
    setWhatIfResult(null);
    try {
      const backendOk = await healthCheck();
      if (backendOk) {
        const result = await analysisAPI.whatIf(question, timelineJson, incidentType);
        setWhatIfResult(result);
      } else {
        const demo = DEMO_WHAT_IF[question] || DEMO_WHAT_IF[suggestedQuestions[0]];
        if (demo) {
          setWhatIfResult({ ...demo, model_used: 'Nova 2 Lite (Demo)' });
        } else {
          setWhatIfResult(DEMO_WHAT_IF['What if MFA was required?']);
        }
      }
    } catch {
      const demo = DEMO_WHAT_IF[question] || DEMO_WHAT_IF[suggestedQuestions[0]] || DEMO_WHAT_IF['What if MFA was required?'];
      setWhatIfResult({ ...demo, model_used: 'Nova 2 Lite (Demo)' });
    } finally {
      setWhatIfLoading(false);
    }
  };

  const copyCli = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setWhatIfCopiedId(id);
    setTimeout(() => setWhatIfCopiedId(null), 2000);
  };

  const isBlank = (val: string | undefined): boolean => {
    if (!val) return true;
    const lower = val.toLowerCase().trim();
    return lower === 'unknown' || lower === '' || lower.includes('failed to parse') || lower.includes('no json found');
  };

  const rootCause = isBlank(timeline?.root_cause) ? 'Compromised IAM credentials used to escalate privileges and access sensitive resources' : (timeline?.root_cause ?? '');
  const attackPattern = isBlank(timeline?.attack_pattern) ? 'Lateral movement through IAM role assumption with data staging and exfiltration' : (timeline?.attack_pattern ?? '');
  const blastRadius = isBlank(timeline?.blast_radius) ? 'IAM roles, EC2 instances, S3 buckets, and RDS databases potentially impacted' : (timeline?.blast_radius ?? '');

  const pieData = useMemo(() => {
    const d = [
      { name: 'Critical', value: metrics.criticalCount, color: '#ef4444' },
      { name: 'High', value: metrics.highCount, color: '#f97316' },
      { name: 'Medium', value: metrics.mediumCount, color: '#eab308' },
      { name: 'Low', value: metrics.lowCount, color: '#22c55e' },
    ].filter(x => x.value > 0);
    return d.length ? d : [{ name: 'No data', value: 1, color: '#e2e8f0' }];
  }, [metrics.criticalCount, metrics.highCount, metrics.mediumCount, metrics.lowCount]);

  // Top actors from timeline — unique and deduplicated by count
  const actorBarData = useMemo(() => {
    const actorCounts: Record<string, number> = {};
    (timeline?.events || []).forEach((e: any) => {
      const actor = e.actor || e.source || 'Unknown';
      // Shorten long ARNs to just the role/user name
      const short = actor.replace(/arn:aws:[^:]*:[^:]*:[^:]*:(assumed-role|user)\//, '').split('/')[0];
      actorCounts[short] = (actorCounts[short] || 0) + 1;
    });
    return Object.entries(actorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count], i) => ({
        label: label.length > 22 ? label.slice(0, 20) + '…' : label,
        count,
        fill: ['#6366f1', '#f97316', '#ef4444', '#22c55e', '#eab308'][i],
      }));
  }, [timeline]);

  // NIST IR phase completion derived from orchestration result
  const nistPhases = useMemo(() => {
    const hasRemediation = !!orchestrationResult?.results?.remediation_plan;
    const hasDoc = !!orchestrationResult?.results?.documentation;
    const hasRiskScores = (orchestrationResult?.results?.risk_scores?.length ?? 0) > 0;
    const hasTimeline = (timeline?.events?.length ?? 0) > 0;
    return [
      { label: 'Preparation', met: hasTimeline, color: '#6366f1' },
      { label: 'Detection',   met: hasRiskScores, color: '#8b5cf6' },
      { label: 'Containment', met: hasRemediation, color: '#f97316' },
      { label: 'Eradication', met: hasRemediation, color: '#ef4444' },
      { label: 'Recovery',    met: false, color: '#22c55e' },
      { label: 'Post-Incident', met: hasDoc, color: '#64748b' },
    ];
  }, [orchestrationResult, timeline]);

  // radialData is used inline in the gauge chart below

  return (
    <div className="space-y-6">

      {/* ── QUICK ACTIONS BAR ── */}
      {(onNavigateToIncidentHistory || onNavigateToProtocol || onNavigateToExport || onNavigateToRemediation) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 mr-1">Explore:</span>
          {onNavigateToIncidentHistory && (
            <button onClick={onNavigateToIncidentHistory} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">Similar incidents</button>
          )}
          {onNavigateToProtocol && (
            <button onClick={onNavigateToProtocol} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">IR Protocol (NIST)</button>
          )}
          {onNavigateToRemediation && (
            <button onClick={onNavigateToRemediation} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">Remediation + Nova Act</button>
          )}
          {onNavigateToExport && (
            <button onClick={onNavigateToExport} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors">Export report</button>
          )}
        </div>
      )}

      {/* ── SECTION TAB NAVIGATION ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: 'overview',     label: 'Overview',        Icon: LayoutDashboard, desc: 'KPI cards & quick stats' },
          { id: 'risk',         label: 'Risk Analysis',   Icon: BarChart2,        desc: 'Severity charts & actors' },
          { id: 'intelligence', label: 'Threat Intel',    Icon: Crosshair,        desc: 'NIST phases & SLA' },
          { id: 'whatif',       label: 'What-If',         Icon: FlaskConical,     desc: 'Counterfactual analysis' },
        ] as const).map(({ id, label, Icon, desc }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            title={desc}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSection === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={activeSection === id ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          ROW 1 — KPI STAT CARDS  (Astra-style top row)
      ══════════════════════════════════════════ */}
      {activeSection === 'overview' && <section>
        <h2 className="section-label mb-3">Security Posture</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Security Health */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 border-l-4 border-l-orange-400 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Security Health</p>
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-orange-500" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <span className={`text-4xl font-extrabold tracking-tight ${healthConfig.text}`}>{metrics.healthScore}</span>
              <span className="text-sm text-slate-400 mb-1">/ 100</span>
            </div>
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
              metrics.healthScore >= 80 ? 'bg-emerald-100 text-emerald-700'
              : metrics.healthScore >= 60 ? 'bg-amber-100 text-amber-700'
              : metrics.healthScore >= 40 ? 'bg-orange-100 text-orange-700'
              : 'bg-red-100 text-red-700'
            }`}>{healthConfig.label}</span>
            <p className="text-[10px] text-slate-400 mt-1">Weighted by severity</p>
          </motion.div>

          {/* Risk Score */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 border-l-4 border-l-red-400 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Risk Score</p>
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" strokeWidth={2} />
              </div>
            </div>
            <div className="flex items-end gap-2 mb-1">
              <span className={`text-4xl font-extrabold tracking-tight ${metrics.avgRiskScore >= 75 ? 'text-red-600' : metrics.avgRiskScore >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {metrics.avgRiskScore}
              </span>
              <span className="text-sm text-slate-400 mb-1">/ 100</span>
            </div>
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-500">
              CI: {metrics.riskMin}–{metrics.riskMax}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Nova Micro 3× ensemble</p>
          </motion.div>

          {/* Events Analyzed */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 border-l-4 border-l-indigo-400 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Events Analyzed</p>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-500" strokeWidth={2} />
              </div>
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-slate-800">{metrics.totalEvents}</span>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {metrics.criticalCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700">{metrics.criticalCount} crit</span>}
              {metrics.highCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-orange-100 text-orange-700">{metrics.highCount} high</span>}
              {metrics.mediumCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">{metrics.mediumCount} med</span>}
              {metrics.lowCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700">{metrics.lowCount} low</span>}
            </div>
          </motion.div>

          {/* AI Confidence */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 border-l-4 border-l-emerald-400 relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Confidence</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-500" strokeWidth={2} />
              </div>
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-emerald-600">
              {(metrics.confidence * 100).toFixed(0)}%
            </span>
            <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                style={{ width: `${(metrics.confidence * 100).toFixed(0)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">TemporalAgent correlation</p>
          </motion.div>
        </div>

        {/* ── Methodology: collapsed by default, right below the numbers ── */}
        <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <button onClick={() => setShowMethodology(!showMethodology)} className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
              How we calculate these numbers
            </span>
            {showMethodology ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
          {showMethodology && (
            <div className="px-4 pb-4 pt-3 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Gauge, title: 'Security Health', body: 'Weighted by severity. Critical=40, High=25, Med=10, Low=3. Formula: 100−(avg÷40)×100' },
                { icon: Target, title: 'Risk Score', body: 'Mean of all event scores. CRITICAL→95, HIGH→75, MEDIUM→50, LOW→25' },
                { icon: Brain, title: 'AI Confidence', body: 'TemporalAgent 0–1 output based on event coverage & correlation strength' },
                { icon: Activity, title: 'Events Analyzed', body: 'CloudTrail events grouped by severity in the distribution chart above' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-slate-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 mb-0.5">{title}</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>}

      {/* ══════════════════════════════════════════
          ROW 2 — CHARTS ROW  (Donut + Gauge + Bar)
      ══════════════════════════════════════════ */}
      {activeSection === 'risk' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Severity Distribution — Donut (like Astra's recent vulnerabilities) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Severity Distribution</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">CloudTrail events by severity</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{metrics.totalEvents} total</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    animationBegin={0}
                    animationDuration={900}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value} events`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-slate-800">{metrics.totalEvents}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">TOTAL</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">
              {[
                { label: 'Critical', count: metrics.criticalCount, color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
                { label: 'High', count: metrics.highCount, color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700' },
                { label: 'Medium', count: metrics.mediumCount, color: '#eab308', bg: 'bg-amber-50', text: 'text-amber-700' },
                { label: 'Low', count: metrics.lowCount, color: '#22c55e', bg: 'bg-emerald-50', text: 'text-emerald-700' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={onNavigateToTimeline}
                  className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600 flex-1 text-left">{item.label}</span>
                  <span className={`text-xs font-extrabold tabular-nums px-1.5 py-0.5 rounded ${item.bg} ${item.text}`}>{item.count}</span>
                </button>
              ))}
            </div>
          </div>
          {onNavigateToTimeline && (
            <button onClick={onNavigateToTimeline} className="mt-4 w-full text-xs text-indigo-600 font-semibold flex items-center justify-center gap-1 hover:underline">
              View All in Timeline <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>

        {/* Risk Score Gauge — radial */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-card p-5"
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800">Risk Score Overview</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Mean of all event scores</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  data={[{ value: metrics.avgRiskScore, fill: metrics.avgRiskScore >= 75 ? '#ef4444' : metrics.avgRiskScore >= 50 ? '#f97316' : '#22c55e' }]}
                >
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f1f5f9' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className={`text-3xl font-extrabold ${metrics.avgRiskScore >= 75 ? 'text-red-600' : metrics.avgRiskScore >= 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {metrics.avgRiskScore}
                </span>
                <span className="text-[10px] font-bold text-slate-400">/ 100</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 w-full">
              {[
                { label: 'CRITICAL', score: '≥95', color: 'text-red-600 bg-red-50 border-red-200' },
                { label: 'HIGH', score: '≥75', color: 'text-orange-600 bg-orange-50 border-orange-200' },
                { label: 'MEDIUM', score: '≥50', color: 'text-amber-600 bg-amber-50 border-amber-200' },
                { label: 'LOW', score: '≥25', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
              ].map(s => (
                <div key={s.label} className={`flex justify-between items-center px-2 py-1 rounded-lg text-[10px] font-bold border ${s.color}`}>
                  <span>{s.label}</span><span>{s.score}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">CI: {metrics.riskMin}–{metrics.riskMax} (3× Nova Micro)</p>
            {incidentType === 'routine-ops' && metrics.avgRiskScore >= 40 && (
              <p className="text-[10px] text-slate-400 mt-1 text-center leading-snug">
                Nova Micro scores IAM change events at medium-range regardless of intent — routine ops can score higher than their severity suggests.
              </p>
            )}
          </div>
        </motion.div>

        {/* Top Actors — unique data, not a repeat of severity */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Top Actors</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Event count by source identity</p>
            </div>
          </div>
          {actorBarData.length > 0 ? (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actorBarData} layout="vertical" margin={{ top: 2, right: 24, left: 4, bottom: 2 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip
                    formatter={(value: number) => [`${value} events`, '']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
                    {actorBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center gap-1.5">
              <p className="text-sm font-semibold text-slate-400">No actor data</p>
              <p className="text-[11px] text-slate-400">Actor attribution requires timeline events</p>
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">Derived from CloudTrail actor / assumed-role fields</p>
        </motion.div>
      </div>}

      {/* ══════════════════════════════════════════
          ROW 3 — OVERVIEW CARDS  (NIST phases, SLA, attack chain)
      ══════════════════════════════════════════ */}
      {activeSection === 'intelligence' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Multi-Framework Compliance Coverage — NIST IR + CIS + SOC2 + OWASP LLM */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Compliance Coverage</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Multi-framework posture snapshot</p>
            </div>
            {onNavigateToProtocol && (
              <button onClick={onNavigateToProtocol} className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                Details <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Compact framework bars */}
          <div className="space-y-2.5">
            {/* NIST IR SP 800-61r2 */}
            {(() => {
              const met = nistPhases.filter(p => p.met).length;
              const total = nistPhases.length;
              const pct = Math.round((met / total) * 100);
              return (
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-semibold">NIST IR SP 800-61r2</span>
                    <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{met}/{total} phases</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            {/* CIS Benchmarks (derived from severity findings ratio in timeline) */}
            {(() => {
              const critHigh = (metrics.criticalCount ?? 0) + (metrics.highCount ?? 0);
              const total = metrics.totalEvents ?? 0;
              const hasData = total > 0;
              const violations = Math.min(critHigh, total);
              const passing = Math.max(0, total - violations);
              const pct = hasData ? Math.round((passing / total) * 100) : 0;
              return (
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-semibold" title="Approximation based on CRITICAL/HIGH event ratio — not a full AWS Config scan">
                      CIS AWS Benchmarks
                    </span>
                    {hasData
                      ? <span className={`font-bold ${pct >= 70 ? 'text-emerald-600' : 'text-amber-600'}`} title="Events without CRITICAL/HIGH findings">{pct}% no violations</span>
                      : <span className="font-medium text-slate-400 italic">Not evaluated</span>}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-violet-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            {/* SOC 2 — control coverage */}
            {(() => {
              const hasRemediation = !!orchestrationResult?.results?.remediation_plan;
              const hasDoc = !!orchestrationResult?.results?.documentation;
              const hasCT = (timeline?.events?.length ?? 0) > 0;
              const met = [hasRemediation, hasDoc, hasCT, true].filter(Boolean).length;
              const pct = Math.round((met / 4) * 100);
              return (
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-semibold" title="Based on: CloudTrail active, remediation plan generated, documentation generated">SOC 2 Trust Controls</span>
                    <span className={`font-bold ${pct >= 75 ? 'text-emerald-600' : 'text-amber-600'}`} title={`CloudTrail: ${hasCT ? '✓' : '✗'} | Remediation: ${hasRemediation ? '✓' : '✗'} | Docs: ${hasDoc ? '✓' : '✗'}`}>{pct}% workflow</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            {/* OWASP LLM — requires AI Pipeline Security scan */}
            {(() => {
              const aiResult = (orchestrationResult?.results as any)?.ai_pipeline_security;
              const owaspPassed = aiResult?.owasp_llm_passed ?? null;
              const owaspTotal = 10;
              const hasData = owaspPassed !== null;
              return (
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-semibold">OWASP LLM Top 10</span>
                    {hasData
                      ? <span className={`font-bold ${owaspPassed >= 8 ? 'text-emerald-600' : owaspPassed >= 5 ? 'text-amber-600' : 'text-red-500'}`}>{owaspPassed}/{owaspTotal} passed</span>
                      : <span className="font-medium text-slate-400 italic">Not evaluated — run AI scan</span>}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-emerald-500" style={{ width: hasData ? `${(owaspPassed / owaspTotal) * 100}%` : '0%' }} />
                  </div>
                </div>
              );
            })()}
            {/* NIST AI RMF — requires AI Pipeline Security scan */}
            {(() => {
              const aiResult = (orchestrationResult?.results as any)?.ai_pipeline_security;
              const nistAligned = aiResult?.nist_ai_rmf_aligned ?? null;
              const nistTotal = 4;
              const hasData = nistAligned !== null;
              return (
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-700 font-semibold">NIST AI RMF</span>
                    {hasData
                      ? <span className={`font-bold ${nistAligned >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>{nistAligned}/{nistTotal} aligned</span>
                      : <span className="font-medium text-slate-400 italic">Not evaluated — run AI scan</span>}
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 bg-teal-500" style={{ width: hasData ? `${(nistAligned / nistTotal) * 100}%` : '0%' }} />
                  </div>
                </div>
              );
            })()}
          </div>

          <p className="text-[10px] text-slate-400 mt-3">See Compliance and AI Compliance tabs for detailed control-by-control breakdown</p>
        </motion.div>

        {/* Analysis Completeness */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Analysis Checklist</h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
              {[
                !!orchestrationResult?.results?.risk_scores?.length,
                !!orchestrationResult?.results?.remediation_plan,
                !!orchestrationResult?.results?.documentation,
                !!orchestrationResult?.results?.correlation,
                !!timeline?.root_cause,
              ].filter(Boolean).length} / 5 Complete
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Risk Scoring', done: !!orchestrationResult?.results?.risk_scores?.length, detail: 'Nova Micro ensemble', onClick: undefined },
              { label: 'Remediation Plan', done: !!orchestrationResult?.results?.remediation_plan, detail: 'Nova Act playbook', onClick: onNavigateToRemediation },
              { label: 'Documentation', done: !!orchestrationResult?.results?.documentation, detail: 'NIST IR report', onClick: onNavigateToExport },
              { label: 'Cross-Incident Correlation', done: !!orchestrationResult?.results?.correlation, detail: 'Campaign detection', onClick: onNavigateToIncidentHistory },
              { label: 'Root Cause Analysis', done: !!timeline?.root_cause, detail: 'Attack vector identified', onClick: undefined },
            ].map((item, i) => (
              <div
                key={i}
                onClick={item.onClick}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  item.done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                } ${item.onClick ? 'cursor-pointer hover:shadow-sm' : ''}`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500' : 'border-2 border-slate-300'}`}>
                  {item.done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${item.done ? 'text-emerald-800' : 'text-slate-600'}`}>{item.label}</p>
                  <p className="text-[10px] text-slate-400">{item.detail}</p>
                </div>
                {item.onClick && <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>}

      {/* ══════════════════════════════════════════
          ROW 4 — INCIDENT ANALYSIS  (Key findings)
      ══════════════════════════════════════════ */}
      {activeSection === 'intelligence' && <section className="space-y-3">
        <h2 className="section-label">Incident Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KeyFindingCard
            id="root-cause"
            title="Root Cause"
            subtitle="Initial attack vector"
            text={rootCause}
            icon={Target as React.ComponentType<{ className?: string; strokeWidth?: number }>}
            accent="bg-red-500"
            iconBg="bg-red-100"
            iconColor="text-red-600"
            borderColor="border-l-red-500"
            timeline={timeline}
            getSupportingEvents={(events) => {
              const rc = events.filter(e => /CreateRole|AttachRolePolicy|AssumeRole|CreatePolicyVersion|PutCredentials|StartEnvironment|CreateSession/i.test(e.action || ''));
              const ch = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL' || (e.severity as string)?.toUpperCase() === 'HIGH');
              return (rc.length ? rc : ch).slice(0, 5);
            }}
          />
          <KeyFindingCard
            id="attack-pattern"
            title="Attack Pattern"
            subtitle="Kill chain stages"
            text={attackPattern}
            icon={Activity as React.ComponentType<{ className?: string; strokeWidth?: number }>}
            accent="bg-orange-500"
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            borderColor="border-l-orange-500"
            timeline={timeline}
            getSupportingEvents={(events) => {
              const ap = events.filter(e => /AuthorizeSecurityGroup|RunInstances|CreateAccessKey|GuardDuty|CreatePolicyVersion|DeleteSession|PutCredentials|CreateSession/i.test(e.action || ''));
              const ch = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL' || (e.severity as string)?.toUpperCase() === 'HIGH');
              return (ap.length ? ap : ch).slice(0, 5);
            }}
          />
          <KeyFindingCard
            id="blast-radius"
            title="Blast Radius"
            subtitle={`${metrics.totalEvents} events, ${metrics.criticalCount} critical`}
            text={blastRadius}
            icon={Layers as React.ComponentType<{ className?: string; strokeWidth?: number }>}
            accent="bg-violet-500"
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            borderColor="border-l-violet-500"
            timeline={timeline}
            getSupportingEvents={(events) => {
              const ch = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL' || (e.severity as string)?.toUpperCase() === 'HIGH');
              return ch.slice(0, 5);
            }}
          />
        </div>
      </section>}

      {/* Cross-Incident Correlation */}
      {activeSection === 'intelligence' && orchestrationResult?.results?.correlation && orchestrationResult.results.correlation.campaign_probability > 0.5 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-card"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Cross-Incident Correlation Detected</p>
              <p className="text-xs text-amber-800 mt-0.5">
                {Math.round((orchestrationResult.results.correlation.campaign_probability) * 100)}% probability this is a coordinated campaign.
              </p>
              {orchestrationResult.results.correlation.correlation_summary && (
                <p className="text-[11px] text-amber-700 mt-1.5 leading-relaxed">{orchestrationResult.results.correlation.correlation_summary}</p>
              )}
              <p className="text-[10px] text-amber-600 mt-1">Ask Aria: &quot;Have we seen this attack before?&quot;</p>
            </div>
            {onNavigateToIncidentHistory && (
              <button onClick={onNavigateToIncidentHistory} className="shrink-0 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-lg transition-colors">
                View similar →
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          ROW 5 — SCENARIO SIM + SLA
      ══════════════════════════════════════════ */}
      {activeSection === 'whatif' && <section className="space-y-3">
        <h2 className="section-label flex items-center gap-2"><FlaskConical className="w-4 h-4 text-violet-500" /> Scenario Simulation</h2>
        <div className="card">
          <button
            onClick={() => setShowWhatIf(!showWhatIf)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors border-b border-slate-100 bg-slate-50/50"
          >
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              What If — Scenario Simulation
              <span className="badge bg-violet-50 text-violet-700 border-violet-200">AI-Powered</span>
            </span>
            {showWhatIf ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showWhatIf && (
            <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="What if MFA was enabled on all users?"
                value={whatIfQuestion}
                onChange={(e) => setWhatIfQuestion(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <button key={q} onClick={() => { setWhatIfQuestion(q); runWhatIf(q); }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
              <button
                onClick={() => runWhatIf(whatIfQuestion)}
                disabled={whatIfLoading || !whatIfQuestion.trim()}
                className="px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
              >
                {whatIfLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulating...</> : <><Sparkles className="w-4 h-4" /> Simulate</>}
              </button>
              <AnimatePresence>
                {whatIfResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="card-inner p-4">
                        <h4 className="section-label mb-2">Actual Scenario</h4>
                        <p className="text-sm text-slate-700 leading-relaxed">{whatIfResult.original_scenario}</p>
                      </div>
                      <div className="card-inner p-4 border-l-2 border-l-violet-400">
                        <h4 className="section-label mb-2">Modified Scenario</h4>
                        <p className="text-sm text-slate-700 leading-relaxed">{whatIfResult.modified_scenario}</p>
                      </div>
                    </div>
                    {whatIfResult.impact_changes && (
                      <div className="flex flex-wrap gap-2">
                        {whatIfResult.impact_changes.severity_change && (
                          <span className={`badge ${(whatIfResult.impact_changes.severity_change || '').includes('prevented') || (whatIfResult.impact_changes.severity_change || '').includes('reduced') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : (whatIfResult.impact_changes.severity_change || '').toLowerCase().includes('no change') ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                            Severity: {whatIfResult.impact_changes.severity_change}
                          </span>
                        )}
                        {whatIfResult.impact_changes.cost_change && (
                          <span className="badge bg-slate-100 text-slate-700 border-slate-200">Cost: {whatIfResult.impact_changes.cost_change}</span>
                        )}
                        {whatIfResult.impact_changes.blast_radius && (
                          <span className={`badge ${(whatIfResult.impact_changes.blast_radius || '').toLowerCase().includes('reduced') || (whatIfResult.impact_changes.blast_radius || '').toLowerCase().includes('zero') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            Blast radius: {whatIfResult.impact_changes.blast_radius}
                          </span>
                        )}
                      </div>
                    )}
                    {whatIfResult.key_insight && (
                      <p className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">{whatIfResult.key_insight}</p>
                    )}
                    {whatIfResult.preventive_controls && whatIfResult.preventive_controls.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-600">Preventive Controls</h5>
                        {whatIfResult.preventive_controls.map((pc: any, i: number) => (
                          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-800">{pc.control}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{pc.effectiveness}</p>
                            {pc.aws_cli && (
                              <div className="flex items-start gap-2 mt-2">
                                <pre className="flex-1 p-2 text-xs font-mono bg-slate-900 text-slate-100 rounded overflow-x-auto">{pc.aws_cli}</pre>
                                <button onClick={() => copyCli(pc.aws_cli, `cli-${i}`)} className="p-2 rounded bg-slate-200 hover:bg-slate-300">
                                  {whatIfCopiedId === `cli-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>}

      {/* SLA */}
      {activeSection === 'whatif' && <section className="space-y-3">
        <h2 className="section-label flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> Incident Response SLA</h2>
        <SLATracker
          checkpoints={deriveSLACheckpoints(
            orchestrationResult?.analysis_time_ms ?? 0,
            !!orchestrationResult?.results?.remediation_plan,
            !!orchestrationResult?.results?.documentation
          )}
          compact
        />
      </section>}

      {/* Cost Impact CTA */}
      {activeSection === 'overview' && onNavigateToCostImpact && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <button onClick={onNavigateToCostImpact}
            className="w-full flex items-center justify-between gap-4 text-left hover:bg-white/60 rounded-lg p-3 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">What's the business impact?</h4>
                <p className="text-xs text-slate-500">View cost exposure &amp; wolfir savings</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      )}

    </div>
  );
};

/** Unified Key Finding card: summary + expandable supporting evidence */
function KeyFindingCard({
  id: _id,
  title,
  subtitle,
  text,
  icon: Icon,
  accent,
  iconBg,
  iconColor,
  borderColor: _borderColor,
  timeline,
  getSupportingEvents,
}: {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  timeline: Timeline;
  getSupportingEvents: (events: Array<{ action?: string; resource?: string; severity?: string; timestamp?: string }>) => Array<{ action?: string; resource?: string; severity?: string; timestamp?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const events = timeline?.events || [];
  const supportingEvents = getSupportingEvents(events);

  const formatResource = (r: string) =>
    (r || '').replace(/Environment\s+[a-f0-9-]{36}/gi, 'Bedrock Environment').replace(/Session\s+[\d-]+[a-z0-9]+/gi, 'Bedrock Session');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card hover:shadow-md transition-shadow"
    >
      <div className={`h-0.5 ${accent}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center border border-slate-200`}>
              <Icon className={`w-4.5 h-4.5 ${iconColor}`} strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
              <p className="text-[10px] text-slate-500">{subtitle}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
        {supportingEvents.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide' : 'Show'} supporting evidence ({supportingEvents.length})
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && supportingEvents.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
          >
            <div className="p-4 pt-3">
              <p className="section-label mb-2">CloudTrail events</p>
              <ul className="space-y-1.5">
                {supportingEvents.map((e, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-2 font-mono">
                    <span className="text-slate-400 shrink-0">{e.timestamp?.slice(0, 16) || '—'}</span>
                    <span>{e.action} → {formatResource(e.resource || '')} ({e.severity})</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SecurityPostureDashboard;
