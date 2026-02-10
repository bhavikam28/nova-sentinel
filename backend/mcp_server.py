"""
Nova Sentinel MCP Server
Standards-compliant Model Context Protocol server using the real mcp package.

Uses FastMCP from the official mcp Python SDK to expose security analysis tools
as MCP-compatible services that any MCP client can discover and invoke.

pip install mcp

Run standalone: python mcp_server.py
Or mount the SSE app into FastAPI for web access.
"""
import json
import asyncio
from typing import Dict, Any, List, Optional

from mcp.server.fastmcp import FastMCP

from agents.temporal_agent import TemporalAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.voice_agent import VoiceAgent
from agents.documentation_agent import DocumentationAgent
from utils.logger import logger
from utils.mock_data import generate_crypto_mining_scenario, generate_data_exfiltration_scenario


# ========== CREATE MCP SERVER ==========
# Using the official MCP Python SDK (mcp>=1.11.0)

mcp_server = FastMCP(
    "nova-sentinel-security",
    instructions="Nova Sentinel — AI-powered AWS security analysis via Model Context Protocol. "
                 "Exposes CloudTrail analysis, risk scoring, remediation planning, and documentation generation.",
)

# ========== LAZY AGENT INITIALIZATION ==========

_agents = {}

def _get_agent(name: str):
    """Lazy-initialize agents to avoid startup overhead."""
    if name not in _agents:
        if name == "temporal":
            _agents[name] = TemporalAgent()
        elif name == "risk_scorer":
            _agents[name] = RiskScorerAgent()
        elif name == "remediation":
            _agents[name] = RemediationAgent()
        elif name == "voice":
            _agents[name] = VoiceAgent()
        elif name == "documentation":
            _agents[name] = DocumentationAgent()
    return _agents[name]


# ========== MCP TOOLS ==========
# Each tool is registered with @mcp_server.tool() from the real MCP SDK.

@mcp_server.tool()
async def analyze_security_events(events: list, incident_type: str = "Unknown") -> dict:
    """Analyze CloudTrail security events to build an attack timeline.
    
    Uses Nova 2 Lite for temporal reasoning. Identifies root cause,
    attack pattern, blast radius, and builds an ordered event timeline
    with severity classifications.
    
    Args:
        events: List of CloudTrail event objects to analyze
        incident_type: Type of incident (e.g., crypto-mining, data-exfiltration)
    """
    agent = _get_agent("temporal")
    result = await agent.analyze_timeline(events=events, incident_type=incident_type)
    return result.dict() if hasattr(result, 'dict') else result


@mcp_server.tool()
async def score_event_risk(event: dict) -> dict:
    """Score the risk level of a single CloudTrail event.
    
    Uses Nova Micro for ultra-fast (<1s) classification. Returns severity,
    confidence, risk score, and MITRE ATT&CK technique mapping.
    
    Args:
        event: A single CloudTrail event object to score
    """
    agent = _get_agent("risk_scorer")
    return await agent.score_event_risk(event)


@mcp_server.tool()
async def generate_remediation_plan(
    root_cause: str,
    attack_pattern: str,
    blast_radius: str = "Unknown",
    timeline_events: list = []
) -> dict:
    """Generate a step-by-step remediation plan for a security incident.
    
    Creates actionable steps with AWS CLI commands, IAM policy fixes,
    security group changes, and compliance-aligned recommendations.
    
    Args:
        root_cause: Root cause of the incident
        attack_pattern: Identified attack pattern
        blast_radius: Scope of impact
        timeline_events: Timeline events from analysis
    """
    agent = _get_agent("remediation")
    return await agent.generate_remediation_plan(
        incident_analysis={"timeline": {}},
        root_cause=root_cause,
        attack_pattern=attack_pattern,
        blast_radius=blast_radius,
        timeline_events=timeline_events
    )


@mcp_server.tool()
async def query_incident(query: str, incident_context: dict = {}) -> dict:
    """Ask a natural language question about a security incident.
    
    Processes conversational queries about attack patterns, timelines,
    remediation steps, compliance impacts, and cost estimates.
    
    Args:
        query: Natural language question about the incident
        incident_context: Current incident data for context
    """
    agent = _get_agent("voice")
    return await agent.process_voice_query(
        query_text=query,
        incident_context=incident_context if incident_context else None
    )


@mcp_server.tool()
async def generate_documentation(
    incident_id: str,
    timeline: dict,
    remediation_plan: dict = {}
) -> dict:
    """Generate incident documentation for JIRA, Slack, and Confluence.
    
    Creates structured, platform-ready documentation including JIRA tickets,
    Slack notifications, and Confluence post-mortem pages.
    
    Args:
        incident_id: Incident identifier
        timeline: Analysis timeline data
        remediation_plan: Generated remediation plan
    """
    agent = _get_agent("documentation")
    return await agent.generate_documentation(
        incident_id=incident_id,
        incident_analysis={"timeline": timeline},
        timeline=timeline,
        remediation_plan=remediation_plan if remediation_plan else None
    )


@mcp_server.tool()
async def list_demo_scenarios() -> dict:
    """List available demo security scenarios for testing.
    
    Returns a list of pre-built CloudTrail event scenarios that demonstrate
    different attack types for evaluation and testing purposes.
    """
    return {
        "scenarios": [
            {
                "id": "crypto-mining",
                "name": "Crypto Mining Attack",
                "severity": "CRITICAL",
                "description": "Unauthorized EC2 instances running cryptocurrency miners"
            },
            {
                "id": "data-exfiltration",
                "name": "Data Exfiltration via S3",
                "severity": "CRITICAL",
                "description": "Sensitive data being exfiltrated through S3 bucket manipulation"
            },
        ]
    }


@mcp_server.tool()
async def get_demo_events(scenario: str) -> dict:
    """Get CloudTrail events for a specific demo scenario.
    
    Returns a set of realistic CloudTrail events that simulate the specified
    attack scenario for demonstration and testing purposes.
    
    Args:
        scenario: Demo scenario name (crypto-mining, data-exfiltration)
    """
    if scenario == "crypto-mining":
        events = generate_crypto_mining_scenario()
    elif scenario == "data-exfiltration":
        events = generate_data_exfiltration_scenario()
    else:
        events = generate_crypto_mining_scenario()
    
    return {"scenario": scenario, "events": events}


# ========== MCP RESOURCES ==========

@mcp_server.resource("nova-sentinel://models")
async def get_models() -> str:
    """List all Nova AI models used by Nova Sentinel."""
    models = {
        "models": [
            {"id": "amazon.nova-2-lite-v1:0", "name": "Nova 2 Lite", "role": "Temporal Analysis, Documentation, Remediation"},
            {"id": "amazon.nova-pro-v1:0", "name": "Nova Pro", "role": "Multimodal Visual Analysis"},
            {"id": "amazon.nova-micro-v1:0", "name": "Nova Micro", "role": "Fast Risk Classification"},
            {"id": "amazon.nova-2-sonic-v1:0", "name": "Nova 2 Sonic", "role": "Voice Interaction"},
            {"id": "amazon.nova-canvas-v1:0", "name": "Nova Canvas", "role": "Visual Report Generation"},
        ]
    }
    return json.dumps(models, indent=2)


@mcp_server.resource("nova-sentinel://architecture")
async def get_architecture() -> str:
    """Describe Nova Sentinel's multi-agent architecture."""
    arch = {
        "name": "Nova Sentinel",
        "framework": "Strands Agents SDK + MCP Server",
        "pipeline": [
            "1. DETECT — CloudTrail event ingestion + Nova 2 Lite temporal analysis",
            "2. INVESTIGATE — Nova Pro multimodal architecture analysis",
            "3. CLASSIFY — Nova Micro fast risk scoring (<1s per event)",
            "4. REMEDIATE — Nova 2 Lite remediation plans + Nova Act browser automation",
            "5. DOCUMENT — Nova 2 Lite JIRA/Slack/Confluence documentation",
        ]
    }
    return json.dumps(arch, indent=2)


# ========== SERVER INFO (for REST API compatibility) ==========

MCP_SERVER_INFO = {
    "name": "nova-sentinel-mcp",
    "version": "2.0.0",
    "description": "Nova Sentinel Security Analysis MCP Server — Real MCP SDK implementation",
    "sdk": "mcp>=1.11.0 (FastMCP)",
    "capabilities": {
        "tools": True,
        "resources": True,
    },
    "models_used": [
        "amazon.nova-2-lite-v1:0 (Temporal Analysis, Documentation)",
        "amazon.nova-pro-v1:0 (Visual Architecture Analysis)",
        "amazon.nova-micro-v1:0 (Risk Classification)",
        "amazon.nova-2-sonic-v1:0 (Voice Interaction)",
        "amazon.nova-canvas-v1:0 (Visual Report Generation)",
    ]
}


# ========== STANDALONE EXECUTION ==========

if __name__ == "__main__":
    print(json.dumps(MCP_SERVER_INFO, indent=2))
    print(f"\nMCP Server: {mcp_server.name}")
    print(f"Running with real mcp SDK (FastMCP)")
    # Run the MCP server with stdio transport
    mcp_server.run()
