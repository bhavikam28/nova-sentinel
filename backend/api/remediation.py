"""
Remediation API endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from agents.remediation_agent import RemediationAgent
from utils.logger import logger

router = APIRouter(prefix="/api/remediation", tags=["remediation"])
remediation_agent = RemediationAgent()


@router.post("/generate-plan")
async def generate_plan(
    incident_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate a remediation plan for a security incident
    
    Args:
        incident_analysis: Full incident analysis with timeline, root cause, etc.
        
    Returns:
        Remediation plan with steps and validation
    """
    try:
        logger.info("Received remediation plan generation request")
        
        # Extract required fields
        timeline = incident_analysis.get("timeline", {})
        root_cause = timeline.get("root_cause", "Unknown")
        attack_pattern = timeline.get("attack_pattern", "Unknown")
        blast_radius = timeline.get("blast_radius", "Unknown")
        events = timeline.get("events", [])
        
        # Generate plan
        plan = await remediation_agent.generate_remediation_plan(
            incident_analysis=incident_analysis,
            root_cause=root_cause,
            attack_pattern=attack_pattern,
            blast_radius=blast_radius,
            timeline_events=events
        )
        
        return plan
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error generating remediation plan: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Remediation plan generation failed: {str(e)}"
        )


@router.post("/validate-plan")
async def validate_plan(
    plan: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Validate a remediation plan for safety and compliance
    
    Args:
        plan: Remediation plan to validate
        
    Returns:
        Validation results
    """
    try:
        logger.info(f"Validating remediation plan: {plan.get('plan_id', 'Unknown')}")
        
        validation = await remediation_agent.validate_plan(plan)
        
        return validation
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error validating plan: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Plan validation failed: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "remediation-api",
        "model": "amazon.nova-lite-v1:0"
    }
