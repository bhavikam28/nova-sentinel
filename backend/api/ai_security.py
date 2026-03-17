"""
AI Security API — MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF, Bedrock Guardrails
AI Security Posture Management (AI-SPM) for AWS.
"""
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any, Optional

from services.guardrails_service import list_guardrails
from utils.config import get_settings
from services.ai_pipeline_monitor import (
    generate_atlas_report,
    monitor_invocation_patterns,
    scan_for_prompt_injection,
    validate_model_output,
    get_owasp_llm_report,
)
from services.ai_security_service import (
    list_bedrock_models,
    list_bedrock_agents,
    get_guardrail_recommendations,
    detect_shadow_ai,
)

router = APIRouter(prefix="/api/ai-security", tags=["ai-security"])


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Current ATLAS + OWASP LLM threat status."""
    report = generate_atlas_report()
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    owasp = get_owasp_llm_report(guardrail_active=guardrail_active)
    return {
        "techniques": report["techniques"],
        "summary": report.get("invocation_summary", {}),
        "is_simulated": report.get("is_simulated", False),
        "owasp_llm": owasp,
    }


@router.get("/invocations")
async def get_invocations() -> Dict[str, Any]:
    """Invocation metrics per model."""
    return monitor_invocation_patterns()


@router.get("/governance")
async def get_governance() -> Dict[str, Any]:
    """NIST AI RMF compliance status."""
    report = generate_atlas_report()
    return {"nist_rmf": report.get("nist_rmf", {})}


@router.get("/guardrails")
async def get_guardrails() -> Dict[str, Any]:
    """List guardrails in the account. Enables users to discover and configure Guardrails for wolfir."""
    return list_guardrails()


@router.get("/guardrail-config")
async def get_guardrail_config() -> Dict[str, Any]:
    """Current guardrail configuration (from env). Tells frontend if Guardrails are active."""
    s = get_settings()
    active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    return {
        "active": active,
        "guardrail_identifier": s.guardrail_identifier if active else None,
        "guardrail_version": s.guardrail_version if active else "1",
        "hint": "Set GUARDRAIL_IDENTIFIER and GUARDRAIL_VERSION in .env to enable. Restart backend after change.",
    }


@router.post("/scan")
async def trigger_scan(body: Optional[Dict[str, Any]] = Body(default={})) -> Dict[str, Any]:
    """Trigger manual security scan and refresh ATLAS + OWASP status."""
    input_text = (body or {}).get("input_text", "")
    injection = scan_for_prompt_injection(input_text)
    validation = validate_model_output(input_text) if input_text else {"valid": True, "issues": []}
    report = generate_atlas_report()
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    owasp = get_owasp_llm_report(injection, validation, guardrail_active)
    return {
        "prompt_injection": injection,
        "output_validation": validation,
        "techniques": report["techniques"],
        "summary": report.get("invocation_summary", {}),
        "owasp_llm": owasp,
    }


@router.get("/owasp-llm")
async def get_owasp_llm() -> Dict[str, Any]:
    """OWASP LLM Security Top 10 compliance posture."""
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    return get_owasp_llm_report(guardrail_active=guardrail_active)


@router.get("/bedrock-inventory")
async def bedrock_inventory() -> Dict[str, Any]:
    """List Bedrock foundation models (AI-BOM)."""
    return await list_bedrock_models()


@router.get("/bedrock-agents")
async def bedrock_agents() -> Dict[str, Any]:
    """List Bedrock agents for agentic AI threat assessment."""
    return await list_bedrock_agents()


@router.get("/guardrail-recommendations")
async def guardrail_recommendations() -> Dict[str, Any]:
    """Guardrail configuration recommendations."""
    return await get_guardrail_recommendations()


@router.get("/shadow-ai")
async def shadow_ai(days_back: int = 7, max_results: int = 100) -> Dict[str, Any]:
    """Detect Shadow AI: InvokeModel calls from unexpected principals."""
    return await detect_shadow_ai(days_back=days_back, max_results=max_results)


@router.get("/config-topology")
async def get_config_topology() -> Dict[str, Any]:
    """
    Query AWS Config to discover real AI-related resources for the Security Graph.
    Returns Bedrock, IAM, S3, and VPC resources discovered via Config advanced queries.
    Requires config:SelectResourceConfig on the IAM policy.
    """
    import asyncio, json, boto3, logging
    from utils.config import get_settings

    logger = logging.getLogger(__name__)
    settings = get_settings()
    profile = settings.aws_profile if (settings.aws_profile and settings.aws_profile != "default") else None

    try:
        session = boto3.Session(profile_name=profile)
        config_client = session.client("config", region_name=settings.aws_region)

        nodes: list = []
        edges: list = []

        # Query AI-relevant resource types
        queries = {
            "bedrock_guardrails": "SELECT resourceId, resourceName, configuration WHERE resourceType = 'AWS::Bedrock::Guardrail'",
            "iam_roles": "SELECT resourceId, resourceName, configuration WHERE resourceType = 'AWS::IAM::Role' AND configuration.roleName LIKE '%bedrock%' OR configuration.roleName LIKE '%nova%' OR configuration.roleName LIKE '%ai%'",
            "s3_buckets": "SELECT resourceId, resourceName, configuration WHERE resourceType = 'AWS::S3::Bucket'",
            "lambda_functions": "SELECT resourceId, resourceName, configuration WHERE resourceType = 'AWS::Lambda::Function'",
        }

        resource_summary: Dict[str, Any] = {}
        for key, sql in queries.items():
            try:
                resp = await asyncio.to_thread(
                    config_client.select_resource_config,
                    Expression=sql,
                    Limit=10,
                )
                results = [json.loads(r) for r in resp.get("Results", [])]
                resource_summary[key] = results
            except Exception as e:
                resource_summary[key] = {"error": str(e)}

        # Build simplified node list
        guardrails = resource_summary.get("bedrock_guardrails", [])
        iam_roles = resource_summary.get("iam_roles", [])
        s3_buckets = resource_summary.get("s3_buckets", [])
        lambdas = resource_summary.get("lambda_functions", [])

        nodes.append({
            "id": "bedrock",
            "type": "bedrock",
            "label": "Amazon Bedrock",
            "sublabel": f"Guardrails: {len(guardrails) if isinstance(guardrails, list) else 0}",
            "resource_count": len(guardrails) if isinstance(guardrails, list) else 0,
        })
        nodes.append({
            "id": "iam",
            "type": "iam",
            "label": "IAM Roles",
            "sublabel": f"{len(iam_roles) if isinstance(iam_roles, list) else 0} AI-related roles",
            "roles": [r.get("resourceName") for r in (iam_roles if isinstance(iam_roles, list) else [])],
        })
        if s3_buckets and isinstance(s3_buckets, list):
            nodes.append({
                "id": "s3",
                "type": "s3",
                "label": "S3 Buckets",
                "sublabel": f"{len(s3_buckets)} bucket(s)",
            })
        if lambdas and isinstance(lambdas, list) and len(lambdas) > 0:
            nodes.append({
                "id": "lambda",
                "type": "lambda",
                "label": "Lambda Functions",
                "sublabel": f"{len(lambdas)} function(s)",
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "raw": resource_summary,
            "config_enabled": True,
        }

    except Exception as e:
        logger.warning(f"AWS Config topology query failed: {e}")
        return {
            "nodes": [],
            "edges": [],
            "config_enabled": False,
            "error": str(e),
            "hint": "Add config:SelectResourceConfig to your IAM policy to enable real resource discovery.",
        }


@router.get("/ai-bom")
async def ai_bom() -> Dict[str, Any]:
    """AI Bill of Materials — models, agents, dependencies. Export for compliance."""
    models = await list_bedrock_models()
    agents = await list_bedrock_agents()
    report = generate_atlas_report()
    s = get_settings()
    guardrail_active = bool(s.guardrail_identifier and s.guardrail_identifier.strip())
    owasp = get_owasp_llm_report(guardrail_active=guardrail_active)
    model_list = models.get("models", models.get("items", []))
    agent_list = agents.get("agents", agents.get("items", []))
    return {
        "bom_version": "1.0",
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "models": model_list,
        "model_count": models.get("count", len(model_list)),
        "agents": agent_list,
        "agent_count": agents.get("count", len(agent_list)),
        "guardrails": {"active": guardrail_active, "identifier": s.guardrail_identifier if guardrail_active else None},
        "owasp_llm": owasp,
        "mitre_atlas_techniques": report.get("techniques", []),
    }
