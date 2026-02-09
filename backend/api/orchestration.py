"""
Orchestration API endpoints
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, Optional, List

from agents.orchestrator import Orchestrator
from utils.logger import logger

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])
orchestrator = Orchestrator()


@router.post("/analyze-incident")
async def analyze_incident(
    events: str = Form(...),  # JSON string of events
    diagram: Optional[UploadFile] = File(None),
    incident_type: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Orchestrate full incident analysis using multiple agents
    
    This endpoint coordinates:
    - Temporal Agent (Nova 2 Lite) for timeline analysis
    - Visual Agent (Nova Pro) for diagram analysis (if provided)
    - Risk Scorer (Nova Micro) for risk assessment
    - Remediation Agent for plan generation
    
    Args:
        events: JSON string of CloudTrail events
        diagram: Optional architecture diagram image
        incident_type: Type of incident
        
    Returns:
        Complete analysis with all agent outputs
    """
    try:
        import json
        
        # Parse events
        try:
            events_list = json.loads(events)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail="events must be valid JSON"
            )
        
        # Read diagram if provided
        diagram_data = None
        diagram_s3_key = None
        if diagram:
            if not diagram.content_type or not diagram.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail="Diagram must be an image file"
                )
            diagram_data = await diagram.read()
            
            # Upload diagram to S3 before analysis
            from services.s3_service import S3Service
            s3_service = S3Service()
            # We'll upload after we get the incident_id from orchestration
        
        logger.info(f"Starting orchestrated incident analysis ({len(events_list)} events, diagram: {diagram is not None})")
        
        # Run orchestrated analysis
        result = await orchestrator.analyze_incident(
            events=events_list,
            diagram_data=diagram_data,
            incident_type=incident_type
        )
        
        # Upload diagram to S3 if provided (now that we have incident_id)
        if diagram and diagram_data:
            try:
                from services.s3_service import S3Service
                s3_service = S3Service()
                diagram_s3_key = await s3_service.upload_diagram(
                    incident_id=result["incident_id"],
                    diagram_data=diagram_data,
                    filename=diagram.filename,
                    content_type=diagram.content_type
                )
                if diagram_s3_key:
                    result["diagram_s3_key"] = diagram_s3_key
            except Exception as e:
                logger.warning(f"Failed to upload diagram to S3: {e}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in orchestrated analysis: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Orchestrated analysis failed: {str(e)}"
        )


@router.get("/incident/{incident_id}")
async def get_incident_state(incident_id: str) -> Dict[str, Any]:
    """
    Get current state of an incident analysis
    
    Args:
        incident_id: Incident ID
        
    Returns:
        Current state and progress
    """
    try:
        state = orchestrator.get_incident_state(incident_id)
        
        if not state:
            raise HTTPException(
                status_code=404,
                detail=f"Incident {incident_id} not found"
            )
        
        return state
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting incident state: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get incident state: {str(e)}"
        )


@router.get("/incidents")
async def list_incidents() -> Dict[str, Any]:
    """
    List all active incidents
    
    Returns:
        List of active incidents
    """
    try:
        incidents = orchestrator.list_active_incidents()
        
        return {
            "count": len(incidents),
            "incidents": incidents
        }
        
    except Exception as e:
        logger.error(f"Error listing incidents: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list incidents: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "orchestration-api",
        "agents": ["temporal", "visual", "risk_scorer", "remediation", "voice"]
    }
