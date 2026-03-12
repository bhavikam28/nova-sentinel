"""
ChangeSet Analysis API — Attack path–aware CloudFormation ChangeSet risk assessment
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.changeset_service import analyze_changeset, list_changesets
from utils.logger import logger

router = APIRouter(prefix="/api/changeset", tags=["changeset"])


class ChangeSetAnalyzeRequest(BaseModel):
    stack_name: str
    change_set_name: str
    region: Optional[str] = None


@router.post("/analyze")
async def analyze(req: ChangeSetAnalyzeRequest) -> dict:
    """
    Analyze a CloudFormation ChangeSet for attack path risk.
    Returns risk score, risky changes, and attack path implications.
    """
    try:
        logger.info(f"ChangeSet analysis: stack={req.stack_name}, change_set={req.change_set_name}")
        result = analyze_changeset(
            stack_name=req.stack_name,
            change_set_name=req.change_set_name,
            region=req.region,
        )
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ChangeSet analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_change_sets(
    stack_name: str = Query(..., description="CloudFormation stack name"),
    region: Optional[str] = Query(None, description="AWS region (default: config)"),
) -> dict:
    """
    List ChangeSets for a stack. Use to populate dropdown before analysis.
    """
    try:
        result = list_changesets(stack_name=stack_name, region=region)
        if result.get("error"):
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List ChangeSets failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
