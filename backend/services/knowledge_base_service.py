"""
Optional knowledge sources for security playbook retrieval:
1. AWS Knowledge MCP (remote, no Terraform) — USE_AWS_KNOWLEDGE_MCP=true
2. Bedrock Knowledge Base (S3 Vectors) — KNOWLEDGE_BASE_ID
"""
import asyncio
from typing import Dict, Any, Optional

from utils.config import get_settings
from utils.logger import logger

# Lazy client
_agent_client = None


def _get_agent_client():
    """Lazy-init bedrock-agent-runtime client."""
    global _agent_client
    if _agent_client is None:
        import boto3
        settings = get_settings()
        profile = settings.aws_profile if (settings.aws_profile and settings.aws_profile != "default") else None
        session = boto3.Session(profile_name=profile)
        _agent_client = session.client(
            "bedrock-agent-runtime",
            region_name=settings.aws_region
        )
    return _agent_client


def is_knowledge_base_configured() -> bool:
    """Return True if any knowledge source is configured (AWS MCP or Bedrock KB)."""
    try:
        from services.aws_knowledge_mcp_service import is_aws_knowledge_mcp_enabled
        if is_aws_knowledge_mcp_enabled():
            return True
    except Exception:
        pass
    kb_id = get_settings().knowledge_base_id or ""
    return bool(kb_id.strip())


async def retrieve_and_generate(
    query: str,
    model_arn: Optional[str] = None,
    max_tokens: int = 4000,
    temperature: float = 0.2,
    number_of_results: int = 5,
) -> Dict[str, Any]:
    """
    Query knowledge sources: AWS Knowledge MCP (if enabled) first, then Bedrock KB.
    Returns dict with 'answer', 'citations', 'session_id', or 'error'.
    """
    # Try AWS Knowledge MCP first (no Terraform, real-time AWS docs)
    try:
        from services.aws_knowledge_mcp_service import (
            is_aws_knowledge_mcp_enabled,
            search_aws_documentation,
        )
        if is_aws_knowledge_mcp_enabled():
            mcp_result = await search_aws_documentation(query, limit=number_of_results)
            if mcp_result.get("enabled") and mcp_result.get("answer"):
                return {
                    "answer": mcp_result["answer"],
                    "citations": [],
                    "session_id": None,
                    "kb_enabled": True,
                    "source": "aws-knowledge-mcp",
                }
            if mcp_result.get("error"):
                logger.warning(f"AWS Knowledge MCP failed, falling back to KB: {mcp_result['error']}")
    except Exception as e:
        logger.warning(f"AWS Knowledge MCP unavailable: {e}")

    # Fall back to Bedrock Knowledge Base
    settings = get_settings()
    kb_id = (settings.knowledge_base_id or "").strip()
    if not kb_id:
        return {
            "answer": "No knowledge source configured. Set USE_AWS_KNOWLEDGE_MCP=true (no setup) or KNOWLEDGE_BASE_ID (Terraform + console) in .env.",
            "citations": [],
            "session_id": None,
            "kb_enabled": False,
        }

    model = model_arn or getattr(settings, "kb_model_id", None) or "amazon.nova-2-lite-v1:0"
    # RetrieveAndGenerate uses foundation model ID; inference profiles (us.amazon.*) may not work
    if not model.startswith("arn:"):
        model = f"arn:aws:bedrock:{settings.aws_region}::foundation-model/{model}"

    try:
        client = _get_agent_client()
        params = {
            "input": {"text": query},
            "retrieveAndGenerateConfiguration": {
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": kb_id,
                    "modelArn": model,
                    "retrievalConfiguration": {
                        "vectorSearchConfiguration": {
                            "numberOfResults": number_of_results,
                        }
                    },
                    "generationConfiguration": {
                        "inferenceConfig": {
                            "textInferenceConfig": {
                                "maxTokens": max_tokens,
                                "temperature": temperature,
                            }
                        }
                    },
                },
            },
        }

        response = await asyncio.to_thread(client.retrieve_and_generate, **params)

        output = response.get("output", {})
        message = output.get("message", {})
        content = message.get("content", [])
        text = ""
        for item in content:
            if "text" in item:
                text = item.get("text", "")
                break

        citations = []
        for ref in output.get("citations", []):
            for src in ref.get("retrievedReferences", []):
                loc = src.get("location", {})
                if "s3Location" in loc:
                    citations.append(loc["s3Location"].get("uri", ""))

        return {
            "answer": text or "No answer generated.",
            "citations": citations,
            "session_id": response.get("sessionId"),
            "kb_enabled": True,
        }
    except Exception as e:
        logger.warning(f"Knowledge Base retrieve_and_generate failed: {e}")
        return {
            "answer": f"Knowledge Base query failed: {str(e)}. Check KNOWLEDGE_BASE_ID and IAM permissions.",
            "citations": [],
            "session_id": None,
            "kb_enabled": True,
            "error": str(e),
        }
