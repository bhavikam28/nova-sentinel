"""
Remediation Agent - Generate and execute remediation plans
Uses Nova 2 Lite for planning and Nova Act for execution
"""
import json
import re
import time
from typing import Dict, Any, List, Optional
from datetime import datetime

from services.bedrock_service import BedrockService
from utils.logger import logger


class RemediationAgent:
    """
    Agent responsible for generating and executing remediation plans
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
        
    async def generate_remediation_plan(
        self,
        incident_analysis: Dict[str, Any],
        root_cause: str,
        attack_pattern: str,
        blast_radius: str,
        timeline_events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate a remediation plan based on incident analysis
        
        Args:
            incident_analysis: Full incident analysis results
            root_cause: Root cause of the incident
            attack_pattern: Attack pattern identified
            blast_radius: Blast radius description
            timeline_events: List of timeline events
            
        Returns:
            Remediation plan with steps, validation, and approval requirements
        """
        start_time = time.time()
        
        try:
            logger.info("Generating remediation plan")
            
            # Format timeline events for context
            events_summary = "\n".join([
                f"- {event.get('action', 'Unknown')} at {event.get('timestamp', 'Unknown')} by {event.get('actor', 'Unknown')}"
                for event in timeline_events[:10]  # Limit to first 10 events
            ])
            
            # Detect AI-related incidents — add AI-specific remediation steps
            incident_type = str(incident_analysis.get("incident_type", "") or attack_pattern or "").lower()
            is_ai_incident = any(
                k in incident_type for k in ("bedrock", "prompt injection", "bias", "llm", "shadow ai", "model drift", "hallucination", "jailbreak", "ai security")
            )
            ai_incident_note = ""
            if is_ai_incident:
                ai_incident_note = """
IMPORTANT: This is an AI-related security incident (Bedrock, LLM, prompt injection, bias, etc.).
- Include steps for: (1) bias assessment on affected model outputs, (2) regulatory escalation check (EU AI Act), (3) model retraining or validation recommendation.
- Order: AI-specific steps first, then standard remediation.
"""
            
            # Detect AWS service principals — avoid irrelevant steps like "Rotate all IAM credentials"
            actors = [str(e.get('actor', '')).lower() for e in timeline_events]
            has_aws_service = any('.amazonaws.com' in a for a in actors)
            aws_service_note = ""
            if has_aws_service:
                aws_service_note = """
IMPORTANT: The actor(s) appear to be AWS service principals (*.amazonaws.com), not human users or compromised IAM.
- Do NOT recommend "Rotate IAM credentials for all users" — that is irrelevant (no human credentials involved).
- Focus on: verifying service configuration, reviewing CloudTrail for context, and optionally disabling/unlinking the service if undesired.
- Suggest lightweight steps appropriate for AWS-managed service activity (often benign).
"""
            
            prompt = f"""You are a cloud security expert generating a remediation plan for a security incident.

INCIDENT DETAILS:
Root Cause: {root_cause}
Attack Pattern: {attack_pattern}
Blast Radius: {blast_radius}
{ai_incident_note}
{aws_service_note}
TIMELINE EVENTS:
{events_summary}

Generate a comprehensive remediation plan that:
1. Addresses the root cause
2. Prevents recurrence
3. Follows AWS security best practices
4. Includes rollback procedures
5. Has approval gates for destructive operations

Provide your plan in JSON format with:
- plan_id: Unique identifier
- steps: Array of remediation steps, each with:
  - step_number: Sequential number
  - action: What to do (clear, descriptive action)
  - resource: AWS resource affected (specific resource name/ARN)
  - reason: Why this action is needed (explain the security rationale)
  - command: AWS CLI command or API call to execute
  - requires_approval: Boolean (true for destructive operations)
  - rollback_command: How to undo this step if needed
  - estimated_time: Time to execute (e.g., "2 minutes")
  - risk_level: LOW, MEDIUM, HIGH (risk of executing this step)
- validation_checks: Pre-execution validation steps
- post_remediation_checks: Verification steps after remediation
- estimated_total_time: Total time estimate for entire plan
- approval_required: Boolean indicating if approval is needed
- compliance_notes: Any compliance considerations
- priority: IMMEDIATE, HIGH, MEDIUM, or LOW

IMPORTANT: Each step MUST include a clear "reason" field explaining why this remediation action is necessary for security."""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=6000,
                temperature=0.1
            )
            
            plan_text = response.get("text", "")
            plan = self._parse_plan(plan_text)
            
            # Add metadata
            plan["plan_id"] = f"REMED-{int(time.time())}"
            plan["created_at"] = datetime.utcnow().isoformat()
            plan["status"] = "PENDING_APPROVAL" if plan.get("approval_required", False) else "READY"
            
            analysis_time = int((time.time() - start_time) * 1000)
            plan["generation_time_ms"] = analysis_time
            
            logger.info(f"Remediation plan generated in {analysis_time}ms: {plan.get('plan_id')}")
            
            return plan
            
        except Exception as e:
            logger.error(f"Error generating remediation plan: {e}")
            raise
    
    async def validate_plan(
        self,
        plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate a remediation plan for safety and compliance
        
        Args:
            plan: Remediation plan to validate
            
        Returns:
            Validation results with safety checks
        """
        try:
            logger.info(f"Validating remediation plan: {plan.get('plan_id')}")
            
            plan_json = json.dumps(plan, indent=2)
            
            prompt = f"""You are a cloud security expert validating a remediation plan for safety and compliance.

REMEDIATION PLAN:
{plan_json}

Validate this plan and check for:
1. Destructive operations without proper safeguards
2. Compliance with AWS best practices
3. Missing rollback procedures
4. Operations that could cause downtime
5. Security policy violations

Provide validation in JSON format with:
- is_safe: Boolean indicating if plan is safe to execute
- safety_issues: List of safety concerns
- compliance_issues: List of compliance problems
- recommendations: Recommendations to improve the plan
- risk_assessment: Overall risk level (LOW, MEDIUM, HIGH, CRITICAL)"""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=2000,
                temperature=0.1
            )
            
            validation_text = response.get("text", "")
            validation = self._parse_validation(validation_text)
            
            logger.info(f"Plan validation complete: {'SAFE' if validation.get('is_safe', False) else 'UNSAFE'}")
            
            return validation
            
        except Exception as e:
            logger.error(f"Error validating plan: {e}")
            raise
    
    @staticmethod
    def _clean_json(s: str) -> str:
        """Remove trailing commas, smart quotes, and BOMs that break json.loads."""
        s = s.lstrip('\ufeff')
        s = s.replace('\u201c', '"').replace('\u201d', '"').replace('\u2018', "'").replace('\u2019', "'")
        s = re.sub(r'//[^\n]*', '', s)           # strip // comments
        s = re.sub(r',\s*([}\]])', r'\1', s)      # remove trailing commas
        return s

    @staticmethod
    def _repair_truncated(s: str) -> str:
        """Close any unclosed JSON arrays/objects from a truncated response."""
        s = s.rstrip().rstrip(',')
        depth_obj = depth_arr = 0
        in_str = esc = False
        for ch in s:
            if esc: esc = False; continue
            if ch == '\\': esc = True; continue
            if ch == '"': in_str = not in_str; continue
            if in_str: continue
            if ch == '{': depth_obj += 1
            elif ch == '}': depth_obj -= 1
            elif ch == '[': depth_arr += 1
            elif ch == ']': depth_arr -= 1
        return s + ']' * max(0, depth_arr) + '}' * max(0, depth_obj)

    def _extract_json_str(self, text: str) -> Optional[str]:
        """Extract the JSON string from a model response using multiple strategies."""
        # Strategy 1: fenced code block ```json … ```
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            if end > start:
                return text[start:end].strip()
        # Strategy 2: any fenced code block ``` … ```
        if "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            if end > start:
                candidate = text[start:end].strip()
                if candidate.startswith("{"):
                    return candidate
        # Strategy 3: largest { … } block
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return text[start:end]
        return None

    def _parse_plan(self, text: str) -> Dict[str, Any]:
        """Parse remediation plan — robust against trailing commas and truncation."""
        raw = text or ""
        json_str = self._extract_json_str(raw)

        if json_str:
            # Attempt 1: parse as-is
            try:
                return self._ensure_step_defaults(json.loads(json_str))
            except json.JSONDecodeError:
                pass
            # Attempt 2: clean trailing commas / smart quotes
            try:
                return self._ensure_step_defaults(json.loads(self._clean_json(json_str)))
            except json.JSONDecodeError:
                pass
            # Attempt 3: repair truncated JSON
            try:
                return self._ensure_step_defaults(json.loads(self._repair_truncated(self._clean_json(json_str))))
            except json.JSONDecodeError as e:
                logger.warning(f"Could not parse plan JSON after repair: {e}")

        # Last resort: build a minimal plan from raw prose so the tab is not blank
        logger.warning("Building fallback plan from raw prose response")
        return self._build_prose_fallback(raw)

    def _build_prose_fallback(self, raw_text: str) -> Dict[str, Any]:
        """When JSON parsing fails entirely, wrap the raw prose as a single manual step."""
        step_text = raw_text.strip() or "Review the incident and apply remediation steps manually."
        return {
            "steps": [
                {
                    "step_number": 1,
                    "action": "Review AI-generated remediation guidance",
                    "resource": "Manual review required",
                    "reason": "Automated JSON parsing failed — the full remediation text is shown below for manual execution.",
                    "command": "# See raw plan below — run the CLI commands from the wolfir analysis output",
                    "requires_approval": True,
                    "rollback_command": "# N/A — review before executing",
                    "estimated_time": "Variable",
                    "risk_level": "MEDIUM",
                    "classification": "MANUAL",
                    "reversible": False,
                }
            ],
            "validation_checks": ["Review the raw plan text before executing any commands."],
            "post_remediation_checks": ["Verify CloudTrail shows expected changes."],
            "estimated_total_time": "Manual review required",
            "approval_required": True,
            "raw_plan": raw_text,
            "parse_warning": "JSON parsing failed — raw model output is stored in raw_plan.",
        }

    def _ensure_step_defaults(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Add default values for fields expected by frontend."""
        for step in plan.get("steps", []) or []:
            if isinstance(step, dict):
                step.setdefault("requires_approval", step.get("risk_level") in ("HIGH", "CRITICAL"))
                step.setdefault("rollback_command", step.get("command", ""))
                step.setdefault("estimated_time", "2 minutes")
                step.setdefault("risk_level", step.get("risk", "MEDIUM"))
                step.setdefault("classification", self._classify_step(step))
                step.setdefault("reversible", bool("rollback" in str(step.get("rollback_command", "")).lower() or "undo" in str(step.get("reason", "")).lower()))
        return plan

    def _classify_step(self, step: Dict[str, Any]) -> str:
        """Classify step as AUTO | APPROVAL | MANUAL based on action/resource."""
        action = (step.get("action", "") or "").lower()
        target = (step.get("target", "") or "").lower()
        automation = (step.get("automation", "") or "").lower()
        if automation == "automated":
            return "AUTO"
        if ("delete" in action or "terminate" in action or "remove" in action) and "policy" not in action:
            return "MANUAL"
        if "revoke" in action or "detach" in action or "disable" in action or "restrict" in action:
            return "APPROVAL"
        if "enable" in action or "tag" in action or "block" in action:
            return "AUTO"
        return "APPROVAL"
    
    def _parse_validation(self, text: str) -> Dict[str, Any]:
        """Parse validation results — robust against trailing commas."""
        json_str = self._extract_json_str(text or "")
        if json_str:
            for candidate in (json_str, self._clean_json(json_str), self._repair_truncated(self._clean_json(json_str))):
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    pass
        logger.warning("Could not parse validation JSON")
        return {
            "is_safe": False,
            "safety_issues": ["Could not parse validation response"],
            "compliance_issues": [],
            "recommendations": [],
            "risk_assessment": "UNKNOWN"
        }
