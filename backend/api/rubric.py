"""
Rubric-based evaluation API — quality scores for remediation plans and timelines
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from services.rubric_evaluator import evaluate_remediation_plan, evaluate_timeline
from utils.logger import logger

router = APIRouter(prefix="/api/rubric", tags=["rubric"])


class EvaluatePlanRequest(BaseModel):
    plan: Dict[str, Any]


class EvaluateTimelineRequest(BaseModel):
    timeline: Dict[str, Any]


@router.post("/evaluate-plan")
async def evaluate_plan(req: EvaluatePlanRequest) -> Dict[str, Any]:
    """Evaluate a remediation plan against security rubrics. Returns overall score and per-rubric scores."""
    try:
        result = await evaluate_remediation_plan(req.plan)
        return result
    except Exception as e:
        logger.error(f"Rubric plan evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-timeline")
async def evaluate_timeline_endpoint(req: EvaluateTimelineRequest) -> Dict[str, Any]:
    """Evaluate a timeline analysis against security rubrics."""
    try:
        result = await evaluate_timeline(req.timeline)
        return result
    except Exception as e:
        logger.error(f"Rubric timeline evaluation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
