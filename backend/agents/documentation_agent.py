"""
Documentation Agent — Automated documentation and notifications

Uses Nova 2 Lite (amazon.nova-2-lite-v1:0) for content generation.
Generates structured documentation for JIRA, Slack, and Confluence.

For browser-based posting to these platforms, see NovaActAgent
in nova_act_agent.py which uses the Nova Act SDK for browser automation.
"""
import json
import re
import time
from typing import Dict, Any, Optional
from services.bedrock_service import BedrockService
from utils.prompts import DOCUMENTATION_GENERATION_PROMPT
from utils.logger import logger


class DocumentationAgent:
    """
    Agent for automated documentation generation using Nova 2 Lite.
    
    Generates structured content for JIRA tickets, Slack messages, and Confluence pages.
    Content generation uses Nova 2 Lite (text model).
    Browser-based posting uses NovaActAgent (see nova_act_agent.py).
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
    
    async def generate_documentation(
        self,
        incident_id: str,
        incident_analysis: Dict[str, Any],
        timeline: Optional[Dict[str, Any]] = None,
        remediation_plan: Optional[Dict[str, Any]] = None,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate automated documentation for JIRA, Slack, and Confluence
        
        Args:
            incident_id: Incident identifier
            incident_analysis: Full incident analysis results
            timeline: Timeline analysis (if available)
            remediation_plan: Remediation plan (if available)
            context: Additional context
            
        Returns:
            Documentation for all platforms
        """
        logger.info(f"Generating documentation for incident {incident_id} using Nova 2 Lite")
        start_time = time.time()
        
        # Prepare incident details
        incident_details = {
            "incident_id": incident_id,
            "severity": incident_analysis.get("severity", "UNKNOWN"),
            "root_cause": timeline.get("root_cause", "Unknown") if timeline else "Unknown",
            "attack_pattern": timeline.get("attack_pattern", "Unknown") if timeline else "Unknown",
            "blast_radius": timeline.get("blast_radius", "Unknown") if timeline else "Unknown",
            "timeline_events": timeline.get("events", []) if timeline else [],
            "remediation_steps": remediation_plan.get("plan", {}).get("plan", []) if remediation_plan else [],
            "confidence": timeline.get("confidence", 0.0) if timeline else 0.0,
            "analysis_summary": timeline.get("analysis_summary", "No summary available") if timeline else "No summary available"
        }
        
        # Format the prompt
        user_prompt = DOCUMENTATION_GENERATION_PROMPT.format(
            incident_details=json.dumps(incident_details, indent=2)
        )
        
        # Invoke Nova 2 Lite for content generation
        response = await self.bedrock.invoke_nova_lite(
            prompt=user_prompt,
            max_tokens=4000,
            temperature=0.65
        )
        
        documentation_text = response.get("text", "")
        analysis_time = int((time.time() - start_time) * 1000)
        logger.info(f"Documentation generation complete in {analysis_time}ms")
        
        def _extract_and_parse(text: str) -> Optional[Dict[str, Any]]:
            """Try to extract and parse JSON with trailing-comma cleanup."""
            # Prefer fenced code block
            for fence in ("```json", "```"):
                if fence in text:
                    s = text.find(fence) + len(fence)
                    e = text.find("```", s)
                    if e > s:
                        candidate = text[s:e].strip()
                        if candidate.startswith("{"):
                            for attempt in (candidate, re.sub(r',\s*([}\]])', r'\1', candidate)):
                                try:
                                    return json.loads(attempt)
                                except json.JSONDecodeError:
                                    pass
            # Fallback: largest { … } block
            j0 = documentation_text.find('{')
            j1 = documentation_text.rfind('}') + 1
            if j0 >= 0 and j1 > j0:
                raw = documentation_text[j0:j1]
                for attempt in (raw, re.sub(r',\s*([}\]])', r'\1', raw)):
                    try:
                        return json.loads(attempt)
                    except json.JSONDecodeError:
                        pass
            return None

        parsed_docs = _extract_and_parse(documentation_text)
        if parsed_docs:
            return {
                "documentation": parsed_docs,
                "raw_response": documentation_text,
                "analysis_time_ms": analysis_time,
                "model_used": self.bedrock.settings.nova_lite_model_id,
                "platforms": ["jira", "slack", "confluence"]
            }
        logger.warning("Could not parse documentation JSON — returning raw text as fallback.")
        return {
            "documentation": {
                "jira": {"title": "Security Incident", "description": documentation_text},
                "slack": {"message": documentation_text},
                "confluence": {"content": documentation_text}
            },
            "raw_response": documentation_text,
            "analysis_time_ms": analysis_time,
            "model_used": self.bedrock.settings.nova_lite_model_id,
            "platforms": ["jira", "slack", "confluence"]
        }
    
    async def generate_jira_ticket(
        self,
        incident_id: str,
        incident_analysis: Dict[str, Any],
        timeline: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate JIRA ticket content"""
        docs = await self.generate_documentation(incident_id, incident_analysis, timeline)
        return docs["documentation"].get("jira", {})
    
    async def generate_slack_message(
        self,
        incident_id: str,
        incident_analysis: Dict[str, Any],
        timeline: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate Slack notification"""
        docs = await self.generate_documentation(incident_id, incident_analysis, timeline)
        return docs["documentation"].get("slack", {})
    
    async def generate_confluence_page(
        self,
        incident_id: str,
        incident_analysis: Dict[str, Any],
        timeline: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate Confluence page content"""
        docs = await self.generate_documentation(incident_id, incident_analysis, timeline)
        return docs["documentation"].get("confluence", {})
