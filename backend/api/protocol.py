"""
IR Protocol Adherence API — NIST IR phase compliance
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from services.protocol_adherence import compute_protocol_adherence
from utils.logger import logger

router = APIRouter(prefix="/api/protocol", tags=["protocol"])


class ProtocolAdherenceRequest(BaseModel):
    timeline: Dict[str, Any]
    remediation_plan: Optional[Dict[str, Any]] = None
    documentation: Optional[Dict[str, Any]] = None


@router.post("/adherence")
async def adherence(req: ProtocolAdherenceRequest) -> dict:
    """
    Compute IR protocol adherence (NIST phases) from timeline, remediation, and docs.
    Returns phase-by-phase completion and overall score.
    """
    try:
        result = compute_protocol_adherence(
            timeline=req.timeline,
            remediation_plan=req.remediation_plan or {},
            documentation=req.documentation,
        )
        return result
    except Exception as e:
        logger.error(f"Protocol adherence failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
