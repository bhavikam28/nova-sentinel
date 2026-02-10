"""
Strands Agents SDK Orchestrator for Nova Sentinel
Uses the REAL strands-agents package for multi-agent security analysis.

Each security capability is registered as a Strands @tool.
The Strands Agent uses Amazon Nova 2 Lite to plan and execute
the optimal sequence of tools based on the incident context.

pip install strands-agents strands-agents-tools
"""
import json
import time
import uuid
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime

from strands import Agent
from strands.tools import tool

from agents.temporal_agent import TemporalAgent
from agents.visual_agent import VisualAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.voice_agent import VoiceAgent
from agents.documentation_agent import DocumentationAgent
from utils.logger import logger


# ========== ASYNC BRIDGE ==========
# Strands tools are synchronous. Our agents use async Bedrock calls.
# This bridge runs async code in a fresh event loop within the thread.

def _run_async(coro):
    """Run an async coroutine from a synchronous Strands tool context."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ========== SHARED AGENT INSTANCES ==========
# Pre-initialize agents to avoid recreating Bedrock clients per tool call.

_temporal_agent = None
_risk_scorer_agent = None
_remediation_agent = None
_documentation_agent = None
_voice_agent = None
_visual_agent = None


def _get_agents():
    """Lazy-initialize agents on first use."""
    global _temporal_agent, _risk_scorer_agent, _remediation_agent
    global _documentation_agent, _voice_agent, _visual_agent
    
    if _temporal_agent is None:
        _temporal_agent = TemporalAgent()
        _risk_scorer_agent = RiskScorerAgent()
        _remediation_agent = RemediationAgent()
        _documentation_agent = DocumentationAgent()
        _voice_agent = VoiceAgent()
        _visual_agent = VisualAgent()
    
    return {
        "temporal": _temporal_agent,
        "risk_scorer": _risk_scorer_agent,
        "remediation": _remediation_agent,
        "documentation": _documentation_agent,
        "voice": _voice_agent,
        "visual": _visual_agent,
    }


# ========== STRANDS TOOLS ==========
# Each tool is decorated with @tool from the real strands-agents SDK.
# These tools wrap our existing Nova-powered agents.

@tool
def analyze_security_timeline(events_json: str, incident_type: str = "Unknown") -> str:
    """Analyze CloudTrail security events to build an attack timeline.
    
    Identifies root cause, attack pattern, and blast radius using Nova 2 Lite
    for temporal reasoning across event sequences.
    
    Args:
        events_json: JSON string of CloudTrail events to analyze
        incident_type: Type of incident (crypto-mining, data-exfiltration, etc.)
    
    Returns:
        JSON string with timeline analysis including root_cause, attack_pattern,
        blast_radius, confidence score, and ordered events with severity levels.
    """
    agents = _get_agents()
    events = json.loads(events_json) if isinstance(events_json, str) else events_json
    
    result = _run_async(agents["temporal"].analyze_timeline(
        events=events,
        incident_type=incident_type
    ))
    
    return json.dumps(result.dict() if hasattr(result, 'dict') else result)


@tool
def score_event_risk(event_json: str) -> str:
    """Score the risk level of a single CloudTrail security event.
    
    Uses Nova Micro for ultra-fast (<1s) threat classification with
    severity rating, confidence score, and MITRE ATT&CK mapping.
    
    Args:
        event_json: JSON string of a single CloudTrail event
    
    Returns:
        JSON string with risk_level, severity, confidence, and mitre_mapping.
    """
    agents = _get_agents()
    event = json.loads(event_json) if isinstance(event_json, str) else event_json
    
    result = _run_async(agents["risk_scorer"].score_event_risk(event))
    return json.dumps(result)


@tool
def generate_remediation(root_cause: str, attack_pattern: str, 
                         blast_radius: str = "Unknown",
                         timeline_events_json: str = "[]") -> str:
    """Generate a step-by-step remediation plan for a security incident.
    
    Creates actionable remediation steps with specific AWS CLI commands,
    IAM policy fixes, and compliance-aligned recommendations.
    
    Args:
        root_cause: Root cause of the incident
        attack_pattern: Identified attack pattern
        blast_radius: Scope of impact
        timeline_events_json: JSON string of timeline events
    
    Returns:
        JSON string with ordered remediation steps, AWS CLI commands, and priorities.
    """
    agents = _get_agents()
    timeline_events = json.loads(timeline_events_json) if isinstance(timeline_events_json, str) else timeline_events_json
    
    result = _run_async(agents["remediation"].generate_remediation_plan(
        incident_analysis={"timeline": {}},
        root_cause=root_cause,
        attack_pattern=attack_pattern,
        blast_radius=blast_radius,
        timeline_events=timeline_events
    ))
    return json.dumps(result)


@tool
def generate_incident_documentation(incident_id: str, timeline_json: str,
                                     remediation_json: str = "{}") -> str:
    """Generate incident documentation for JIRA, Slack, and Confluence.
    
    Creates structured documentation including JIRA ticket content,
    Slack notification messages, and Confluence post-mortem pages.
    
    Args:
        incident_id: Incident identifier
        timeline_json: JSON string of timeline analysis
        remediation_json: JSON string of remediation plan
    
    Returns:
        JSON string with documentation for jira, slack, and confluence platforms.
    """
    agents = _get_agents()
    timeline = json.loads(timeline_json) if isinstance(timeline_json, str) else timeline_json
    remediation = json.loads(remediation_json) if isinstance(remediation_json, str) else remediation_json
    
    result = _run_async(agents["documentation"].generate_documentation(
        incident_id=incident_id,
        incident_analysis={"timeline": timeline},
        timeline=timeline,
        remediation_plan=remediation
    ))
    return json.dumps(result)


@tool
def query_security_incident(query: str, incident_context_json: str = "{}") -> str:
    """Answer natural language questions about a security incident.
    
    Processes conversational queries about attack patterns, timelines,
    remediation options, compliance impacts, and cost estimates.
    
    Args:
        query: Natural language question about the incident
        incident_context_json: JSON string of current incident data
    
    Returns:
        JSON string with response_text, action, severity_assessment, and suggestions.
    """
    agents = _get_agents()
    context = json.loads(incident_context_json) if isinstance(incident_context_json, str) else incident_context_json
    
    result = _run_async(agents["voice"].process_voice_query(
        query_text=query,
        incident_context=context if context else None
    ))
    return json.dumps(result)


# ========== ALL STRANDS TOOLS ==========
STRANDS_TOOLS = [
    analyze_security_timeline,
    score_event_risk,
    generate_remediation,
    generate_incident_documentation,
    query_security_incident,
]


# ========== STRANDS AGENT ==========

SYSTEM_PROMPT = """You are Nova Sentinel's security orchestrator, powered by Amazon Nova 2 Lite.

You coordinate multiple AI-powered security tools to analyze AWS CloudTrail incidents:

1. **analyze_security_timeline** — Build attack timeline from CloudTrail events (Nova 2 Lite)
2. **score_event_risk** — Fast risk scoring per event (Nova Micro)
3. **generate_remediation** — Step-by-step remediation plans (Nova 2 Lite)
4. **generate_incident_documentation** — JIRA/Slack/Confluence docs (Nova 2 Lite)
5. **query_security_incident** — Answer questions about incidents (Nova 2 Lite)

When analyzing an incident:
- Always start with analyze_security_timeline to understand the attack
- Then score individual high-risk events with score_event_risk
- Generate remediation based on the timeline findings
- Create documentation for the incident response team

Be concise, actionable, and security-focused in your responses."""


def create_strands_agent() -> Agent:
    """Create a Strands Agent with all security tools registered."""
    return Agent(
        model="amazon.nova-2-lite-v1:0",
        tools=STRANDS_TOOLS,
        system_prompt=SYSTEM_PROMPT,
    )


# ========== ORCHESTRATOR CLASS ==========
# Wraps the Strands Agent for integration with our FastAPI backend.

class StrandsOrchestrator:
    """
    Production orchestrator using the real Strands Agents SDK.
    
    Provides two modes:
    1. Pipeline mode — deterministic tool execution for the demo
    2. Agent mode — let the Strands Agent plan and execute autonomously
    """
    
    def __init__(self):
        self.execution_history: List[Dict[str, Any]] = []
        self._agent = None
        logger.info("StrandsOrchestrator initialized with real strands-agents SDK")
    
    @property
    def agent(self) -> Agent:
        """Lazy-initialize the Strands Agent."""
        if self._agent is None:
            self._agent = create_strands_agent()
            logger.info("Strands Agent created with tools: " + 
                        ", ".join(t.tool_name if hasattr(t, 'tool_name') else str(t) for t in STRANDS_TOOLS))
        return self._agent
    
    async def plan_and_execute(
        self,
        events: List[Dict[str, Any]],
        diagram_data: Optional[bytes] = None,
        incident_type: Optional[str] = None,
        voice_query: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute deterministic pipeline using Strands tools.
        
        Calls each tool directly in dependency order for predictable demo behavior.
        Uses the same @tool-decorated functions that the Strands Agent would use.
        """
        incident_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
        start_time = time.time()
        
        logger.info(f"[{incident_id}] Strands pipeline: starting deterministic execution")
        
        state = {
            "incident_id": incident_id,
            "status": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
            "tools": {},
            "results": {},
        }
        
        # Step 1: Temporal Analysis (Nova 2 Lite)
        logger.info(f"[{incident_id}] Step 1: analyze_security_timeline")
        state["tools"]["temporal"] = {"status": "RUNNING", "model": "amazon.nova-2-lite-v1:0"}
        try:
            timeline_json = await asyncio.to_thread(
                analyze_security_timeline,
                events_json=json.dumps(events),
                incident_type=incident_type or "Unknown"
            )
            timeline = json.loads(timeline_json)
            state["tools"]["temporal"]["status"] = "COMPLETED"
            state["results"]["timeline"] = timeline
        except Exception as e:
            logger.error(f"[{incident_id}] Timeline failed: {e}")
            state["tools"]["temporal"] = {"status": "FAILED", "error": str(e)}
        
        # Step 2: Risk Scoring (Nova Micro)
        logger.info(f"[{incident_id}] Step 2: score_event_risk")
        state["tools"]["risk_scorer"] = {"status": "RUNNING", "model": "amazon.nova-micro-v1:0"}
        try:
            critical_events = events[:5] if len(events) > 5 else events
            risk_scores = []
            for event in critical_events:
                try:
                    score_json = await asyncio.to_thread(
                        score_event_risk,
                        event_json=json.dumps(event)
                    )
                    risk_scores.append({
                        "event": event.get("eventName", "Unknown"),
                        "risk": json.loads(score_json)
                    })
                except Exception as e:
                    logger.warning(f"Risk scoring failed for event: {e}")
            state["tools"]["risk_scorer"]["status"] = "COMPLETED"
            state["results"]["risk_scores"] = risk_scores
        except Exception as e:
            logger.error(f"[{incident_id}] Risk scoring failed: {e}")
            state["tools"]["risk_scorer"] = {"status": "FAILED", "error": str(e)}
        
        # Step 3: Remediation (Nova 2 Lite) — depends on timeline
        if state["results"].get("timeline"):
            logger.info(f"[{incident_id}] Step 3: generate_remediation")
            state["tools"]["remediation"] = {"status": "RUNNING", "model": "amazon.nova-2-lite-v1:0"}
            try:
                tl = state["results"]["timeline"]
                remediation_json = await asyncio.to_thread(
                    generate_remediation,
                    root_cause=tl.get("root_cause", "Unknown"),
                    attack_pattern=tl.get("attack_pattern", "Unknown"),
                    blast_radius=tl.get("blast_radius", "Unknown"),
                    timeline_events_json=json.dumps(tl.get("events", []))
                )
                state["tools"]["remediation"]["status"] = "COMPLETED"
                state["results"]["remediation_plan"] = json.loads(remediation_json)
            except Exception as e:
                logger.error(f"[{incident_id}] Remediation failed: {e}")
                state["tools"]["remediation"] = {"status": "FAILED", "error": str(e)}
        
        # Step 4: Documentation (Nova 2 Lite) — depends on timeline + remediation
        if state["results"].get("timeline") and state["results"].get("remediation_plan"):
            logger.info(f"[{incident_id}] Step 4: generate_incident_documentation")
            state["tools"]["documentation"] = {"status": "RUNNING", "model": "amazon.nova-2-lite-v1:0"}
            try:
                docs_json = await asyncio.to_thread(
                    generate_incident_documentation,
                    incident_id=incident_id,
                    timeline_json=json.dumps(state["results"]["timeline"]),
                    remediation_json=json.dumps(state["results"]["remediation_plan"])
                )
                state["tools"]["documentation"]["status"] = "COMPLETED"
                state["results"]["documentation"] = json.loads(docs_json)
            except Exception as e:
                logger.error(f"[{incident_id}] Documentation failed: {e}")
                state["tools"]["documentation"] = {"status": "FAILED", "error": str(e)}
        
        # Finalize
        total_time = int((time.time() - start_time) * 1000)
        
        self.execution_history.append({
            "incident_id": incident_id,
            "tools_executed": list(state["tools"].keys()),
            "timestamp": datetime.utcnow().isoformat(),
            "total_time_ms": total_time,
        })
        
        logger.info(f"[{incident_id}] Strands pipeline complete in {total_time}ms")
        
        return {
            "incident_id": incident_id,
            "status": "completed",
            "analysis_time_ms": total_time,
            "agents": state["tools"],
            "results": state["results"],
            "model_used": "strands-agents-orchestration",
            "metadata": {
                "incident_type": incident_type,
                "tools_used": list(state["tools"].keys()),
                "framework": "strands-agents",
                "sdk_version": "real",
            }
        }
    
    async def agent_query(self, prompt: str) -> str:
        """
        Use the Strands Agent for interactive queries.
        
        The Agent autonomously decides which tools to call based on the prompt.
        This is real agentic behavior — the Agent plans and executes on its own.
        """
        try:
            # Run the Strands Agent in a thread (it's synchronous)
            result = await asyncio.to_thread(self.agent, prompt)
            return str(result)
        except Exception as e:
            logger.error(f"Strands agent query failed: {e}")
            return f"Agent error: {str(e)}"
    
    def get_registered_tools(self) -> List[Dict[str, Any]]:
        """Get all registered Strands tools with their schemas."""
        tools_info = []
        for t in STRANDS_TOOLS:
            name = t.tool_name if hasattr(t, 'tool_name') else t.__name__
            doc = t.__doc__ or ""
            tools_info.append({
                "name": name,
                "description": doc.strip().split("\n")[0] if doc else "",
                "framework": "strands-agents",
            })
        return tools_info
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get execution history."""
        return self.execution_history
