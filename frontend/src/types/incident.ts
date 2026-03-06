/**
 * TypeScript types for incidents and timeline analysis
 */

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 
  | 'DETECTED' 
  | 'ANALYZING' 
  | 'ANALYZED' 
  | 'REMEDIATING' 
  | 'REMEDIATED' 
  | 'DOCUMENTED' 
  | 'CLOSED';

export interface TimelineEvent {
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details?: string;
  significance?: string;
  severity?: SeverityLevel;
  raw_event?: any;
}

export interface Timeline {
  events: TimelineEvent[];
  root_cause?: string;
  attack_pattern?: string;
  blast_radius?: string;
  confidence: number;
  analysis_summary?: string;
}

export interface AnalysisRequest {
  events: any[];
  incident_type?: string;
  resource_id?: string;
}

export interface AnalysisResponse {
  incident_id: string;
  timeline: Timeline;
  analysis_time_ms: number;
  model_used: string;
}

export type AgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface AgentState {
  status: AgentStatus;
  started_at?: string;
  error?: string;
  reason?: string;
  model?: string;
}

export interface OrchestrationResponse {
  incident_id: string;
  status: 'completed' | 'failed' | 'running';
  analysis_time_ms: number;
  model_used?: string;
  agents: {
    temporal?: AgentState;
    visual?: AgentState;
    risk_scorer?: AgentState;
    remediation?: AgentState;
    documentation?: AgentState;
  };
  results: {
    timeline?: Timeline;
    visual?: any;
    risk_scores?: Array<{ event: string; risk?: any; risk_score?: number }>;
    remediation_plan?: any;
    documentation?: any;
    correlation?: {
      correlation_summary: string;
      campaign_probability: number;
      pattern_matches?: number;
      technique_overlaps?: number;
    };
  };
  metadata?: {
    incident_type?: string;
    [key: string]: any;
  };
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  event_count: number;
}
