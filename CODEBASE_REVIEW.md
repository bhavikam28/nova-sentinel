# Nova Sentinel — Codebase Review & Hackathon Standout Guide

**Date:** March 4, 2025  
**Purpose:** Clean codebase, remove AI artifacts, improve hackathon judging impact

---

## 1. Cleanup Applied ✅

### Cursor / AI Artifacts
- **"cursor"** — All matches are legitimate CSS (`cursor-pointer`, `cursor-not-allowed`) — no change needed
- **"placeholder"** — Form input placeholders and `substitutePlaceholders` (ComplianceMapping) — legitimate
- **"mock" / "fake"** — `mock_data.py`, `threat_intel.py` — intentional for demo scenarios
- **"hackathon"** in comments — Kept; explains design decisions (e.g. "Kept simple for hackathon reliability")
- **60 seconds** — Already removed from product copy. Rebuild frontend to update `dist/index.html`

### DynamoDB Table Names
- `incident_memory.py` uses `nova-sentinel-incident-memory` (cross-incident memory)
- `config.py` uses `nova-sentinel-incidents` — different purpose. Both valid.

### Nova Act Placeholder
- `AKIAXXXXXXXX` in `nova_act_agent.py` — Generic AWS CLI example. Updated to `<ACCESS_KEY_ID>` for clarity.

---

## 2. Architecture Summary

```
CloudTrail / Demo Events
        ↓
POST /api/orchestration/analyze-incident (or analyze-from-cloudtrail)
        ↓
StrandsOrchestrator.plan_and_execute()
  ├── 1. TemporalAgent (Nova 2 Lite) — timeline
  ├── 2. incident_memory.correlate_incident() — DynamoDB
  ├── 3. RiskScorerAgent (Nova Micro) — risk scores
  ├── 4. RemediationAgent (Nova 2 Lite) — plan
  ├── 5. DocumentationAgent (Nova 2 Lite) — docs
  └── 6. incident_memory.save_incident()
        ↓
Response → Frontend (orchestrationResult, analysisResult, remediationPlan)
```

**MCP:** 4 servers (CloudTrail, IAM, CloudWatch, Nova Canvas), 22 tools, mounted at `/mcp`

---

## 3. Feature Audit by Tab

| Tab | Component | Data Source | Status |
|-----|-----------|-------------|--------|
| overview | InsightCards, SecurityPostureDashboard, AgentProgress | timeline, orchestrationResult | ✅ Strong |
| timeline | TimelineView | timeline.events | ✅ Good |
| attack-path | AttackPathDiagram | timeline, orchestrationResult | ✅ Good |
| incident-history | IncidentHistory | incidentHistoryAPI (list, stats, correlations) | ✅ Campaign correlation shown |
| compliance | ComplianceMapping | timeline, incidentType | ✅ 6 frameworks |
| cost | CostImpact | timeline, incident type | ✅ Good |
| remediation | RemediationPlan | remediationPlan | ✅ Execute + proof |
| visual | VisualAnalysisUpload | orchestrationResult, optional diagram | ✅ Separate flow |
| aria | VoiceAssistant | Voice API + incident context | ✅ Cross-incident via Aria |
| documentation | DocumentationDisplay | documentationResult | ✅ JIRA/Slack/Confluence |
| export | ReportExport | analysisResult, orchestrationResult | ✅ PDF/clipboard |
| ai-pipeline | AIPipelineSecurity | MITRE ATLAS API | ✅ 6 techniques |

---

## 4. Standout Improvements (Office Hours Aligned)

### A. Show Current Run's Correlation in Overview
**Gap:** `orchestrationResult.results.correlation` (campaign_probability, correlation_summary) exists but is NOT shown in Security Overview.  
**Fix:** Add a "Cross-Incident Correlation" card when `campaign_probability > 0.5` — "78% probability this is a coordinated campaign" from the current analysis.

### B. Agentic "Pivot" Demo
**Office hours:** "Show the agent making a decision or pivoting when it hits an obstacle."  
**Suggestion:** In demo video, show Aria answering "Have we seen this before?" after running 2 demos — the correlation/campaign detection is the pivot.

### C. Framing (Office Hours)
- ❌ Don't say: "security monitoring tool", "dashboard", "SIEM replacement"
- ✅ Say: "agentic incident response pipeline", "multi-agent orchestration", "AI-native incident response layer"

### D. Required Tools
Ensure judges see: Strands Agents SDK, MCP (4 servers), Nova Pro/Lite/Micro/Canvas/Sonic, DynamoDB, CloudTrail, IAM, CloudWatch.

---

## 5. Minor Fixes / Polish

1. **Rebuild frontend** — `npm run build` to refresh `dist/index.html` (removes stale 60-second meta)
2. **AttackPathDiagram** — "generic placeholders" message for IP reputation is helpful; keep it
3. **InsightCards** — Fallback text when timeline is blank is generic but acceptable

---

## 6. Demo Flow for Judges

1. **Landing** → Click "Try Demo"
2. **Scenario 1** — Crypto Mining (instant or full AI)
3. **Overview** → Health score, risk, insight cards
4. **Incident History** → Run Scenario 2 (e.g. Privilege Escalation)
5. **Incident History** → "78% probability coordinated campaign" (if correlation works)
6. **Aria** → "Have we seen this attack before?"
7. **Remediation** → Show plan + CloudTrail proof
8. **AI Pipeline Security** → MITRE ATLAS 6 techniques

---

## 7. Files Touched This Review

- `backend/agents/nova_act_agent.py` — Placeholder clarity
- `frontend/index.html` — Already updated (no 60s)
- This document — `CODEBASE_REVIEW.md`
