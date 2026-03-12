"""
Optional AWS Knowledge MCP Server integration.
Remote MCP at https://knowledge-mcp.global.api.aws — real-time AWS docs, best practices.
No AWS account or Terraform required. Enable with USE_AWS_KNOWLEDGE_MCP=true.
"""
import asyncio
import json
from typing import Dict, Any, Optional

from utils.config import get_settings
from utils.logger import logger

_AWS_KNOWLEDGE_MCP_URL = "https://knowledge-mcp.global.api.aws"


def is_aws_knowledge_mcp_enabled() -> bool:
    """Return True if AWS Knowledge MCP is enabled via env."""
    enabled = getattr(get_settings(), "use_aws_knowledge_mcp", False)
    return bool(enabled)


async def search_aws_documentation(
    query: str,
    topics: Optional[list[str]] = None,
    limit: int = 5,
) -> Dict[str, Any]:
    """
    Search AWS documentation via the remote AWS Knowledge MCP server.
    Returns parsed content suitable for RAG/playbook use.
    """
    if not is_aws_knowledge_mcp_enabled():
        return {
            "answer": "",
            "source": "aws-knowledge-mcp",
            "enabled": False,
        }

    try:
        from mcp.client.streamable_http import streamablehttp_client
        from mcp.client.session import ClientSession

        args: Dict[str, Any] = {"search_phrase": query, "limit": limit}
        if topics:
            args["topics"] = topics[:3]

        async with streamablehttp_client(_AWS_KNOWLEDGE_MCP_URL, timeout=60) as (
            read_stream,
            write_stream,
            _,
        ):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.call_tool("aws___search_documentation", args)

        # Parse result content
        answer_parts = []
        for block in result.content:
            text = getattr(block, "text", None)
            if not text:
                continue
            try:
                data = json.loads(text)
                content = data.get("content", {})
                results = content.get("result", [])
                for r in results:
                    title = r.get("title", "")
                    ctx = r.get("context", "")
                    if ctx:
                        answer_parts.append(f"**{title}**\n{ctx}")
            except json.JSONDecodeError:
                answer_parts.append(text)

        answer = "\n\n".join(answer_parts) if answer_parts else ""
        return {
            "answer": answer or "No results from AWS Knowledge MCP.",
            "source": "aws-knowledge-mcp",
            "enabled": True,
        }
    except Exception as e:
        logger.warning(f"AWS Knowledge MCP search failed: {e}")
        return {
            "answer": "",
            "source": "aws-knowledge-mcp",
            "enabled": True,
            "error": str(e),
        }


