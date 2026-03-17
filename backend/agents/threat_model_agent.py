"""
Threat Model Agent — STRIDE threat modeling from architecture descriptions
Uses Nova 2 Lite for threat analysis, optionally takes Nova Pro visual analysis as input
"""
import json
import re
from typing import Dict, Any, Optional

from services.bedrock_service import BedrockService
from utils.prompts import STRIDE_THREAT_MODEL_SYSTEM_PROMPT, STRIDE_THREAT_MODEL_PROMPT
from utils.logger import logger


class ThreatModelAgent:
    """
    AI Threat Modeler — generates STRIDE threat models from architecture descriptions.
    Uses Nova 2 Lite for threat analysis, optionally takes Nova Pro visual analysis as input.
    """

    def __init__(self):
        self.bedrock = BedrockService()

    async def generate_threat_model(
        self,
        architecture_description: str,
        visual_analysis: Optional[Dict[str, Any]] = None,
        include_ai_threats: bool = True,
        account_id: Optional[str] = None,
        real_resources: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Generate a STRIDE threat model from an architecture description.

        Args:
            architecture_description: Text description of the system architecture
            visual_analysis: Optional output from Nova Pro diagram analysis
            include_ai_threats: If True, include MITRE ATLAS AI-specific threats
            account_id: Real AWS account ID — injected into CLI commands
            real_resources: Real resource names/ARNs from CloudTrail events

        Returns:
            Dict with assets, trust_boundaries, threats, ai_specific_threats, summary
        """
        # Build visual analysis section
        visual_analysis_section = ""
        if visual_analysis:
            try:
                if isinstance(visual_analysis, str):
                    va = json.loads(visual_analysis)
                else:
                    va = visual_analysis
                findings = va.get("analysis", va).get("security_findings", [])
                recs = va.get("analysis", va).get("recommendations", [])
                summary = va.get("analysis", va).get("summary", "")
                if findings or recs or summary:
                    visual_analysis_section = "\n\nNova Pro Visual Analysis (use to enrich threats):\n"
                    if summary:
                        visual_analysis_section += f"Summary: {summary}\n"
                    if findings:
                        visual_analysis_section += "Security findings: " + "; ".join(
                            f if isinstance(f, str) else str(f) for f in findings[:10]
                        ) + "\n"
                    if recs:
                        visual_analysis_section += "Recommendations: " + "; ".join(
                            r if isinstance(r, str) else str(r) for r in recs[:5]
                        )
            except (json.JSONDecodeError, TypeError, AttributeError) as e:
                logger.warning(f"Could not parse visual analysis for threat model: {e}")

        # AI threats instruction
        ai_threats_instruction = (
            "Include ai_specific_threats array with MITRE ATLAS techniques (AML.T0051, AML.T0040, AML.T0043, etc.) "
            "for any Bedrock/ML components. If no AI components, return empty array."
            if include_ai_threats
            else "Set ai_specific_threats to empty array []."
        )

        # Build account context section — helps model generate correct CLI commands
        account_context = ""
        if account_id:
            account_context = f"\n\nAWS ACCOUNT CONTEXT (use in all CLI commands):\nAccount ID: {account_id}\n"
        if real_resources:
            resource_list = "\n".join(f"  - {r}" for r in real_resources[:15])
            account_context += f"Real resources observed in CloudTrail:\n{resource_list}\n"
            account_context += "Use these exact resource names in CLI commands where applicable.\n"
        if account_context:
            account_context += (
                "IMPORTANT: Use the above account ID (not 123456789012) in all ARNs and CLI commands. "
                "For root MFA, note that root MFA must be configured via the AWS Console — "
                "it cannot be enabled via CLI.\n"
            )

        prompt = STRIDE_THREAT_MODEL_PROMPT.format(
            architecture_description=architecture_description,
            visual_analysis_section=(visual_analysis_section or "(none provided)") + account_context,
            ai_threats_instruction=ai_threats_instruction,
        )

        logger.info("Invoking Nova 2 Lite for STRIDE threat model")
        response = await self.bedrock.invoke_nova_lite(
            prompt=prompt,
            system_prompt=STRIDE_THREAT_MODEL_SYSTEM_PROMPT,
            max_tokens=8000,
            temperature=0.2,
        )

        response_text = response.get("text", "")
        result = self._parse_response(response_text)

        # Post-process: replace hardcoded placeholder account ID and fix common CLI mistakes
        if account_id:
            result = self._fix_account_id(result, account_id)

        # Ensure required structure
        result.setdefault("assets", [])
        result.setdefault("trust_boundaries", [])
        result.setdefault("threats", [])
        result.setdefault("ai_specific_threats", [])
        result.setdefault("summary", {
            "total_threats": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "stride_coverage": {"S": 0, "T": 0, "R": 0, "I": 0, "D": 0, "E": 0},
        })

        # Compute summary if missing
        threats = result["threats"]
        if threats and result["summary"].get("total_threats", 0) == 0:
            s = result["summary"]
            s["total_threats"] = len(threats)
            s["critical"] = sum(1 for t in threats if (t.get("severity") or "").upper() == "CRITICAL")
            s["high"] = sum(1 for t in threats if (t.get("severity") or "").upper() == "HIGH")
            s["medium"] = sum(1 for t in threats if (t.get("severity") or "").upper() == "MEDIUM")
            s["low"] = sum(1 for t in threats if (t.get("severity") or "").upper() == "LOW")
            stride_cats = ["Spoofing", "Tampering", "Repudiation", "Information Disclosure", "Denial of Service", "Elevation of Privilege"]
            stride_keys = ["S", "T", "R", "I", "D", "E"]
            for i, cat in enumerate(stride_cats):
                s["stride_coverage"][stride_keys[i]] = sum(
                    1 for t in threats if (t.get("stride_category") or "").startswith(cat[:3])
                )

        return result

    @staticmethod
    def _fix_account_id(result: Dict[str, Any], account_id: str) -> Dict[str, Any]:
        """Replace placeholder account IDs (123456789012 and variants) with the real account ID."""
        placeholder_pattern = re.compile(r'\b123456789012\b|\b000000000000\b|\b111111111111\b|\b999999999999\b')

        def fix_str(s: str) -> str:
            if isinstance(s, str):
                return placeholder_pattern.sub(account_id, s)
            return s

        def fix_obj(obj: Any) -> Any:
            if isinstance(obj, str):
                return fix_str(obj)
            if isinstance(obj, dict):
                return {k: fix_obj(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [fix_obj(item) for item in obj]
            return obj

        return fix_obj(result)

    @staticmethod
    def _clean_json(json_str: str) -> str:
        """Remove common JSON issues: trailing commas, control chars, ellipsis truncations."""
        # Remove trailing commas before ] or }
        cleaned = re.sub(r',\s*([}\]])', r'\1', json_str)
        # Remove C-style comments (// ...)
        cleaned = re.sub(r'//[^\n]*', '', cleaned)
        # Replace curly/smart quotes with straight quotes
        cleaned = cleaned.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
        # Strip BOM
        cleaned = cleaned.lstrip('\ufeff')
        return cleaned

    @staticmethod
    def _repair_truncated_json(json_str: str) -> str:
        """Attempt to close unclosed arrays and objects in truncated JSON."""
        s = json_str.rstrip().rstrip(',')
        # Count unclosed structures
        depth_obj = 0
        depth_arr = 0
        in_string = False
        escape = False
        for ch in s:
            if escape:
                escape = False
                continue
            if ch == '\\':
                escape = True
                continue
            if ch == '"' and not escape:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == '{':
                depth_obj += 1
            elif ch == '}':
                depth_obj -= 1
            elif ch == '[':
                depth_arr += 1
            elif ch == ']':
                depth_arr -= 1
        # Close any open structures
        suffix = ']' * max(0, depth_arr) + '}' * max(0, depth_obj)
        return s + suffix

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Nova 2 Lite JSON response — robust against trailing commas and truncation."""
        json_str = None
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end > start:
                json_str = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end > start:
                json_str = response_text[start:end].strip()

        if not json_str:
            start_idx = response_text.find("{")
            end_idx = response_text.rfind("}") + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]

        if not json_str:
            logger.warning("No JSON found in threat model response")
            return {"threats": [], "ai_specific_threats": [], "summary": {}}

        # Try parsing as-is first
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        # Try cleaning trailing commas and control chars
        try:
            cleaned = self._clean_json(json_str)
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Try repairing truncated JSON
        try:
            repaired = self._repair_truncated_json(self._clean_json(json_str))
            return json.loads(repaired)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse threat model JSON after repair attempts: {e}")
            return {"threats": [], "ai_specific_threats": [], "summary": {}}
