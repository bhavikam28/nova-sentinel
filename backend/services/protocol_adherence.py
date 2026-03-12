"""
IR Protocol Adherence — NIST IR phase compliance scoring
Checks whether incident response followed NIST IR phases.
"""
from typing import Dict, Any, List, Optional

# NIST IR phases (simplified for security incident response)
NIST_IR_PHASES = [
    {"id": "preparation", "label": "Preparation", "description": "Policies, playbooks, tools in place"},
    {"id": "detection", "label": "Detection & Analysis", "description": "Event detection, initial analysis"},
    {"id": "containment", "label": "Containment", "description": "Short-term and long-term containment"},
    {"id": "eradication", "label": "Eradication", "description": "Remove threat, patch vulnerabilities"},
    {"id": "recovery", "label": "Recovery", "description": "Restore systems, validate"},
    {"id": "post_incident", "label": "Post-Incident", "description": "Documentation, lessons learned"},
]

# Keywords that indicate a phase was addressed (in timeline events, remediation steps, etc.)
PHASE_INDICATORS = {
    "preparation": ["playbook", "policy", "runbook", "prepared", "baseline"],
    "detection": ["detect", "alert", "guardduty", "cloudtrail", "finding", "anomaly", "analysis", "timeline", "root cause"],
    "containment": ["contain", "quarantine", "isolate", "block", "revoke", "disable", "detach", "restrict", "security group"],
    "eradication": ["terminate", "delete", "remove", "eradicate", "patch", "remediate", "fix"],
    "recovery": ["restore", "recover", "validate", "verify", "rollback"],
    "post_incident": ["document", "post-mortem", "lessons learned", "report", "jira", "confluence", "slack"],
}


def compute_protocol_adherence(
    timeline: Dict[str, Any],
    remediation_plan: Dict[str, Any],
    documentation: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Compute IR protocol adherence score based on NIST phases.
    Returns phase-by-phase completion and overall score.
    """
    all_text_parts: List[str] = []

    # From timeline
    tl = timeline or {}
    all_text_parts.append(str(tl.get("root_cause", "")))
    all_text_parts.append(str(tl.get("attack_pattern", "")))
    all_text_parts.append(str(tl.get("blast_radius", "")))
    for ev in (tl.get("events") or [])[:20]:
        all_text_parts.append(str(ev.get("action", "")))
        all_text_parts.append(str(ev.get("significance", "")))

    # From remediation plan
    plan = remediation_plan or {}
    steps = plan.get("steps") or plan.get("plan", {}).get("steps") or plan.get("plan", {}).get("plan") or []
    for s in steps:
        if isinstance(s, dict):
            all_text_parts.append(str(s.get("action", "")))
            all_text_parts.append(str(s.get("reason", "")))
    all_text_parts.append(str(plan.get("rollback_plan", "")))

    # From documentation
    if documentation:
        all_text_parts.append(str(documentation.get("documentation", "")))

    combined = " ".join(all_text_parts).lower()

    phases_completed = []
    for phase in NIST_IR_PHASES:
        phase_id = phase["id"]
        indicators = PHASE_INDICATORS.get(phase_id, [])
        matched = any(ind in combined for ind in indicators)
        phases_completed.append({
            **phase,
            "completed": matched,
            "evidence": "Found in timeline/remediation" if matched else "Not detected",
        })

    completed_count = sum(1 for p in phases_completed if p["completed"])
    total = len(NIST_IR_PHASES)
    overall_score = round((completed_count / total) * 100) if total else 0

    return {
        "overall_score": overall_score,
        "phases": phases_completed,
        "phases_completed": completed_count,
        "phases_total": total,
        "recommendation": _get_recommendation(phases_completed),
    }


def _get_recommendation(phases: List[Dict]) -> str:
    missing = [p["label"] for p in phases if not p["completed"]]
    if not missing:
        return "All NIST IR phases addressed. Strong protocol adherence."
    if len(missing) <= 2:
        return f"Consider adding steps for: {', '.join(missing)}."
    return f"Several phases may need attention: {', '.join(missing[:3])}{'...' if len(missing) > 3 else ''}."
