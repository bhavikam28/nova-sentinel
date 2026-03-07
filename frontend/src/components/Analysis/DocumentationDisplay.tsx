/**
 * Documentation Display - JIRA, Slack, Confluence tabs with copy functionality
 * Auto-generates documentation from timeline/remediation when analysis completes.
 * Renders platform-specific content as professional, readable output (not raw JSON).
 */
import React, { useMemo, useState, useCallback } from 'react';
import { FileText, MessageSquare, Book, Copy, CheckCircle2, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import type { Timeline } from '../../types/incident';

// Render platform content with bold (**text**) and newlines — professional, human-readable
function FormattedDocContent({ text }: { text: string }) {
  if (!text || typeof text !== 'string') return null;
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="text-slate-700 text-[13px] leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.match(/^\*\*[^*]+\*\*$/) ? (
          <strong key={i} className="font-semibold text-slate-900">{seg.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{seg}</span>
        )
      )}
    </div>
  );
}

interface DocumentationDisplayProps {
  documentation?: {
    jira?: any;
    slack?: any;
    confluence?: any;
    documentation?: { jira?: any; slack?: any; confluence?: any };
  } | null;
  incidentId: string;
  timeline?: Timeline | null;
  remediationPlan?: any;
  onGenerateDocumentation?: () => Promise<void>;
}

const DocumentationDisplay: React.FC<DocumentationDisplayProps> = ({
  documentation,
  incidentId,
  timeline,
  remediationPlan,
  onGenerateDocumentation,
}) => {
  const [activeTab, setActiveTab] = useState<'jira' | 'slack' | 'confluence'>('jira');
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const getSteps = () => {
    const plan = remediationPlan?.plan;
    return (
      remediationPlan?.steps ||
      plan?.steps ||
      (Array.isArray(plan?.plan) ? plan.plan : []) ||
      []
    );
  };

  const generatedDocs = useMemo(() => {
    const events = timeline?.events || [];
    const rootCause = timeline?.root_cause || 'Security incident detected.';
    const attackPattern = timeline?.attack_pattern || 'See timeline for details.';
    const blastRadius = timeline?.blast_radius || 'Unknown.';
    const steps = getSteps();
    const stepList =
      steps.map((s: any) => `- ${s.action || s.title} (${s.severity || s.risk || 'MEDIUM'})`).join('\n') ||
      '- Review incident and remediate';
    return {
      jira: {
        title: `SEC-${incidentId}`,
        content: `[SEC] Security Incident ${incidentId}

**Summary:** ${rootCause}

**Priority:** Critical
**Affected Resources:** See timeline for impacted IAM, EC2, Security Groups
**Root Cause:** ${rootCause}
**Attack Pattern:** ${attackPattern}
**Blast Radius:** ${blastRadius}

**Remediation Steps:**
${stepList}

**Assignee:** [Security Team]`,
      },
      slack: {
        title: 'Security Alert',
        content: `🚨 *Security Incident* \`${incidentId}\`
Post to #security-incidents

*Root Cause:* ${rootCause.substring(0, 200)}${rootCause.length > 200 ? '...' : ''}
*Remediation:* ${steps.length || 0} steps
<https://nova-sentinel.app/incidents/${incidentId}|View in Nova Sentinel>`,
      },
      confluence: {
        title: `Incident Postmortem: ${incidentId}`,
        content: `= Incident Postmortem: ${incidentId} =

h3. Timeline
${events.slice(0, 8).map((e: any, i: number) => `${i + 1}. ${e.timestamp || ''} - ${e.action || 'Event'} (${e.severity || 'N/A'})`).join('\n') || 'No events'}

h3. Impact Analysis
*Blast Radius:* ${blastRadius}

h3. Lessons Learned
- Review least privilege for contractor/external roles
- Enforce MFA for sensitive operations
- Monitor security group changes`,
      },
    };
  }, [timeline, remediationPlan, incidentId]);

  const effectiveDoc = useMemo(() => {
    // Unwrap: API may return { documentation: { jira, slack, confluence } }
    const raw = documentation?.documentation ?? documentation;
    const apiDoc = raw?.jira || raw?.slack || raw?.confluence ? raw : null;
    const hasApiContent = (d: any) =>
      d && (d.content || d.description || d.message) && String(d.content || d.description || d.message).trim().length > 0;
    return {
      jira: hasApiContent(apiDoc?.jira) ? apiDoc!.jira : generatedDocs.jira,
      slack: hasApiContent(apiDoc?.slack) ? apiDoc!.slack : generatedDocs.slack,
      confluence: hasApiContent(apiDoc?.confluence) ? apiDoc!.confluence : generatedDocs.confluence,
    };
  }, [documentation, generatedDocs]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const tabs = [
    { id: 'jira' as const, label: 'JIRA', icon: FileText, badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', inactive: 'bg-indigo-50/50 text-indigo-600 border-indigo-100' },
    { id: 'slack' as const, label: 'Slack', icon: MessageSquare, badge: 'bg-violet-100 text-violet-700 border-violet-200', inactive: 'bg-violet-50/50 text-violet-600 border-violet-100' },
    { id: 'confluence' as const, label: 'Confluence', icon: Book, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', inactive: 'bg-emerald-50/50 text-emerald-600 border-emerald-100' },
  ];

  const getContent = useCallback((): string => {
    const doc = effectiveDoc[activeTab];
    if (!doc) return '';
    if (typeof doc === 'string') return doc;
    // Prefer human-readable platform content; never show raw JSON
    const text = doc.content || doc.description || doc.message;
    return (text && String(text).trim()) ? String(text) : '';
  }, [effectiveDoc, activeTab]);

  const getTitle = () => {
    const doc = effectiveDoc[activeTab];
    return doc?.title || `${tabs.find(t => t.id === activeTab)?.label} - ${incidentId}`;
  };

  const handleGenerate = async () => {
    if (!onGenerateDocumentation) return;
    setGenerating(true);
    try {
      await onGenerateDocumentation();
    } finally {
      setGenerating(false);
    }
  };

  const content = getContent();
  const hasContent = content.trim().length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden max-w-4xl">
      <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <FileText className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Automated Documentation</h3>
            <p className="text-xs text-slate-500 mt-0.5">Generated by Nova 2 Lite</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full border border-violet-200">
          Nova 2 Lite
        </span>
      </div>

      {/* Tabs with platform badges — uniform width */}
      <div className="flex border-b border-slate-200 px-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 sm:flex-initial sm:min-w-[100px] px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-colors border-b-2 -mb-px rounded-t-lg ${
                isActive ? `${tab.badge} border-current` : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border truncate ${isActive ? tab.badge : tab.inactive}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-sm font-bold text-slate-900">{getTitle()}</h4>
          <div className="flex items-center gap-2">
            {onGenerateDocumentation && (
              <button
                onClick={handleGenerate}
                disabled={generating || !timeline}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> Generate Documentation</>
                )}
              </button>
            )}
            <button
              onClick={() => hasContent && copyToClipboard(content, activeTab)}
              disabled={!hasContent}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied === activeTab ? (
                <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Copied!</>
              ) : (
                <><Copy className="w-3 h-3" /> Copy</>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-64 overflow-y-auto">
          <div className="prose prose-slate prose-sm max-w-none">
            {hasContent ? (
              <FormattedDocContent text={content} />
            ) : (
              <p className="text-slate-500 text-sm">Documentation will appear here after analysis. Use &quot;Generate Documentation&quot; to create via Nova 2 Lite, or run a demo.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100">
          <button
            onClick={() => hasContent && copyToClipboard(content, activeTab)}
            disabled={!hasContent}
            title={`Copy formatted content to paste into ${tabs.find(t => t.id === activeTab)?.label}`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copied === activeTab ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Copied for {tabs.find(t => t.id === activeTab)?.label}</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy for {tabs.find(t => t.id === activeTab)?.label}</>
            )}
          </button>
          {activeTab === 'jira' && (import.meta.env.VITE_JIRA_BASE_URL as string) && (
            <a
              href={`${(import.meta.env.VITE_JIRA_BASE_URL as string).replace(/\/$/, '')}/secure/CreateIssue.jspa?summary=${encodeURIComponent(getTitle())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in JIRA
            </a>
          )}
          <button
            onClick={() => {
              if (!hasContent) return;
              const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `nova-sentinel-${activeTab}-${incidentId}-${new Date().toISOString().split('T')[0]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!hasContent}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Export Markdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentationDisplay;
