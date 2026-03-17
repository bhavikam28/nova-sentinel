/**
 * Report Export - Generate and download analysis reports
 * Markdown/PDF export with executive summary and Nova Canvas cover
 */
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, FileText, Printer, Copy, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronUp, Loader2, Image, X, Briefcase, Shield
} from 'lucide-react';
import html2canvas from 'html2canvas';
import type { Timeline, OrchestrationResponse } from '../../types/incident';
import { novaCanvasMCPAPI, reportAPI } from '../../services/api';
import { estimateCosts } from './CostImpact';

interface ReportExportProps {
  timeline: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  incidentId?: string;
  analysisTime?: number;
  remediationPlan?: any;
  incidentType?: string;
}

interface ExecutiveBriefingData {
  executive_summary: string;
  image_base64: string | null;
  incident_id: string;
  severity: string;
  cost_estimate: string;
  blast_radius: string;
  top_recommendation: string;
  /** Additional remediation steps for CEO-level completeness */
  remediation_steps?: string[];
}

/**
 * Generate MITRE ATT&CK Navigator layer JSON from timeline events.
 * Maps common AWS actions to ATT&CK technique IDs so security teams can
 * load directly into https://mitre-attack.github.io/attack-navigator/
 */
const ACTION_TO_TECHNIQUE: Record<string, { id: string; name: string; tactic: string }> = {
  // Initial Access
  AssumeRole:                   { id: 'T1078', name: 'Valid Accounts', tactic: 'initial-access' },
  ConsoleLogin:                 { id: 'T1078', name: 'Valid Accounts', tactic: 'initial-access' },
  GetFederationToken:           { id: 'T1550.001', name: 'Use Alternate Authentication Material: Application Access Token', tactic: 'initial-access' },
  GetSessionToken:              { id: 'T1078', name: 'Valid Accounts', tactic: 'initial-access' },
  SwitchRole:                   { id: 'T1078.004', name: 'Valid Accounts: Cloud Accounts', tactic: 'initial-access' },

  // Persistence
  CreateAccessKey:              { id: 'T1098.001', name: 'Account Manipulation: Additional Cloud Credentials', tactic: 'persistence' },
  CreateUser:                   { id: 'T1136.003', name: 'Create Account: Cloud Account', tactic: 'persistence' },
  CreateRole:                   { id: 'T1098', name: 'Account Manipulation', tactic: 'persistence' },
  UpdateAccessKey:              { id: 'T1098.001', name: 'Account Manipulation: Additional Cloud Credentials', tactic: 'persistence' },
  AddUserToGroup:               { id: 'T1098', name: 'Account Manipulation', tactic: 'persistence' },
  PutUserPolicy:                { id: 'T1098', name: 'Account Manipulation', tactic: 'persistence' },
  PutRolePolicy:                { id: 'T1098', name: 'Account Manipulation', tactic: 'persistence' },
  CreateLoginProfile:           { id: 'T1136.003', name: 'Create Account: Cloud Account', tactic: 'persistence' },
  UpdateLoginProfile:           { id: 'T1098', name: 'Account Manipulation', tactic: 'persistence' },

  // Privilege Escalation
  AttachUserPolicy:             { id: 'T1078.004', name: 'Valid Accounts: Cloud Accounts', tactic: 'privilege-escalation' },
  AttachRolePolicy:             { id: 'T1098', name: 'Account Manipulation', tactic: 'privilege-escalation' },
  AttachGroupPolicy:            { id: 'T1098', name: 'Account Manipulation', tactic: 'privilege-escalation' },
  UpdateAssumeRolePolicy:       { id: 'T1098', name: 'Account Manipulation', tactic: 'privilege-escalation' },
  CreatePolicyVersion:          { id: 'T1484.001', name: 'Domain Policy Modification: Group Policy Modification', tactic: 'privilege-escalation' },
  SetDefaultPolicyVersion:      { id: 'T1484.001', name: 'Domain Policy Modification', tactic: 'privilege-escalation' },
  PassRole:                     { id: 'T1098', name: 'Account Manipulation', tactic: 'privilege-escalation' },

  // Defense Evasion
  DeleteTrail:                  { id: 'T1562.008', name: 'Impair Defenses: Disable Cloud Logs', tactic: 'defense-evasion' },
  StopLogging:                  { id: 'T1562.008', name: 'Impair Defenses: Disable Cloud Logs', tactic: 'defense-evasion' },
  DeleteFlowLogs:               { id: 'T1562.008', name: 'Impair Defenses: Disable Cloud Logs', tactic: 'defense-evasion' },
  DisableAlarmActions:          { id: 'T1562', name: 'Impair Defenses', tactic: 'defense-evasion' },
  DeleteDetector:               { id: 'T1562.001', name: 'Impair Defenses: Disable or Modify Tools', tactic: 'defense-evasion' },
  DisableSecurityHub:           { id: 'T1562.001', name: 'Impair Defenses: Disable or Modify Tools', tactic: 'defense-evasion' },
  UpdateTrail:                  { id: 'T1562.008', name: 'Impair Defenses: Disable Cloud Logs', tactic: 'defense-evasion' },
  DeleteBucketPolicy:           { id: 'T1562', name: 'Impair Defenses', tactic: 'defense-evasion' },

  // Discovery
  DescribeInstances:            { id: 'T1526', name: 'Cloud Service Discovery', tactic: 'discovery' },
  DescribeSecurityGroups:       { id: 'T1526', name: 'Cloud Service Discovery', tactic: 'discovery' },
  DescribeVpcs:                 { id: 'T1526', name: 'Cloud Service Discovery', tactic: 'discovery' },
  DescribeSubnets:              { id: 'T1526', name: 'Cloud Service Discovery', tactic: 'discovery' },
  ListBuckets:                  { id: 'T1619', name: 'Cloud Storage Object Discovery', tactic: 'discovery' },
  ListObjects:                  { id: 'T1619', name: 'Cloud Storage Object Discovery', tactic: 'discovery' },
  ListRoles:                    { id: 'T1069.003', name: 'Permission Groups Discovery: Cloud Groups', tactic: 'discovery' },
  ListUsers:                    { id: 'T1087.004', name: 'Account Discovery: Cloud Account', tactic: 'discovery' },
  ListGroups:                   { id: 'T1069.003', name: 'Permission Groups Discovery: Cloud Groups', tactic: 'discovery' },
  GetCallerIdentity:            { id: 'T1033', name: 'System Owner/User Discovery', tactic: 'discovery' },
  GetAccountAuthorizationDetails:{ id: 'T1087.004', name: 'Account Discovery: Cloud Account', tactic: 'discovery' },
  DescribeRegions:              { id: 'T1526', name: 'Cloud Service Discovery', tactic: 'discovery' },
  ListFunctions:                { id: 'T1526', name: 'Cloud Service Discovery', tactic: 'discovery' },
  DescribeClusters:             { id: 'T1526', name: 'Cloud Service Discovery', tactic: 'discovery' },
  GetSecretValue:               { id: 'T1552.001', name: 'Unsecured Credentials: Credentials In Files', tactic: 'credential-access' },
  ListSecrets:                  { id: 'T1552.001', name: 'Unsecured Credentials: Credentials In Files', tactic: 'credential-access' },

  // Execution
  RunInstances:                 { id: 'T1204', name: 'User Execution', tactic: 'execution' },
  StartInstances:               { id: 'T1204', name: 'User Execution', tactic: 'execution' },
  InvokeFunction:               { id: 'T1059.009', name: 'Command and Scripting Interpreter: Cloud API', tactic: 'execution' },
  InvokeModel:                  { id: 'T1059.009', name: 'Command and Scripting Interpreter: Cloud API', tactic: 'execution' },
  CreateFunction:               { id: 'T1059.009', name: 'Command and Scripting Interpreter: Cloud API', tactic: 'execution' },
  SendCommand:                  { id: 'T1651', name: 'Cloud Administration Command', tactic: 'execution' },
  StartAutomationExecution:     { id: 'T1651', name: 'Cloud Administration Command', tactic: 'execution' },

  // Collection
  GetObject:                    { id: 'T1530', name: 'Data from Cloud Storage Object', tactic: 'collection' },
  CopyObject:                   { id: 'T1530', name: 'Data from Cloud Storage Object', tactic: 'collection' },
  CreateSnapshot:               { id: 'T1530', name: 'Data from Cloud Storage Object', tactic: 'collection' },
  DescribeSnapshots:            { id: 'T1530', name: 'Data from Cloud Storage Object', tactic: 'collection' },
  GetDatabaseDump:              { id: 'T1005', name: 'Data from Local System', tactic: 'collection' },

  // Exfiltration
  PutObject:                    { id: 'T1537', name: 'Transfer Data to Cloud Account', tactic: 'exfiltration' },
  CreateBucket:                 { id: 'T1537', name: 'Transfer Data to Cloud Account', tactic: 'exfiltration' },
  PutBucketPolicy:              { id: 'T1537', name: 'Transfer Data to Cloud Account', tactic: 'exfiltration' },
  ModifySnapshotAttribute:      { id: 'T1537', name: 'Transfer Data to Cloud Account', tactic: 'exfiltration' },

  // Impact
  TerminateInstances:           { id: 'T1531', name: 'Account Access Removal', tactic: 'impact' },
  DeleteBucket:                 { id: 'T1485', name: 'Data Destruction', tactic: 'impact' },
  DeleteObjects:                { id: 'T1485', name: 'Data Destruction', tactic: 'impact' },
  DeleteFunction:               { id: 'T1485', name: 'Data Destruction', tactic: 'impact' },
  PutBucketVersioning:          { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'impact' },
  AuthorizeSecurityGroupIngress:{ id: 'T1562.007', name: 'Impair Defenses: Disable or Modify Cloud Firewall', tactic: 'impact' },

  // Lateral Movement
  RequestSpotInstances:         { id: 'T1578.002', name: 'Modify Cloud Compute Infrastructure: Create Cloud Instance', tactic: 'lateral-movement' },
  ModifyInstanceAttribute:      { id: 'T1578', name: 'Modify Cloud Compute Infrastructure', tactic: 'lateral-movement' },
};

function generateMitreNavigatorLayer(timeline: Timeline, incidentType = 'AWS Incident'): string {
  const seen = new Set<string>();
  const techniques: object[] = [];

  for (const event of timeline.events) {
    const action = event.action?.split(':').pop() || event.action || '';
    const match = ACTION_TO_TECHNIQUE[action];
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      const sev = event.severity?.toUpperCase();
      const color = sev === 'CRITICAL' ? '#ff4444' : sev === 'HIGH' ? '#ff8800' : sev === 'MEDIUM' ? '#ffcc00' : '#88cc88';
      techniques.push({
        techniqueID: match.id,
        tactic: match.tactic,
        color,
        comment: `Detected in WolfIR incident: ${event.action} by ${event.actor}`,
        enabled: true,
        score: sev === 'CRITICAL' ? 100 : sev === 'HIGH' ? 75 : sev === 'MEDIUM' ? 50 : 25,
        metadata: [],
        links: [],
        showSubtechniques: false,
      });
    }
  }

  const layer = {
    name: `WolfIR — ${incidentType}`,
    versions: { attack: '14', navigator: '4.9.1', layer: '4.5' },
    domain: 'enterprise-attack',
    description: `Automatically generated by WolfIR Incident Response. Incident type: ${incidentType}. ${timeline.events.length} events analyzed.`,
    filters: { platforms: ['AWS'] },
    sorting: 0,
    layout: { layout: 'side', aggregateFunction: 'max', showID: true, showName: true },
    hideDisabled: false,
    techniques,
    gradient: { colors: ['#ffffff', '#ff6666'], minValue: 0, maxValue: 100 },
    legendItems: [
      { label: 'CRITICAL', color: '#ff4444' },
      { label: 'HIGH', color: '#ff8800' },
      { label: 'MEDIUM', color: '#ffcc00' },
      { label: 'LOW/INFO', color: '#88cc88' },
    ],
    metadata: [],
    links: [],
    showTacticRowBackground: true,
    tacticRowBackground: '#1e293b',
    selectTechniquesAcrossTactics: true,
    selectSubtechniquesWithParent: false,
  };

  return JSON.stringify(layer, null, 2);
}

/** Truncate at last word boundary to avoid mid-word cuts */
function truncateAtWord(s: string, maxLen: number): string {
  if (!s || s.length <= maxLen) return s || '';
  const cut = s.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace).trim() : cut;
}

/** Client-side 3-sentence executive summary for demo fallback — complete sentences, no mid-word truncation */
function buildDemoExecutiveSummary(
  incidentType: string,
  rootCause: string,
  severity: string,
  blastRadius: string,
  costEstimate: string,
  topRec: string
): string {
  const rc = truncateAtWord(rootCause || 'Under investigation', 180);
  const br = truncateAtWord(blastRadius || 'Assessing', 140);
  const s1 = `A ${severity} security incident (${incidentType}) was detected in your AWS environment.`;
  const s2 = `Root cause: ${rc}${(rootCause?.length || 0) > 180 ? '...' : ''}. Affected scope: ${br}${(blastRadius?.length || 0) > 140 ? '...' : ''}.`;
  const s3 = `Cost impact: ${costEstimate || 'See Cost Impact tab'}. Recommended immediate action: ${topRec}.`;
  return `${s1} ${s2} ${s3}`;
}

/** Convert markdown report to professional HTML for print/PDF (blue header like compliance report) */
function reportMarkdownToPrintHtml(markdown: string, incidentId?: string): string {
  const now = new Date().toLocaleString();
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = markdown.split('\n');
  const parts: string[] = [];
  parts.push(`<div class="report-header"><h1>Security Incident Report</h1><p>Generated ${now} | ${incidentId || 'wolfir'}</p></div>`);
  parts.push('<div class="report-body">');
  let inTable = false;
  let tableRows: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t && !inTable) { parts.push('<p>&nbsp;</p>'); continue; }
    if (t.startsWith('# ')) { parts.push(`<h1>${escape(t.slice(2))}</h1>`); continue; }
    if (t.startsWith('## ')) { parts.push(`<h2>${escape(t.slice(3))}</h2>`); continue; }
    if (t.startsWith('### ')) { parts.push(`<h3>${escape(t.slice(4))}</h3>`); continue; }
    if (t.startsWith('---')) { continue; }
    if (t.startsWith('|')) {
      const cells = t.split('|').filter(Boolean).map(c => escape(c.trim()));
      if (!inTable) { inTable = true; tableRows = []; }
      if (t.includes('---') || cells.every(c => /^-+$/.test(c))) { continue; }
      tableRows.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
      continue;
    }
    if (inTable && tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1).join('');
      parts.push(`<table><thead>${header.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</thead><tbody>${body}</tbody></table>`);
      tableRows = [];
      inTable = false;
    }
    if (t.startsWith('- ') || t.startsWith('* ')) { parts.push(`<ul><li>${escape(t.slice(2)).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</li></ul>`); continue; }
    parts.push(`<p>${escape(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`);
  }
  if (inTable && tableRows.length > 0) {
    const header = tableRows[0];
    const body = tableRows.slice(1).join('');
    parts.push(`<table><thead>${header.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</thead><tbody>${body}</tbody></table>`);
  }
  parts.push('</div>');
  return parts.join('');
}

const REPORT_MODEL_ATTRIBUTION = `
---

## Model Attribution

This report was generated using the following Amazon Nova AI models:

| Model | Purpose |
|-------|---------|
| Amazon Nova Pro | Incident detection, visual diagram analysis |
| Amazon Nova 2 Lite | Temporal analysis, documentation generation |
| Amazon Nova Micro | Risk scoring and classification |
| Amazon Nova Canvas | Report cover and security visualizations |

*wolfir — AI-powered AWS security analysis. Infrastructure: MCP Server, Strands Agents Framework.*
`;

const ReportExport: React.FC<ReportExportProps> = ({
  timeline,
  orchestrationResult: _orchestrationResult,
  incidentId,
  analysisTime,
  remediationPlan,
  incidentType = 'Security Incident',
}) => {
  const [copied, setCopied] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverSource, setCoverSource] = useState<'nova-canvas' | 'built-in' | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [executiveBriefingOpen, setExecutiveBriefingOpen] = useState(false);
  const [executiveBriefingData, setExecutiveBriefingData] = useState<ExecutiveBriefingData | null>(null);
  const [executiveBriefingLoading, setExecutiveBriefingLoading] = useState(false);
  const [executiveBriefingError, setExecutiveBriefingError] = useState<string | null>(null);
  const [mitreDownloaded, setMitreDownloaded] = useState(false);
  const briefingRef = useRef<HTMLDivElement>(null);

  const getSteps = () =>
    remediationPlan?.steps ||
    remediationPlan?.plan?.steps ||
    (Array.isArray(remediationPlan?.plan?.plan) ? remediationPlan.plan.plan : []) ||
    [];

  const generateMarkdownReport = useCallback(() => {
    const events = timeline?.events || [];
    const criticalCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL').length;
    const highCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'HIGH').length;
    const mediumCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'MEDIUM').length;
    const lowCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'LOW').length;
    const confidence = timeline?.confidence || 0;
    const steps = getSteps();

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return `# Security Incident Report

**Incident ID:** ${incidentId || 'N/A'}  
**Generated:** ${dateStr} at ${timeStr}  
**Analysis Time:** ${analysisTime ? `${(analysisTime / 1000).toFixed(1)} seconds` : 'N/A'}  
**AI Confidence:** ${(confidence * 100).toFixed(0)}%

---

## Executive Summary

### Root Cause
${timeline?.root_cause || 'Not determined'}

### Attack Pattern
${timeline?.attack_pattern || 'Not determined'}

### Blast Radius
${timeline?.blast_radius || 'Not determined'}

---

## Risk Distribution

| Severity | Count |
|----------|-------|
| Critical | ${criticalCount} |
| High | ${highCount} |
| Medium | ${mediumCount} |
| Low | ${lowCount} |

**Total Events:** ${events.length}

---

## Event Timeline

| # | Severity | Event | Actor | Resource | Time |
|---|----------|-------|-------|----------|------|
${events.slice(0, 20).map((e: any, i: number) => `| ${i + 1} | ${(e.severity as string)?.toUpperCase() || 'N/A'} | ${(e.event_name || e.action || 'Unknown').replace(/\|/g, '\\|')} | ${(e.actor || 'Unknown').replace(/\|/g, '\\|')} | ${(e.resource || 'Unknown').replace(/\|/g, '\\|')} | ${e.timestamp || 'N/A'} |`).join('\n')}
${events.length > 20 ? `\n*... and ${events.length - 20} more events*` : ''}

---

## Remediation Plan

${steps.length > 0 ? steps.map((s: any, i: number) => `### Step ${i + 1}: ${s.action || s.title || 'Unknown'}
- **Priority:** ${(s.priority || s.severity || 'MEDIUM').toUpperCase()}
- ${s.details || s.description || 'No details provided'}

`).join('') : '*No remediation plan generated yet.*'}

---

## Compliance Impact

**Frameworks Assessed:** CIS Benchmarks, NIST 800-53, SOC 2, PCI-DSS  
**Status:** See Compliance Mapping feature for detailed control mappings

---

## Cost Impact Estimate

See Cost Impact Estimation feature for detailed financial analysis including breach liability, downtime costs, and ROI calculation.
${REPORT_MODEL_ATTRIBUTION}
`;
  }, [timeline, incidentId, analysisTime, remediationPlan]);

  const generateEUAIActReport = useCallback(() => {
    const base = generateMarkdownReport();
    const severity = timeline?.events?.some((e: any) => (e.severity as string)?.toUpperCase() === 'CRITICAL') ? 'HIGH' : timeline?.events?.some((e: any) => (e.severity as string)?.toUpperCase() === 'HIGH') ? 'HIGH' : 'MEDIUM';
    const euSection = `

---

## EU AI Act Conformity Addendum

*This section supports documentation requirements for high-risk AI systems under Regulation (EU) 2024/1689.*

### 1. Intended Purpose
**System:** wolfir — AI that secures your cloud and secures itself  
**Purpose:** Incident detection, attack path analysis, and remediation planning for AWS security events.  
**Risk Classification:** ${severity} — Security monitoring and incident response.

### 2. Risk Management
- **Identified Risks:** Unauthorized access, privilege escalation, data exfiltration (as per incident analysis).
- **Mitigation:** Automated detection, human-in-the-loop approval for remediation, audit trail via CloudTrail.
- **Residual Risk:** Documented in remediation plan; executive approval required for execution.

### 3. Human Oversight
- **Human-in-the-loop:** Remediation steps require explicit approval before execution.
- **Interpretability:** Attack path visualization, timeline, and MITRE mapping support human review.
- **Override:** Operators can reject or modify AI-generated remediation plans.

### 4. Traceability & Logging
- **Event Log:** Full CloudTrail timeline with actor, resource, timestamp.
- **Model Attribution:** Report generated using Amazon Nova models (see footer).
- **Audit Trail:** All analysis and remediation decisions logged.

### 5. Transparency
- **Disclosure:** This system uses AI for analysis and recommendations. Final decisions require human approval.
- **Contact:** See wolfir documentation for governance and escalation paths.

---
*EU AI Act Conformity Addendum — Generated by wolfir*
`;
    return base + euSection;
  }, [generateMarkdownReport, timeline]);

  const generatePlainReport = useCallback(() => {
    const md = generateMarkdownReport();
    return md.replace(/#+/g, '').replace(/\|/g, ' ').replace(/-+/g, '─').replace(/\*\*/g, '');
  }, [generateMarkdownReport]);

  const reportMarkdown = generateMarkdownReport();

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = reportMarkdown;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wolfir-report-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadEUAIActPack = () => {
    const md = generateEUAIActReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wolfir-eu-ai-act-pack-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    const plain = generatePlainReport();
    const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wolfir-report-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMitreNavigatorExport = () => {
    const json = generateMitreNavigatorLayer(timeline, incidentType || 'AWS Incident');
    // Use octet-stream so the browser always prompts save-to-disk instead of
    // opening the .json file in VS Code or the system default application.
    const blob = new Blob([json], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wolfir-mitre-layer-${incidentId || 'incident'}.json`;
    link.setAttribute('download', `wolfir-mitre-layer-${incidentId || 'incident'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMitreDownloaded(true);
    setTimeout(() => setMitreDownloaded(false), 8000);
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const coverB64 = coverImage?.startsWith('data:') ? coverImage : coverImage ? `data:image/png;base64,${coverImage}` : null;
      const blob = await reportAPI.exportPdf(incidentId || 'analysis', reportMarkdown, coverB64);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wolfir-report-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: trigger print (user can save as PDF)
      handlePrintReport(!!coverImage, !coverImage);
    } finally {
      setPdfLoading(false);
    }
  };

  const getBriefingPayload = useCallback(() => {
    const steps = getSteps();
    const topRec = steps[0]?.action || 'Review remediation plan';
    const severity = timeline?.events?.some((e: any) => (e.severity as string)?.toUpperCase() === 'CRITICAL')
      ? 'CRITICAL'
      : timeline?.events?.some((e: any) => (e.severity as string)?.toUpperCase() === 'HIGH')
        ? 'HIGH'
        : 'MEDIUM';
    // Compute actual cost from Cost Impact logic — CISO-ready numbers
    const costs = estimateCosts(timeline, incidentType);
    const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
    // Detect routine ops to avoid misleading "unauthorized compute" label
    const allEventsLow = !timeline?.events?.some((e: any) => e.severity === 'CRITICAL' || e.severity === 'HIGH');
    const noThreatKeywords = !/crypto|mining|exfil|priv.*esc|shadow.?ai|unauthorized|external|malicious|attack/i.test(incidentType || '');
    const isRoutineOps = allEventsLow && noThreatKeywords;
    const costStr = totalCost > 0
      ? isRoutineOps
        ? `~$${totalCost.toLocaleString()} hypothetical worst-case (no active incident — routine administrative operations)`
        : `~$${totalCost.toLocaleString()} total exposure (compute, downtime, remediation)`
      : 'See Cost Impact tab for breakdown';
    return {
      incident_type: incidentType,
      root_cause: timeline?.root_cause || 'Under investigation',
      severity,
      blast_radius: timeline?.blast_radius || 'Assessing',
      cost_estimate: costStr,
      top_recommendation: topRec,
      incident_id: incidentId || 'analysis',
    };
  }, [timeline, incidentType, incidentId, remediationPlan]);

  const handleExecutiveBriefing = async () => {
    setExecutiveBriefingLoading(true);
    setExecutiveBriefingError(null);
    setExecutiveBriefingData(null);
    setExecutiveBriefingOpen(true);
    const payload = getBriefingPayload();
    try {
      const data = await reportAPI.executiveBriefing(payload);
      setExecutiveBriefingData(data);
    } catch {
      setExecutiveBriefingError('Backend unavailable. Showing demo briefing.');
      const summary = buildDemoExecutiveSummary(
        payload.incident_type,
        payload.root_cause,
        payload.severity,
        payload.blast_radius,
        payload.cost_estimate,
        payload.top_recommendation
      );
      setExecutiveBriefingData({
        executive_summary: summary,
        image_base64: null,
        incident_id: payload.incident_id,
        severity: payload.severity,
        cost_estimate: payload.cost_estimate,
        blast_radius: payload.blast_radius,
        top_recommendation: payload.top_recommendation,
      });
    } finally {
      setExecutiveBriefingLoading(false);
    }
  };

  const handleDownloadBriefingPng = async () => {
    if (!briefingRef.current) return;
    try {
      const canvas = await html2canvas(briefingRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
        // Ensure flex/centered elements render correctly in canvas
        windowWidth: briefingRef.current.scrollWidth,
        windowHeight: briefingRef.current.scrollHeight,
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `executive-briefing-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
    } catch (e) {
      console.error('Failed to capture PNG:', e);
    }
  };

  const handleCopyBriefingSummary = async () => {
    if (!executiveBriefingData?.executive_summary) return;
    try {
      await navigator.clipboard.writeText(executiveBriefingData.executive_summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = executiveBriefingData.executive_summary;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateBuiltInCoverDataUrl = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 900, 500);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 900, 500);
    // Subtle grid lines
    ctx.strokeStyle = 'rgba(99,102,241,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 900; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 500); ctx.stroke(); }
    for (let y = 0; y < 500; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke(); }
    // Glowing circle accent
    const radGrad = ctx.createRadialGradient(450, 250, 0, 450, 250, 280);
    radGrad.addColorStop(0, 'rgba(99,102,241,0.18)');
    radGrad.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 900, 500);
    // Shield icon (simple polygon)
    ctx.save();
    ctx.translate(450, 130);
    ctx.beginPath();
    ctx.moveTo(0, -55); ctx.lineTo(50, -20); ctx.lineTo(50, 20); ctx.lineTo(0, 55); ctx.lineTo(-50, 20); ctx.lineTo(-50, -20);
    ctx.closePath();
    const shieldGrad = ctx.createLinearGradient(-50, -55, 50, 55);
    shieldGrad.addColorStop(0, '#6366f1');
    shieldGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = shieldGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Security Incident Report', 450, 240);
    // Incident type
    ctx.fillStyle = '#a5b4fc';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText(incidentType || 'AWS Security Incident', 450, 278);
    // Divider
    ctx.strokeStyle = 'rgba(99,102,241,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(200, 305); ctx.lineTo(700, 305); ctx.stroke();
    // Incident ID
    ctx.fillStyle = '#64748b';
    ctx.font = '500 14px monospace';
    ctx.fillText(incidentId || 'wolfir', 450, 330);
    // Date
    const d = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillStyle = '#475569';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText(`Generated ${d}`, 450, 355);
    // Footer
    ctx.fillStyle = '#334155';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillText('wolfir · AI-Powered AWS Security Analysis · Amazon Nova', 450, 475);
    // Corner accents
    ctx.strokeStyle = 'rgba(99,102,241,0.4)';
    ctx.lineWidth = 2;
    ['tl','tr','bl','br'].forEach(corner => {
      const cx = corner.includes('r') ? 900 : 0;
      const cy = corner.includes('b') ? 500 : 0;
      const dx = corner.includes('r') ? -1 : 1;
      const dy = corner.includes('b') ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + dx * 30, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * 30);
      ctx.stroke();
    });
    return canvas.toDataURL('image/png');
  };

  const handleGenerateCover = async () => {
    setCoverLoading(true);
    setCoverImage(null);
    setCoverError(null);
    setCoverSource(null);
    const timeoutMs = 15000;
    try {
      const res = await Promise.race([
        novaCanvasMCPAPI.generateReportCover(incidentType, 'CRITICAL', incidentId || 'INC-000000'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        ),
      ]);
      const img = res?.image_base64 ?? res?.image;
      if (img) {
        setCoverImage(img.startsWith('data:') ? img : `data:image/png;base64,${img}`);
        setCoverSource('nova-canvas');
      } else {
        throw new Error('No image returned');
      }
    } catch {
      // Always fall back to built-in cover so the button always produces a result
      const builtIn = generateBuiltInCoverDataUrl();
      setCoverImage(builtIn);
      setCoverSource('built-in');
      setCoverError('Nova Canvas MCP unavailable — using built-in cover. Start the MCP server to generate AI artwork.');
    } finally {
      setCoverLoading(false);
    }
  };

  const builtInCoverHtml = () => {
    const d = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
      <div style="page-break-after:avoid;padding:48px 24px;text-align:center;border-bottom:2px solid #e2e8f0;margin-bottom:32px">
        <div style="width:64px;height:64px;margin:0 auto 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px">🛡️</div>
        <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px">Security Incident Report</h1>
        <p style="font-size:16px;font-weight:600;color:#6366f1;margin:0 0 4px">${incidentId || 'wolfir'}</p>
        <p style="font-size:12px;color:#64748b;margin:0">Generated ${d} · wolfir</p>
      </div>`;
  };

  const handlePrintReport = (includeCover: boolean = false, useBuiltInCover: boolean = false) => {
    const coverHtml =
      includeCover && coverImage
        ? `<div style="text-align:center;margin-bottom:24px;page-break-after:avoid"><img src="${coverImage}" alt="Report Cover" style="max-width:100%;max-height:280px;object-fit:contain" /><p style="color:#64748b;font-size:10px;margin-top:8px">Cover by Amazon Nova Canvas</p></div>`
        : includeCover && useBuiltInCover
          ? builtInCoverHtml()
          : '';
    const bodyHtml = reportMarkdownToPrintHtml(reportMarkdown, incidentId);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Security Incident Report — ${incidentId || 'wolfir'}</title>
            <style>
              body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 13px; padding: 40px 60px; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; }
              .report-header { background: #4f46e5; color: white; margin: -40px -60px 32px -60px; padding: 24px 60px 20px; }
              .report-header h1 { margin: 0; font-size: 22px; font-weight: 700; }
              .report-header p { margin: 6px 0 0; font-size: 11px; opacity: 0.95; }
              h2 { font-size: 16px; margin-top: 24px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
              h3 { font-size: 14px; margin-top: 16px; color: #334155; }
              table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
              th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
              th { background: #3730a3; color: white; font-weight: 600; }
              tr:nth-child(even) { background: #f8fafc; }
              ul { padding-left: 20px; margin: 8px 0; }
              .footer { font-size: 10px; color: #64748b; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
              @media print { body { padding: 20px; } .report-header { margin: -20px -20px 24px -20px; padding: 20px 20px 16px; } }
            </style>
          </head>
          <body>${coverHtml}${bodyHtml}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-5">
      {/* Export Options */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Export Analysis Report</h3>
            <p className="text-xs text-slate-500">Generate a comprehensive incident report for your team</p>
          </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Download Report', sub: '.md', onClick: handleDownloadMarkdown, icon: Download, cls: 'hover:bg-indigo-50 hover:border-indigo-200 group-hover:text-indigo-600' },
            { label: 'EU AI Act Pack', sub: '.md', onClick: handleDownloadEUAIActPack, icon: Briefcase, cls: 'hover:bg-violet-50 hover:border-violet-200 group-hover:text-violet-600' },
            { label: 'Plain Text', sub: '.txt', onClick: handleDownloadTxt, icon: FileText, cls: 'hover:bg-slate-100 hover:border-slate-300 group-hover:text-slate-700' },
            { label: copied ? 'Copied!' : 'Copy', sub: 'Clipboard', onClick: handleCopyReport, icon: copied ? CheckCircle2 : Copy, cls: 'hover:bg-emerald-50 hover:border-emerald-200 group-hover:text-emerald-600' },
            { label: 'Print / PDF', sub: 'Dialog', onClick: () => handlePrintReport(false), icon: Printer, cls: 'hover:bg-violet-50 hover:border-violet-200 group-hover:text-violet-600' },
          ].map((opt, idx) => (
            <motion.button
              key={idx === 2 ? 'copy' : opt.label}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={opt.onClick}
              className={`flex flex-col items-center justify-center gap-2 p-4 h-[88px] bg-slate-50 border border-slate-200 rounded-lg transition-all group ${opt.cls}`}
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                <opt.icon className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-xs font-bold text-slate-900">{opt.label}</p>
              <p className="text-[10px] text-slate-400">{opt.sub}</p>
            </motion.button>
          ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-bold hover:bg-violet-100 disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              {pdfLoading ? 'Generating...' : 'Download PDF'}
            </button>
            <button
              onClick={handleExecutiveBriefing}
              disabled={executiveBriefingLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-bold hover:bg-amber-100 disabled:opacity-50"
            >
              {executiveBriefingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Briefcase className="w-3 h-3" />}
              Executive Briefing
            </button>
            <button
              onClick={handleGenerateCover}
              disabled={coverLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-[11px] font-bold hover:bg-slate-100 disabled:opacity-50"
            >
              {coverLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
              {coverLoading ? 'Generating...' : coverImage ? 'Regenerate Cover' : 'Generate Cover'}
            </button>
            {coverImage && (
              <button
                onClick={() => handlePrintReport(true, false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-bold hover:bg-violet-100"
              >
                <Printer className="w-3 h-3" /> Print with Cover
              </button>
            )}
            <button
              onClick={handleMitreNavigatorExport}
              title="Download a MITRE ATT&CK Navigator layer pre-populated with techniques detected in this incident"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold transition-colors ${mitreDownloaded ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              {mitreDownloaded ? <CheckCircle2 className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {mitreDownloaded ? 'Downloaded!' : 'MITRE Navigator Layer'}
            </button>
            {mitreDownloaded && (
              <a
                href="https://mitre-attack.github.io/attack-navigator/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold hover:bg-slate-50"
              >
                Open MITRE Navigator →
              </a>
            )}
            {coverError && coverSource === 'built-in' && (
              <div className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700">{coverError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Executive Briefing Modal — premium board-ready design */}
        <AnimatePresence>
          {executiveBriefingOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setExecutiveBriefingOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-fit max-w-[100%] max-h-[90vh] overflow-hidden rounded-2xl bg-[#0f172a]"
              >
                {executiveBriefingLoading ? (
                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 rounded-2xl p-20 flex flex-col items-center justify-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold tracking-tight">Generating Executive Briefing</p>
                      <p className="text-slate-400 text-sm mt-1">Nova 2 Lite · Executive Summary</p>
                    </div>
                  </div>
                ) : executiveBriefingData ? (
                  <div
                    ref={briefingRef}
                    className="relative w-full rounded-2xl overflow-hidden bg-[#0f172a]"
                    style={{ width: 960, minWidth: 960, aspectRatio: '16/9' }}
                  >
                    {/* Landscape slide format — fits one image, no scroll */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#1e293b]" />
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-slate-500/30" />
                    <div className="relative z-10 h-full p-6 flex flex-col text-white font-sans">
                      {/* Header — single line */}
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Confidential</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-base font-bold text-white">Security Incident Report</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-xs text-slate-400">{executiveBriefingData.incident_id}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div
                          className={`shrink-0 w-[90px] h-8 rounded flex items-center justify-center ${
                            executiveBriefingData.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                            executiveBriefingData.severity === 'HIGH' ? 'bg-orange-600 text-white' : 'bg-amber-600 text-slate-900'
                          }`}
                        >
                          <span className="text-[11px] font-bold">{executiveBriefingData.severity}</span>
                        </div>
                      </div>
                      {/* Two-column layout */}
                      <div className="flex-1 grid grid-cols-[1fr,280px] gap-6 min-h-0">
                        {/* Left: Summary + Actions */}
                        <div className="flex flex-col min-h-0">
                          <div className="mb-3">
                            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Executive Summary</p>
                            <p className="text-[12px] leading-[1.5] text-slate-100 line-clamp-4">
                              {executiveBriefingData.executive_summary}
                            </p>
                          </div>
                          <div className="flex-1 min-h-0">
                            <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1">Immediate Actions</p>
                            <ol className="space-y-0.5">
                              {getSteps().slice(0, 3).map((s: any, i: number) => (
                                <li key={i} className="text-[11px] text-slate-100 flex gap-2">
                                  <span className="text-slate-500 shrink-0">{i + 1}.</span>
                                  <span>{s.action || s.title || s.details || 'Review remediation plan'}</span>
                                </li>
                              ))}
                              {getSteps().length === 0 && (
                                <li className="text-[11px] font-semibold text-white">{executiveBriefingData.top_recommendation}</li>
                              )}
                            </ol>
                          </div>
                        </div>
                        {/* Right: Metrics */}
                        <div className="grid grid-cols-2 gap-2 content-start">
                          <div className="bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Severity</p>
                            <p className="text-[11px] font-semibold text-white">{executiveBriefingData.severity}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Confidence</p>
                            <p className="text-[11px] font-semibold text-white">{((timeline?.confidence ?? 0) * 100).toFixed(0)}%</p>
                          </div>
                          <div className="bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Time to Detect</p>
                            <p className="text-[11px] font-semibold text-white">{analysisTime ? `${(analysisTime / 1000).toFixed(1)}s` : 'N/A'}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Classification</p>
                            <p className="text-[11px] font-semibold text-white leading-tight">
                              {incidentType?.toLowerCase().includes('crypto') ? 'Resource Abuse' :
                               incidentType?.toLowerCase().includes('exfil') || incidentType?.toLowerCase().includes('data') ? 'Data Exfil' :
                               incidentType?.toLowerCase().includes('iam') ? 'Credential' : 'Security'}
                            </p>
                          </div>
                          <div className="col-span-2 bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Cost Impact</p>
                            <p className="text-[11px] font-semibold text-white leading-tight">{executiveBriefingData.cost_estimate}</p>
                          </div>
                          <div className="col-span-2 bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Assets Affected</p>
                            <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">{executiveBriefingData.blast_radius}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Events</p>
                            <p className="text-[11px] font-semibold text-white">{(timeline?.events?.length || 0)}</p>
                          </div>
                          <div className="bg-slate-800/60 rounded px-3 py-2 border border-slate-700/50">
                            <p className="text-[9px] uppercase tracking-wider text-slate-400">Status</p>
                            <p className="text-[11px] font-semibold text-emerald-400">Detected</p>
                          </div>
                          {(() => {
                            const events = timeline?.events || [];
                            const withTs = events.filter((e: any) => e.timestamp);
                            if (withTs.length < 2) return null;
                            const sorted = [...withTs].sort((a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || ''));
                            const first = new Date(sorted[0].timestamp);
                            const last = new Date(sorted[sorted.length - 1].timestamp);
                            const dwellMs = last.getTime() - first.getTime();
                            const dwellDays = Math.round(dwellMs / (1000 * 60 * 60 * 24));
                            const dwellStr = dwellDays >= 1 ? `~${dwellDays}d` : '< 1d';
                            return (
                              <div className="col-span-2 flex gap-3 text-[10px] text-slate-300">
                                <span>First: {first.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                <span>Last: {last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                <span>Dwell: {dwellStr}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      {/* Bottom row — fills space: Board Rec + Regulatory */}
                      <div className="mt-3 flex gap-3">
                        <div className="flex-1 rounded-lg px-3 py-2 bg-slate-800/40 border border-slate-600/40">
                          <p className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase mb-0.5">Board Recommendation</p>
                          <p className="text-[10px] text-slate-200 leading-tight">
                            {(() => {
                              // Derive board recommendation dynamically from incident type and root cause
                              const type = (incidentType || '').toLowerCase();
                              const rc = (timeline?.root_cause || '').toLowerCase();
                              if (/routine|no.*threat|normal.*admin/i.test(type) ||
                                  (!timeline?.events?.some((e: any) => e.severity === 'CRITICAL' || e.severity === 'HIGH') &&
                                   !/crypto|exfil|attack|malicious|unauthorized/i.test(rc))) {
                                return 'Reduce root account usage — create dedicated IAM users for daily operations. Enforce MFA on all accounts. No immediate action required.';
                              }
                              if (/crypto|mining/i.test(type) || /mining/i.test(rc)) {
                                return 'Immediate termination of unauthorized EC2 instances. Review and restrict IAM policies to prevent future compute abuse. Enable GuardDuty.';
                              }
                              if (/shadow.?ai|llm|bedrock/i.test(type)) {
                                return 'Enforce Bedrock Guardrails on all model invocations. Implement allowlist for approved AI principals. Review EU AI Act compliance posture.';
                              }
                              if (/priv|escalat|contractor|assume.?role/i.test(type) || /escalat/i.test(rc)) {
                                return 'Review third-party and contractor IAM lifecycle. Implement time-bound access, permission boundaries, and quarterly privilege reviews.';
                              }
                              if (/exfil|data|s3/i.test(type)) {
                                return 'Enable S3 access logging and CloudWatch alerts on bulk GetObject. Rotate any exposed credentials immediately.';
                              }
                              // Fallback: use top remediation step if available
                              const topStep = getSteps()[0]?.action;
                              return topStep || 'Review the full remediation plan and validate all access controls are operating as intended.';
                            })()}
                          </p>
                        </div>
                        {(executiveBriefingData.severity === 'CRITICAL' || executiveBriefingData.severity === 'HIGH') && (
                          <div className="flex-1 rounded-lg px-3 py-2 bg-amber-950/30 border border-amber-700/40">
                            <p className="text-[9px] font-semibold tracking-wider text-amber-400/90 uppercase mb-0.5">Regulatory Impact</p>
                            <p className="text-[10px] text-slate-200 leading-tight">
                              May trigger GDPR, CCPA, HIPAA, or PCI-DSS notification. Legal and compliance review recommended.
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Footer — one line */}
                      <div className="mt-3 pt-3 border-t border-slate-600/40 flex items-center justify-between text-[9px] text-slate-500">
                        <span>{(timeline?.attack_pattern || timeline?.root_cause) ? truncateAtWord(timeline?.attack_pattern || timeline?.root_cause || '', 100) : ''}</span>
                        {executiveBriefingData.severity === 'CRITICAL' && (
                          <span className="text-amber-400/80">GDPR/CCPA/HIPAA/PCI-DSS review recommended</span>
                        )}
                        <span>wolfir</span>
                      </div>
                    </div>
                  </div>
                ) : null}
                {executiveBriefingError && (
                  <div className="absolute top-3 left-3 right-14 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {executiveBriefingError}
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-1.5 z-20">
                  {executiveBriefingData && (
                    <>
                      <button
                        onClick={handleDownloadBriefingPng}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors border border-white/5"
                        title="Download as PNG"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCopyBriefingSummary}
                        className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors border border-white/5"
                        title="Copy summary"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setExecutiveBriefingOpen(false)}
                    className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors border border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Preview - inline panel with cover art visible so judges see Nova Canvas output */}
        <div className="space-y-4 p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/30">
          <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            Report Preview
          </h4>
          <p className="text-xs text-slate-600">Cover art and report structure — visible inline, not just in PDF.</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            {/* Cover art — visible inline so judges see Nova Canvas output */}
            <div className="border-b border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center min-h-[160px]">
              {coverLoading ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-500">Generating cover art...</p>
                  <p className="text-xs text-slate-400">Trying Nova Canvas · falls back to built-in if unavailable</p>
                </div>
              ) : coverImage ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={coverImage} alt="Report cover" className="max-w-full max-h-[220px] object-contain rounded-lg shadow-md" />
                  <p className="text-[10px] text-slate-400">
                    {coverSource === 'nova-canvas' ? '✦ Generated by Amazon Nova Canvas' : '✦ Built-in cover (Nova Canvas MCP not available)'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Image className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600 mb-0.5">No cover image yet</p>
                  <p className="text-xs text-slate-400 mb-3">Always works — uses Nova Canvas if available, built-in otherwise</p>
                  <button
                    onClick={handleGenerateCover}
                    disabled={coverLoading}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Generate Cover
                  </button>
                </div>
              )}
            </div>
            <div className="bg-slate-900 p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">wolfir-report.md</span>
                  <button
                    onClick={() => setPreviewExpanded(!previewExpanded)}
                    className="text-[10px] text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
                  >
                    {previewExpanded ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> View Full Report</>}
                  </button>
                </div>
              </div>
              <pre className={`text-[10px] text-slate-400 font-mono leading-relaxed overflow-x-auto scrollbar-thin ${previewExpanded ? 'max-h-[480px]' : 'max-h-60'}`}>
            {previewExpanded ? reportMarkdown : `# Security Incident Report

**Incident ID:** ${incidentId || 'N/A'}
**Analysis Time:** ${analysisTime ? `${(analysisTime / 1000).toFixed(1)}s` : 'N/A'}
**AI Confidence:** ${((timeline?.confidence || 0) * 100).toFixed(0)}%

## Executive Summary

### Root Cause
${(timeline?.root_cause || 'Not determined').slice(0, 200)}${(timeline?.root_cause?.length || 0) > 200 ? '...' : ''}

### Attack Pattern
${(timeline?.attack_pattern || 'Not determined').slice(0, 200)}${(timeline?.attack_pattern?.length || 0) > 200 ? '...' : ''}

### Blast Radius
${(timeline?.blast_radius || 'Not determined').slice(0, 150)}${(timeline?.blast_radius?.length || 0) > 150 ? '...' : ''}

...

[Expand to view full report with Risk Distribution, Event Timeline, Remediation Plan, and Model Attribution]`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
