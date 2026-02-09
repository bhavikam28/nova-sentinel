"""
Documentation API endpoints (Nova Act)
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional
from agents.documentation_agent import DocumentationAgent
from utils.logger import logger

router = APIRouter(prefix="/api/documentation", tags=["documentation"])
doc_agent = DocumentationAgent()


@router.post("/generate")
async def generate_documentation(
    incident_id: str = Body(..., embed=True),
    incident_analysis: Dict[str, Any] = Body(..., embed=True),
    timeline: Optional[Dict[str, Any]] = Body(None, embed=True),
    remediation_plan: Optional[Dict[str, Any]] = Body(None, embed=True),
    context: Optional[str] = Body(None, embed=True)
) -> Dict[str, Any]:
    """
    Generate automated documentation for JIRA, Slack, and Confluence
    """
    logger.info(f"Received request to generate documentation for incident {incident_id}")
    try:
        docs = await doc_agent.generate_documentation(
            incident_id=incident_id,
            incident_analysis=incident_analysis,
            timeline=timeline,
            remediation_plan=remediation_plan,
            context=context
        )
        return docs
    except Exception as e:
        logger.error(f"Error generating documentation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate documentation: {str(e)}")


@router.post("/jira")
async def generate_jira_ticket(
    incident_id: str = Body(..., embed=True),
    incident_analysis: Dict[str, Any] = Body(..., embed=True),
    timeline: Optional[Dict[str, Any]] = Body(None, embed=True)
) -> Dict[str, Any]:
    """Generate JIRA ticket content"""
    try:
        ticket = await doc_agent.generate_jira_ticket(incident_id, incident_analysis, timeline)
        return ticket
    except Exception as e:
        logger.error(f"Error generating JIRA ticket: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate JIRA ticket: {str(e)}")


@router.post("/slack")
async def generate_slack_message(
    incident_id: str = Body(..., embed=True),
    incident_analysis: Dict[str, Any] = Body(..., embed=True),
    timeline: Optional[Dict[str, Any]] = Body(None, embed=True)
) -> Dict[str, Any]:
    """Generate Slack notification"""
    try:
        message = await doc_agent.generate_slack_message(incident_id, incident_analysis, timeline)
        return message
    except Exception as e:
        logger.error(f"Error generating Slack message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate Slack message: {str(e)}")


@router.post("/confluence")
async def generate_confluence_page(
    incident_id: str = Body(..., embed=True),
    incident_analysis: Dict[str, Any] = Body(..., embed=True),
    timeline: Optional[Dict[str, Any]] = Body(None, embed=True)
) -> Dict[str, Any]:
    """Generate Confluence page content"""
    try:
        page = await doc_agent.generate_confluence_page(incident_id, incident_analysis, timeline)
        return page
    except Exception as e:
        logger.error(f"Error generating Confluence page: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate Confluence page: {str(e)}")


@router.get("/health")
async def health_check() -> Dict[str, str]:
    return {"status": "healthy", "service": "documentation-api"}
