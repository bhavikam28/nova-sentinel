"""
Visual Analysis API endpoints
"""
import json
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Optional, Dict, Any
from pydantic import BaseModel

from agents.visual_agent import VisualAgent
from agents.threat_model_agent import ThreatModelAgent
from utils.logger import logger

router = APIRouter(prefix="/api/visual", tags=["visual"])
visual_agent = VisualAgent()
threat_model_agent = ThreatModelAgent()


class ThreatModelRequest(BaseModel):
    architecture_description: str
    visual_analysis_json: Optional[str] = None
    include_ai_threats: bool = True


@router.post("/analyze-diagram")
async def analyze_diagram(
    file: UploadFile = File(...),
    context: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Analyze an architecture diagram or screenshot
    
    Upload an image file (PNG, JPG) and get security analysis:
    - Security vulnerabilities
    - Configuration drift
    - Exposed resources
    - Compliance issues
    - Recommendations
    
    Args:
        file: Image file to analyze
        context: Optional context about what to look for
        
    Returns:
        Analysis results with findings and recommendations
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (PNG, JPG, etc.)"
            )
        
        # Read image data
        image_data = await file.read()
        
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="Image file too large (max 10MB)"
            )
        
        logger.info(f"Received diagram analysis request: {file.filename} ({len(image_data)} bytes)")
        
        analysis = await visual_agent.analyze_diagram(
            image_data=image_data,
            context=context,
            content_type=file.content_type,
            filename=file.filename
        )
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error in diagram analysis: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Diagram analysis failed: {str(e)}"
        )


@router.post("/detect-drift")
async def detect_drift(
    file: UploadFile = File(...),
    expected_config: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Detect configuration drift in architecture diagram
    
    Compare the diagram to expected configuration and identify deviations.
    
    Args:
        file: Current architecture diagram
        expected_config: Optional JSON string of expected configuration
        
    Returns:
        Drift analysis with differences and recommendations
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (PNG, JPG, etc.)"
            )
        
        # Read image data
        image_data = await file.read()
        
        # Parse expected config if provided
        expected_config_dict = None
        if expected_config:
            import json
            try:
                expected_config_dict = json.loads(expected_config)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="expected_config must be valid JSON"
                )
        
        logger.info(f"Received drift detection request: {file.filename}")
        
        drift_analysis = await visual_agent.detect_configuration_drift(
            image_data=image_data,
            expected_config=expected_config_dict,
            content_type=file.content_type,
            filename=file.filename
        )
        
        return drift_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error in drift detection: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Drift detection failed: {str(e)}"
        )


@router.post("/threat-model")
async def generate_threat_model(request: ThreatModelRequest) -> Dict[str, Any]:
    """
    Generate STRIDE threat model from architecture description.
    Optionally use Nova Pro visual analysis as input.
    """
    try:
        visual_analysis = None
        if request.visual_analysis_json:
            try:
                visual_analysis = json.loads(request.visual_analysis_json)
            except json.JSONDecodeError:
                logger.warning("Invalid visual_analysis_json, ignoring")
        result = await threat_model_agent.generate_threat_model(
            architecture_description=request.architecture_description,
            visual_analysis=visual_analysis,
            include_ai_threats=request.include_ai_threats,
        )
        return result
    except Exception as e:
        import traceback
        logger.error(f"Threat model generation failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Threat model generation failed: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "visual-analysis-api",
        "model": "amazon.nova-pro-v1:0"
    }
