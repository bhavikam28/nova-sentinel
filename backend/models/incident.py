"""
Pydantic models for security incidents and analysis
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class SeverityLevel(str, Enum):
    """Incident severity levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, Enum):
    """Incident lifecycle status"""
    DETECTED = "DETECTED"
    ANALYZING = "ANALYZING"
    ANALYZED = "ANALYZED"
    REMEDIATING = "REMEDIATING"
    REMEDIATED = "REMEDIATED"
    DOCUMENTED = "DOCUMENTED"
    CLOSED = "CLOSED"


class TimelineEvent(BaseModel):
    """A single event in the incident timeline"""
    timestamp: datetime
    actor: str
    action: str
    resource: str
    details: Optional[str] = None
    significance: Optional[str] = None
    severity: Optional[SeverityLevel] = None
    raw_event: Optional[Dict[str, Any]] = None


class Timeline(BaseModel):
    """Complete timeline analysis of an incident"""
    events: List[TimelineEvent]
    root_cause: Optional[str] = None
    attack_pattern: Optional[str] = None
    blast_radius: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    analysis_summary: Optional[str] = None


class CloudTrailEvent(BaseModel):
    """CloudTrail event structure"""
    eventTime: str
    eventName: str
    userIdentity: Dict[str, Any]
    requestParameters: Optional[Dict[str, Any]] = None
    responseElements: Optional[Dict[str, Any]] = None
    sourceIPAddress: Optional[str] = None
    resources: Optional[List[Dict[str, Any]]] = None
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None


class AnalysisRequest(BaseModel):
    """Request to analyze CloudTrail events"""
    events: List[Dict[str, Any]]
    incident_type: Optional[str] = None
    resource_id: Optional[str] = None


class AnalysisResponse(BaseModel):
    """Response from timeline analysis"""
    incident_id: str
    timeline: Timeline
    analysis_time_ms: int
    model_used: str


class Incident(BaseModel):
    """Complete incident record"""
    incident_id: str
    title: str
    description: str
    severity: SeverityLevel
    status: IncidentStatus
    detected_at: datetime
    timeline: Optional[Timeline] = None
    metadata: Optional[Dict[str, Any]] = None
