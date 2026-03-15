/**
 * Default demo scenarios — always shown in demo mode.
 * Used as initial state and fallback when backend /api/demo/scenarios is unavailable.
 */
import type { DemoScenario } from '../types/incident';

export const DEFAULT_DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'privilege-escalation',
    name: 'IAM Privilege Escalation',
    description: 'Contractor abuses AssumeRole chain to gain AdministratorAccess — triggers MITRE T1098, T1078. Full kill chain: recon → pivot → persistence.',
    severity: 'CRITICAL',
    event_count: 9,
  },
  {
    id: 'organizations-breach',
    name: 'AWS Organizations Cross-Account Breach',
    description: 'Compromised role in a Dev account pivots via STS AssumeRole into Production and Security accounts — lateral movement across 3 OUs, 12 member accounts. wolfir detects and contains with org-wide SCPs.',
    severity: 'CRITICAL',
    event_count: 18,
  },
  {
    id: 'shadow-ai',
    name: 'Shadow AI / LLM Abuse',
    description: 'Ungoverned Bedrock InvokeModel calls + prompt injection attempt. Exercises the MITRE ATLAS self-monitoring pipeline — unique to wolfir.',
    severity: 'CRITICAL',
    event_count: 7,
  },
];
