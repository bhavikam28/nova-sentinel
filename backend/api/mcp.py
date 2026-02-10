"""
MCP Server API endpoints
Exposes Nova Sentinel security tools via Model Context Protocol.

Two interfaces:
1. Standard MCP SSE endpoint (mounted at /mcp/) — for MCP-compatible clients
2. REST API endpoints (at /api/mcp/) — for our frontend and direct API access

Uses the real mcp package (FastMCP) and real strands-agents SDK.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel

from mcp_server import MCP_SERVER_INFO, mcp_server
from agents.strands_orchestrator import StrandsOrchestrator, STRANDS_TOOLS
from utils.logger import logger

router = APIRouter(prefix="/api/mcp", tags=["mcp"])

# Initialize Strands orchestrator (uses real strands-agents SDK)
strands = StrandsOrchestrator()


class ToolCallRequest(BaseModel):
    """Request to call an MCP tool"""
    tool_name: str
    arguments: Dict[str, Any] = {}


class StrandsAnalysisRequest(BaseModel):
    """Request for Strands-orchestrated analysis"""
    events: List[Dict[str, Any]]
    incident_type: str = "Unknown"
    voice_query: str = None


class StrandsQueryRequest(BaseModel):
    """Request for interactive Strands Agent query"""
    prompt: str


@router.get("/server-info")
async def get_server_info() -> Dict[str, Any]:
    """
    Get MCP server information and capabilities.
    
    Returns server metadata, available tools, supported models,
    and SDK version information.
    """
    return {
        **MCP_SERVER_INFO,
        "strands_tools": len(STRANDS_TOOLS),
        "strands_sdk": "strands-agents (real)",
        "mcp_sdk": "mcp (FastMCP, real)",
    }


@router.get("/tools")
async def list_tools() -> Dict[str, Any]:
    """
    List all available MCP tools.
    
    Returns tool definitions from both the MCP server and Strands agent.
    """
    return {
        "mcp_server": mcp_server.name,
        "mcp_sdk": "mcp>=1.11.0",
        "strands_sdk": "strands-agents",
        "tools": strands.get_registered_tools(),
        "count": len(STRANDS_TOOLS),
    }


@router.post("/call-tool")
async def tool_call(request: ToolCallRequest) -> Dict[str, Any]:
    """
    Call an MCP tool by name via REST API.
    
    This provides REST access to the same tools exposed via the MCP SSE endpoint.
    """
    try:
        logger.info(f"MCP REST tool call: {request.tool_name}")
        
        # Map tool names to MCP server tools
        from mcp_server import (
            analyze_security_events,
            score_event_risk,
            generate_remediation_plan,
            query_incident,
            generate_documentation,
            list_demo_scenarios,
            get_demo_events,
        )
        
        tool_map = {
            "analyze_security_events": analyze_security_events,
            "score_event_risk": score_event_risk,
            "generate_remediation_plan": generate_remediation_plan,
            "query_incident": query_incident,
            "generate_documentation": generate_documentation,
            "list_demo_scenarios": list_demo_scenarios,
            "get_demo_events": get_demo_events,
        }
        
        handler = tool_map.get(request.tool_name)
        if not handler:
            raise ValueError(f"Unknown tool: {request.tool_name}")
        
        result = await handler(**request.arguments)
        return {
            "tool": request.tool_name,
            "result": result,
            "status": "success",
            "sdk": "mcp (FastMCP)"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"MCP tool call failed: {e}")
        raise HTTPException(status_code=500, detail=f"Tool execution failed: {str(e)}")


@router.get("/strands/tools")
async def list_strands_tools() -> Dict[str, Any]:
    """
    List all Strands agent tools registered with the orchestrator.
    
    These are the same tools decorated with @tool from strands-agents SDK.
    """
    return {
        "framework": "strands-agents",
        "sdk": "strands-agents (real)",
        "tools": strands.get_registered_tools(),
        "count": len(STRANDS_TOOLS),
    }


@router.post("/strands/analyze")
async def strands_analyze(request: StrandsAnalysisRequest) -> Dict[str, Any]:
    """
    Run full Strands-orchestrated multi-agent analysis.
    
    The Strands orchestrator executes tools in dependency order,
    using the real @tool-decorated functions from the strands-agents SDK.
    """
    try:
        logger.info(f"Strands analysis: {len(request.events)} events, type={request.incident_type}")
        
        result = await strands.plan_and_execute(
            events=request.events,
            incident_type=request.incident_type,
            voice_query=request.voice_query
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Strands analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/strands/query")
async def strands_query(request: StrandsQueryRequest) -> Dict[str, Any]:
    """
    Interactive query using the Strands Agent.
    
    The Agent autonomously decides which tools to call based on the prompt.
    This demonstrates real agentic behavior — the Agent plans and executes on its own.
    """
    try:
        logger.info(f"Strands agent query: {request.prompt[:100]}...")
        
        response = await strands.agent_query(request.prompt)
        
        return {
            "response": response,
            "framework": "strands-agents",
            "mode": "autonomous",
        }
        
    except Exception as e:
        logger.error(f"Strands agent query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent query failed: {str(e)}")


@router.get("/strands/history")
async def strands_execution_history() -> Dict[str, Any]:
    """Get Strands agent execution history."""
    return {
        "history": strands.get_execution_history(),
        "count": len(strands.get_execution_history())
    }


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check for MCP and Strands services."""
    return {
        "status": "healthy",
        "mcp_server": mcp_server.name,
        "mcp_sdk": "mcp>=1.11.0 (FastMCP)",
        "strands_sdk": "strands-agents (real)",
        "strands_tools": len(STRANDS_TOOLS),
        "models": MCP_SERVER_INFO["models_used"],
    }
