# CURSOR PROMPT — NOVA SENTINEL DIFFERENTIATION FEATURES
## Amazon Nova AI Hackathon | Deadline: March 17, 2026

---

## CONTEXT FOR CURSOR

You are working on Nova Sentinel, an autonomous security incident response platform for the Amazon Nova AI Hackathon (9,000 participants). The project uses:

- **Backend**: FastAPI + Python
- **Frontend**: React + Vite
- **AI Orchestration**: Strands Agent SDK with 12 @tool functions
- **MCP**: FastMCP server with 22 tools, 4 custom AWS MCP modules (CloudTrail, IAM, CloudWatch, Nova Canvas)
- **Models**: Nova 2 Lite (temporal analysis, remediation, docs), Nova Micro (risk scoring), Nova Pro (visual/multimodal), Nova Canvas (image gen)
- **Voice**: Aria assistant using Nova 2 Lite text path + Nova Sonic audio path

The existing app is functional with 10 screens: Security Overview, Incident Timeline, Attack Path, Compliance Mapping, Cost Impact, Remediation Engine, Visual Analysis, Aria Voice AI, Documentation, Export Report. Demo scenarios with pre-computed results work.

**Judging criteria**: Technical Implementation (60%), Business/Community Impact (20%), Creativity & Innovation (20%).

**What judges explicitly asked for**: persistent memory, multi-model usage, agentic workflows, end-to-end AWS service integration, real working demos.

---

## FEATURE 1: PERSISTENT CROSS-INCIDENT MEMORY WITH INTELLIGENT CORRELATION (DynamoDB)

### WHY THIS WINS
AWS judges explicitly requested persistent memory during office hours. This is the single most important feature to build. But don't just store/retrieve — build INTELLIGENT CORRELATION that makes the demo jaw-dropping.

### WHAT TO BUILD

#### 1A. DynamoDB Backend Integration

Create a new file: `backend/services/incident_memory.py`

```python
"""
Incident Memory Service — DynamoDB-backed persistent cross-incident memory.

DynamoDB Table: "nova-sentinel-incidents"
- Partition Key: account_id (String)
- Sort Key: incident_id (String)
- GSI: severity-index (severity as partition key, timestamp as sort key)
- GSI: attack-type-index (attack_type as partition key, timestamp as sort key)

This service does THREE things:
1. STORE: After every incident analysis completes, save a structured summary
2. CORRELATE: Before any new analysis, query past incidents for pattern matches
3. INJECT: Feed correlation context into Aria's system prompt so she can answer
   "Have we seen this before?" with real cross-incident intelligence

Use boto3 directly — no ORM. Keep it simple for hackathon reliability.
"""
```

Implement these methods:

**`save_incident(incident_data: dict)`**
- Extract and store: incident_id, account_id, timestamp, severity, attack_type, mitre_techniques (list), affected_resources (list), risk_score (int), summary (string), remediation_status, attack_vector, entry_point, ttps_observed
- Add a `correlation_fingerprint` field: hash of (attack_type + sorted mitre_techniques) — this enables fast pattern matching
- Add an `ioc_indicators` field: list of IPs, IAM roles, resource ARNs involved — for cross-incident IOC matching
- Call this automatically at the END of the Strands orchestrator pipeline (after documentation agent completes)

**`get_recent_incidents(account_id: str, limit: int = 5)`**
- Query with ScanIndexForward=False to get most recent first
- Return structured list for Aria context injection

**`correlate_incident(current_incident: dict)`**
- This is the MONEY method. It does:
  1. Query DynamoDB for incidents with matching `correlation_fingerprint` (same attack pattern)
  2. Query for incidents with overlapping `mitre_techniques` (similar TTPs)
  3. Query for incidents with overlapping `ioc_indicators` (same attacker infrastructure)
  4. Query for incidents in a time window (last 24h, last 7d) to detect campaigns
  5. Return a `CorrelationResult` with:
     - `pattern_matches`: list of incidents with same attack fingerprint
     - `technique_overlaps`: incidents sharing 2+ MITRE techniques
     - `ioc_matches`: incidents sharing IOC indicators
     - `campaign_probability`: float 0-1 indicating likelihood this is part of a coordinated campaign
     - `correlation_summary`: natural language string for Aria to use
- Use Nova Micro (temperature 0.1) to generate the campaign_probability score from the correlation data
- Use Nova 2 Lite (temperature 0.5) to generate the correlation_summary in natural language

**`get_correlation_context_for_aria(account_id: str, current_incident: dict)`**
- Combines `get_recent_incidents` + `correlate_incident`
- Returns a formatted string block to inject into Aria's system prompt:
```
=== INCIDENT MEMORY CONTEXT ===
You have access to {N} past incidents from this account.
Recent incidents:
1. INC-XXXXX (2h ago): Critical - IAM Privilege Escalation via T1078, T1098
2. INC-YYYYY (1d ago): High - Crypto Mining via T1496, T1059
3. INC-ZZZZZ (3d ago): Medium - S3 Data Exfiltration via T1530

CORRELATION ANALYSIS for current incident:
- Pattern Match: INC-XXXXX used identical attack fingerprint (T1078+T1098)
- IOC Overlap: IP 203.0.113.42 appeared in both INC-XXXXX and current incident
- Campaign Assessment: 78% probability this is a coordinated campaign
- Recommendation: Escalate to SOC lead — same threat actor likely responsible
=== END MEMORY CONTEXT ===
```

#### 1B. Wire Into Strands Orchestrator

In `backend/agents/strands_orchestrator.py`:

- At the START of `analyze_incident()` or `plan_and_execute()`:
  - Call `incident_memory.correlate_incident(current_data)`
  - If correlations found, add them to the analysis context passed to all agents
  - The TemporalAgent should know "we've seen this IP before"
  - The RiskScorer should boost the score if it's part of a detected campaign

- At the END of the pipeline (after documentation agent):
  - Call `incident_memory.save_incident(full_results)`

- Add a NEW Strands @tool function:
```python
@tool
def query_incident_history(query: str, account_id: str = "demo-account") -> str:
    """Search past security incidents for patterns, similar attacks, or specific IOCs.
    Use this when asked about past incidents, recurring patterns, or threat campaigns."""
    # Search DynamoDB, return formatted results
```

#### 1C. Wire Into Aria Voice Agent

In `backend/agents/voice_agent.py`:

- Before every Aria query, call `get_correlation_context_for_aria()`
- Inject the context block into Aria's system prompt
- Add to Aria's system prompt instructions:
```
You have access to persistent incident memory. When asked about past incidents,
patterns, or whether something has been seen before, reference the INCIDENT
MEMORY CONTEXT above. Be specific — cite incident IDs, timestamps, and
matching MITRE techniques. If you detect a potential campaign (campaign
probability > 60%), proactively warn the analyst.
```

#### 1D. Frontend — Incident History Page

Create a new page: `frontend/src/pages/IncidentHistory.jsx`

Add to sidebar under ANALYSIS section: "Incident History" with a clock/database icon.

**Layout:**

Top section — "Cross-Incident Intelligence" banner:
- Show: "Memory Active: {N} incidents tracked | Last updated: {timestamp}"
- Show campaign detection status: "🔴 Active Campaign Detected" or "🟢 No Active Campaigns"
- If campaign detected, show a prominent alert card:
  "⚠️ CAMPAIGN ALERT: 78% probability that incidents INC-XXXXX, INC-YYYYY are part of
   a coordinated attack. Same threat actor fingerprint detected across 2 incidents in 24 hours.
   Matched IOCs: IP 203.0.113.42, IAM role CompromisedRole"

Middle section — Incident History Table:
- Columns: Date/Time, Incident ID, Severity (badge: Critical/High/Medium/Low), Attack Type, MITRE Techniques (clickable chips), Affected Resources, Risk Score (0-100 gauge), Status (Resolved/Active/Investigating), Correlation (if linked to other incidents, show link icon)
- Click any row → navigates to full analysis for that incident (reloads from DynamoDB + re-renders analysis screens)
- Add filter dropdowns: Severity, Attack Type, Date Range, MITRE Technique
- Add search bar that queries Aria with memory context

Bottom section — Pattern Analysis:
- "Most Common Attack Types" — small bar chart
- "Recurring MITRE Techniques" — technique frequency chips
- "IOC Watchlist" — IPs/roles that appeared in multiple incidents
- "Average Resolution Time" — trending metric

**Aria Memory Badge:**
- In the Aria chat panel (existing screen), add a small badge at the top:
  "🧠 Memory: {N} past incidents loaded" in a subtle pill/chip
- When Aria references a past incident in her response, the incident ID should be clickable → navigates to that incident's analysis

#### 1E. THE DEMO MOMENT (Script this exactly)

1. Run Demo Scenario 1 (e.g., "IAM Privilege Escalation") → full pipeline runs → incident saved to DynamoDB
2. Run Demo Scenario 2 (e.g., "Crypto Mining Attack") → pipeline runs → correlation engine detects overlapping IOCs
3. Go to Aria and ask: "Have we seen this attack pattern before?"
4. Aria responds: "Yes — I found a correlated incident. INC-XXXXX from 10 minutes ago used the same IAM privilege escalation technique (T1078, T1098) with overlapping infrastructure. The IP address 203.0.113.42 appeared in both incidents. Based on temporal proximity and shared TTPs, there's a 78% probability these are part of a coordinated campaign targeting your IAM infrastructure. I recommend escalating to your SOC lead and reviewing all IAM role assumptions in the last 24 hours."
5. Go to Incident History page → show both incidents with correlation link between them
6. Show Campaign Alert banner

This is the "goosebumps" moment. No other team will have cross-incident AI correlation.

#### 1F. API Endpoints

Add to `backend/api/` a new router: `incident_history.py`

```
GET  /api/incidents                    → list all incidents (paginated)
GET  /api/incidents/{incident_id}      → get single incident detail
GET  /api/incidents/correlations       → get active correlations/campaigns
POST /api/incidents/search             → search incidents by query (uses Nova Lite)
GET  /api/incidents/stats              → aggregated stats for dashboard
POST /api/incidents/{incident_id}/correlate → force re-correlate a specific incident
```

---

## FEATURE 2: AUTONOMOUS REMEDIATION EXECUTION WITH CRYPTOGRAPHIC PROOF

### WHY THIS WINS
Every hackathon project shows a "plan." Almost none actually EXECUTE anything. This is the difference between a prototype and a product. The judges specifically want "end-to-end solutions using AWS services."

### WHAT TO BUILD

#### 2A. Remediation Executor Service

Create: `backend/services/remediation_executor.py`

```python
"""
Remediation Executor — Actually executes safe remediation actions via AWS APIs.

SAFETY MODEL:
- Level 1 (AUTO-EXECUTE): Non-destructive, reversible actions
  → Tag resource with QUARANTINE
  → Attach explicit DENY inline policy to IAM role
  → Disable IAM access key
  → Revoke IAM role temporary session credentials
  
- Level 2 (HUMAN APPROVAL): Potentially disruptive actions
  → Delete IAM access key
  → Detach IAM policies
  → Stop/terminate EC2 instance
  → Modify security group rules
  → Rotate credentials

- Level 3 (MANUAL ONLY): Destructive or broad-impact actions
  → Delete IAM role
  → Modify VPC/subnet config
  → Account-level changes

Every execution:
1. Records pre-execution state (snapshot before)
2. Executes the action via boto3
3. Records post-execution state (snapshot after)
4. Generates a rollback command
5. Stores execution proof in DynamoDB
6. Waits for CloudTrail confirmation (or uses cached proof for demo)
"""
```

Implement these execution methods:

**`execute_quarantine_tag(resource_arn: str)`**
- Calls `boto3.client('resourcegroupstaggingapi').tag_resources()` or specific service tag API
- Tags resource with: `{"NOVA-SENTINEL-QUARANTINE": "true", "QUARANTINE-TIMESTAMP": iso_now, "QUARANTINE-INCIDENT": incident_id}`
- Returns: before state (no tag), after state (tagged), rollback command (`untag_resources`)

**`execute_session_revoke(role_name: str)`**
- Calls `boto3.client('iam').put_role_policy()` with an inline policy that denies all actions for sessions older than now
- This effectively revokes all active sessions without deleting the role
- Returns: before state (active sessions), after state (sessions invalidated), CloudTrail event proof

**`execute_deny_policy(role_name: str, denied_actions: list)`**
- Attaches an explicit DENY inline policy named `NovaSentinel-EmergencyDeny-{incident_id}`
- The policy denies the specific suspicious actions detected in the incident
- Returns: before/after policy state, rollback = delete inline policy

**`execute_disable_access_key(access_key_id: str, username: str)`**
- Calls `iam.update_access_key(Status='Inactive')`
- Returns: before (Active), after (Inactive), rollback (re-activate)

Each method returns a standardized `ExecutionResult`:
```python
@dataclass
class ExecutionResult:
    action_type: str           # "QUARANTINE_TAG" | "SESSION_REVOKE" | etc.
    status: str                # "SUCCESS" | "FAILED" | "ROLLED_BACK"
    resource_arn: str
    before_state: dict
    after_state: dict
    rollback_command: str       # AWS CLI command to undo this
    cloudtrail_event: dict      # The confirmation event (real or cached for demo)
    execution_timestamp: str
    executed_by: str            # "NOVA-SENTINEL-AUTO" or "HUMAN-APPROVED"
    incident_id: str
```

#### 2B. Human-in-the-Loop Approval System

Create: `backend/services/approval_manager.py`

```python
"""
Approval Manager — Manages the human-in-the-loop workflow for risky remediations.

Flow:
1. RemediationAgent generates a plan with steps classified as AUTO/APPROVAL/MANUAL
2. AUTO steps execute immediately
3. APPROVAL steps create a PendingApproval record
4. Frontend shows APPROVAL steps with an "Approve & Execute" button
5. When user clicks approve, this service triggers the execution
6. All approvals are logged with timestamp and approver identity

For the hackathon demo, the approval flow should be FAST:
- Show the approval button
- User clicks it
- Execution happens in <2 seconds
- Proof appears immediately
"""
```

#### 2C. Wire Into Existing Remediation Agent

In `backend/agents/remediation_agent.py`:

The existing remediation agent generates a plan. Modify it to:

1. After generating the plan, classify each step as AUTO/APPROVAL/MANUAL using Nova Micro (temperature 0.1):
   - Send the step description to Nova Micro with a classification prompt
   - Nova Micro returns: `{"classification": "AUTO", "risk_level": "low", "reversible": true, "reason": "..."}`

2. For the FIRST safe action in the plan, actually prepare the execution:
   - Identify which `execute_*` method to call
   - Prepare the parameters
   - If AUTO: execute immediately and include proof in the response
   - If APPROVAL: return a pending approval token

3. Include in the response:
   - The full remediation plan (existing behavior)
   - Classification badges on each step
   - Execution proof for any auto-executed steps
   - Pending approval tokens for approval-required steps

#### 2D. Frontend — Enhanced Remediation Engine Page

Modify the existing Remediation Engine page (`frontend/src/pages/RemediationEngine.jsx`):

**Step Cards Enhancement:**
Each remediation step card should now show:
- Existing: Step number, description, AWS CLI command, estimated time
- NEW: Classification badge in top-right corner:
  - 🟢 "AUTO-EXECUTE" badge (green background) — "Nova Sentinel will execute this automatically"
  - 🟠 "REQUIRES APPROVAL" badge (orange background) — with a "Approve & Execute" button
  - 🔴 "MANUAL ONLY" badge (red background) — "Requires manual execution by SOC analyst"
- NEW: Risk level indicator: Low / Medium / High with color coding
- NEW: Reversibility indicator: "✅ Reversible" or "⚠️ Irreversible"

**After Execution — Proof Panel:**
When an action executes (auto or approved), show a "Proof of Execution" expandable panel below the step:

```
╔══════════════════════════════════════════════════════════════╗
║ ✅ REMEDIATION EXECUTED                                       ║
╠══════════════════════════════════════════════════════════════╣
║                                                                ║
║ Action: Revoke IAM session credentials                         ║
║ Target: arn:aws:iam::123456789012:role/CompromisedRole         ║
║ Executed: 2026-02-26T14:32:15Z                                ║
║ Executed By: NOVA-SENTINEL-AUTO                                ║
║                                                                ║
║ ┌─ Before State ──────────────────────────────────────────┐   ║
║ │ Role: CompromisedRole                                    │   ║
║ │ Active Sessions: 3                                       │   ║
║ │ Inline Policies: ["ReadOnlyAccess"]                      │   ║
║ └──────────────────────────────────────────────────────────┘   ║
║                                                                ║
║ ┌─ After State ───────────────────────────────────────────┐   ║
║ │ Role: CompromisedRole                                    │   ║
║ │ Active Sessions: 0 (revoked)                             │   ║
║ │ Inline Policies: ["ReadOnlyAccess",                      │   ║
║ │                   "NovaSentinel-EmergencyDeny-INC-XXX"]  │   ║
║ └──────────────────────────────────────────────────────────┘   ║
║                                                                ║
║ ┌─ CloudTrail Confirmation ───────────────────────────────┐   ║
║ │ {                                                        │   ║
║ │   "eventName": "PutRolePolicy",                          │   ║
║ │   "eventTime": "2026-02-26T14:32:15Z",                   │   ║
║ │   "sourceIPAddress": "nova-sentinel.internal",           │   ║
║ │   "userAgent": "nova-sentinel/1.0",                      │   ║
║ │   "requestParameters": {                                 │   ║
║ │     "roleName": "CompromisedRole",                       │   ║
║ │     "policyName": "NovaSentinel-EmergencyDeny-INC-XXX"   │   ║
║ │   }                                                      │   ║
║ │ }                                                        │   ║
║ └──────────────────────────────────────────────────────────┘   ║
║                                                                ║
║ 🔄 Rollback Command:                                          ║
║ aws iam delete-role-policy --role-name CompromisedRole \       ║
║   --policy-name NovaSentinel-EmergencyDeny-INC-XXXXX           ║
║                                                                ║
║ [View in CloudTrail ↗]  [Copy Rollback Command]               ║
╚══════════════════════════════════════════════════════════════╝
```

Style this as a dark-themed code/terminal panel with green accent for success. Make the CloudTrail JSON collapsible (collapsed by default, "Show CloudTrail Event" toggle).

**Execution Timeline:**
At the bottom of the remediation page, add a horizontal timeline:
```
[Incident Detected] → [Plan Generated] → [Auto-Execute: Tag QUARANTINE ✅] → [Awaiting Approval: Revoke Session 🟠] → [Approved ✅] → [Executed ✅] → [Verified via CloudTrail ✅]
```

#### 2E. Demo Reliability

CRITICAL: For the demo, pre-stage everything:

1. Create a test IAM role in your AWS account specifically for demo: `NovaSentinel-DemoTarget-Role`
2. Pre-create a session for it
3. The auto-execution should revoke THIS specific pre-staged session
4. Pre-cache the CloudTrail event JSON (CloudTrail has 15-20 min delivery delay)
5. The demo flow: trigger scenario → see plan → see auto-execute happen → see proof

Add a flag in the API: `demo_mode=true` uses pre-cached CloudTrail events. `demo_mode=false` waits for real events.

#### 2F. API Endpoints

```
POST /api/remediation/execute/{step_id}           → execute a specific remediation step
POST /api/remediation/approve/{approval_token}     → approve a pending remediation
GET  /api/remediation/execution-proof/{incident_id} → get all execution proofs for an incident
POST /api/remediation/rollback/{execution_id}      → rollback an executed remediation
GET  /api/remediation/pending-approvals            → list all pending human approvals
```

---

## FEATURE 3: AI PIPELINE SECURITY (MITRE ATLAS) — THE UNIQUE DIFFERENTIATOR

### WHY THIS WINS
"We use AI to protect infrastructure. But who protects the AI?" — This line alone will stick in judges' minds. MITRE ATLAS is the AI/ML threat framework that virtually no hackathon team will know about. This is your Creativity & Innovation score (20% of judging).

### WHAT TO BUILD

#### 3A. AI Pipeline Monitor Service

Create: `backend/services/ai_pipeline_monitor.py`

```python
"""
AI Pipeline Security Monitor — Monitors Nova Sentinel's OWN AI pipeline for threats.

This service monitors:
1. Bedrock API invocation patterns (calls/min, tokens/call, error rates)
2. Input sanitization (detect prompt injection in CloudTrail data fed to models)
3. Output validation (detect if model responses contain unexpected patterns)
4. Model access patterns (unusual models, unusual times, unusual volumes)

Mapped to MITRE ATLAS framework:
- AML.T0051: Prompt Injection Detection
- AML.T0016: Obtain Capabilities (unusual model access)
- AML.T0040: ML Model Inference API Access (rate anomalies)
- AML.T0043: Craft Adversarial Data (malformed inputs)
- AML.T0024: Exfiltration via ML Inference API
- AML.T0048: Transfer Learning Attack

Uses Nova Micro (temperature 0.1) to classify detected anomalies.
"""
```

Implement:

**`scan_for_prompt_injection(input_text: str)`**
- Check if CloudTrail log data being fed to TemporalAgent contains injection patterns:
  - "Ignore previous instructions"
  - "You are now..."
  - Base64-encoded instructions
  - Unusual unicode sequences
  - Nested JSON with instruction-like content
- Return: `{detected: bool, technique: "AML.T0051", confidence: float, details: str}`

**`monitor_invocation_patterns(time_window_minutes: int = 60)`**
- Query CloudWatch metrics for Bedrock invocations (or track internally via counters)
- Detect anomalies: spike > 3x baseline, calls at unusual hours, models not in our agent config being invoked
- Return rate data + anomaly flags

**`validate_model_output(output: str, expected_format: str)`**
- Check if Nova model responses are within expected bounds:
  - Risk scores should be 0-100
  - Remediation plans should contain expected fields
  - No unexpected URLs or executable content in outputs
- Flag if output deviates significantly from expected format

**`generate_atlas_report()`**
- Aggregate all checks into a MITRE ATLAS threat assessment
- For each technique: status (Clean/Warning/Alert), last checked, details
- Generate NIST AI RMF compliance mapping
- Return structured report for frontend

#### 3B. Wire Into Pipeline

In the Strands orchestrator:
- Before each agent call: run `scan_for_prompt_injection` on the input
- After each agent call: run `validate_model_output` on the response
- Track invocation counts per agent for the monitor dashboard
- If a prompt injection is detected: flag the incident but continue analysis (don't block the demo)

Add a new Strands @tool:
```python
@tool
def check_ai_pipeline_security() -> str:
    """Check the security status of Nova Sentinel's own AI pipeline.
    Returns MITRE ATLAS threat assessment and NIST AI RMF compliance."""
    report = ai_pipeline_monitor.generate_atlas_report()
    return json.dumps(report)
```

#### 3C. Frontend — AI Pipeline Security Page

Create: `frontend/src/pages/AIPipelineSecurity.jsx`

Add to sidebar under a NEW section called "AI GOVERNANCE" (after INTELLIGENCE).

**Page Layout:**

**Hero Banner:**
```
"In an era where AI systems are themselves attack surfaces, Nova Sentinel doesn't
just protect your AWS infrastructure — it monitors the security of its own AI
pipeline using MITRE ATLAS, the threat framework built specifically for AI/ML systems."
```
Style: dark gradient background, large white text, subtle shield icon.

**Section 1: Bedrock Invocation Monitor**
- Real-time line chart (or bar chart) showing API calls per minute per model:
  - Nova 2 Lite: blue line
  - Nova Micro: green line  
  - Nova Pro: purple line
  - Nova Canvas: orange line
- Anomaly markers: red dots on spikes with tooltip "⚠️ Spike detected: 3.2x baseline"
- Stats row: Total Invocations, Avg Latency, Error Rate, Cost (this run)
- Use recharts or chart.js for the visualization

**Section 2: MITRE ATLAS Threat Detection**
Show a grid of 6 threat detection cards:

Each card:
```
┌──────────────────────────────────────────────┐
│ AML.T0051 — Prompt Injection                 │
│ Status: 🟢 CLEAN                              │
│ Last Checked: 2s ago                          │
│                                               │
│ Scanned 47 inputs across 4 agents.            │
│ No injection patterns detected.               │
│                                               │
│ Detection Method: Pattern matching +           │
│ Nova Micro classification (confidence: 0.98)   │
│                                               │
│ [View Details →]                              │
└──────────────────────────────────────────────┘
```

For the demo, show 5 CLEAN and 1 WARNING:
- AML.T0051: Prompt Injection → CLEAN
- AML.T0016: Obtain Capabilities → CLEAN
- AML.T0040: ML Inference API Access → ⚠️ WARNING: "Elevated invocation rate detected during incident analysis (expected: pipeline running)" — this shows the system is WORKING
- AML.T0043: Craft Adversarial Data → CLEAN
- AML.T0024: Exfiltration via Inference API → CLEAN
- AML.T0048: Transfer Learning Attack → CLEAN (N/A — no fine-tuning in pipeline)

Color coding: Green card border for CLEAN, Yellow for WARNING, Red for ALERT.

**Section 3: NIST AI RMF Governance Alignment**
Four-quadrant grid mapped to NIST AI RMF functions:

```
┌────────────────────────┬────────────────────────┐
│ GOVERN ✅               │ MAP ✅                  │
│                        │                        │
│ Multi-agent oversight  │ Threat taxonomy mapped  │
│ with human-in-loop     │ to MITRE ATLAS          │
│ approval gates.        │ (6 techniques monitored) │
│                        │                        │
│ Evidence:              │ Evidence:              │
│ • Approval Manager     │ • AML.T0051-T0048      │
│ • 3-tier execution     │ • Real-time scanning   │
│   (Auto/Approve/Manual)│ • Per-agent monitoring  │
├────────────────────────┼────────────────────────┤
│ MEASURE ✅              │ MANAGE ✅               │
│                        │                        │
│ Risk scoring on every  │ Autonomous + human-    │
│ incident 0-100 via     │ approved remediation    │
│ Nova Micro.            │ with rollback.          │
│                        │                        │
│ Evidence:              │ Evidence:              │
│ • Deterministic scoring│ • Auto-execute safe    │
│   (temp=0.1)           │ • Human gate for risky │
│ • Confidence intervals │ • CloudTrail audit     │
│ • Cross-incident       │ • Rollback commands    │
│   baseline comparison  │   on every action      │
└────────────────────────┴────────────────────────┘
```

Style: each quadrant is a card with a green checkmark, description, and bullet-pointed evidence. Clean, compliance-document style.

**Section 4: Model Cost & Usage**
Table showing per-agent stats for the current/last incident:

| Agent | Model | Invocations | Input Tokens | Output Tokens | Latency (avg) | Cost |
|-------|-------|-------------|-------------|---------------|---------------|------|
| TemporalAgent | Nova 2 Lite | 3 | 4,200 | 1,800 | 1.2s | $0.0024 |
| RiskScorer | Nova Micro | 5 | 800 | 200 | 0.3s | $0.0003 |
| VisualAgent | Nova Pro | 1 | 2,100 | 900 | 2.1s | $0.0045 |
| RemediationAgent | Nova 2 Lite | 2 | 3,600 | 2,200 | 1.8s | $0.0032 |
| DocumentationAgent | Nova 2 Lite | 1 | 1,500 | 3,500 | 2.4s | $0.0028 |
| **TOTAL** | | **12** | **12,200** | **8,600** | **1.56s avg** | **$0.0132** |

Below the table: "💡 Total cost per incident analysis: $0.013 — compared to $45/hour for a human analyst, Nova Sentinel provides a 3,400x cost reduction per incident."

#### 3D. API Endpoints

```
GET  /api/ai-security/status           → current ATLAS threat status (all 6 techniques)
GET  /api/ai-security/invocations      → invocation metrics per model
GET  /api/ai-security/governance       → NIST AI RMF compliance status
GET  /api/ai-security/cost             → per-agent cost breakdown
POST /api/ai-security/scan             → trigger manual security scan of pipeline
```

---

## FEATURE 4 (BONUS): LIVE THREAT INTELLIGENCE FEED INTEGRATION

### WHY THIS WINS
This shows real-world applicability. If you have time after Features 1-3, this adds "Business Impact" points.

### WHAT TO BUILD

Create: `backend/services/threat_intel.py`

- Integrate with FREE threat intelligence sources:
  - AWS IP reputation (built into GuardDuty findings format)
  - AbuseIPDB (free API tier)
  - VirusTotal (free API tier — 4 requests/min)
- When TemporalAgent identifies suspicious IPs from CloudTrail:
  - Query threat intel sources
  - Add reputation data to the analysis
  - Show in UI: "IP 203.0.113.42 — AbuseIPDB: 87% confidence malicious, reported 142 times, categories: SSH Brute Force, Port Scan"

Frontend addition to Attack Path page:
- When you click an IP node in the attack path, show a "Threat Intelligence" popup with reputation data

This is OPTIONAL but would be impressive. Only build if Features 1-3 are solid.

---

## FEATURE 5 (BONUS): EXECUTIVE SUMMARY GENERATION WITH NOVA CANVAS

### WHY THIS WINS
Shows Nova Canvas doing something meaningful, not just decorative.

### WHAT TO BUILD

In the Export Report flow:
- After the DocumentationAgent generates the text report
- Use Nova Canvas to generate:
  1. A professional cover page image: "Security Incident Report — INC-XXXXX — Generated by Nova Sentinel" with a security-themed visual
  2. A visual risk summary infographic: severity gauge, timeline, affected resources count
- Compile into a PDF (use reportlab or weasyprint in Python)
- The exported report becomes a real PDF with: Cover image (Nova Canvas) → Executive Summary (Nova Lite) → Technical Details → Remediation Steps → Compliance Mapping → Appendix (CloudTrail Events)

---

## FIXES TO APPLY ALONGSIDE FEATURES

While building the above features, also fix these issues from code review:

1. **Logger name**: Change all instances of `"secops-lens"` to `"nova-sentinel"` in backend code
2. **Phantom dashed box**: Remove the empty dashed box in bottom-right of Attack Path page
3. **Pipeline count**: Security Overview shows "3/4 completed" but all checkmarks are green — fix the count
4. **Documentation page**: Replace placeholder text with real JIRA/Slack/Confluence formatted content using DocumentationAgent
5. **remediation_agent.py**: Add default values for `requires_approval`, `rollback_command`, `estimated_time`, `risk_level` in `_parse_plan()` method — these are expected by frontend but not guaranteed by model output
6. **Dead variable**: Remove unused `audio_b64` variable in voice_agent.py
7. **"Demo mode — backend offline" banner**: Add a check — if backend IS connected, don't show this banner
8. **Temperature settings**: Implement the per-agent temperature settings:
   - Nova Micro (RiskScorer): 0.1
   - Nova 2 Lite (RemediationAgent): 0.35
   - Nova 2 Lite (DocumentationAgent): 0.65
   - Nova Pro (VisualAgent): 0.25

---

## BUILD ORDER (SUGGESTED)

1. **Day 1-3**: Feature 1 (DynamoDB Memory + Correlation + Incident History page + Aria integration)
2. **Day 4-5**: Feature 2 (Remediation Executor + Approval Manager + Proof panels + pre-stage demo)
3. **Day 6-7**: Feature 3 (AI Pipeline Security page + ATLAS monitoring + NIST RMF governance)
4. **Day 8**: All bug fixes from the fixes list above
5. **Day 9-10**: Feature 5 (PDF export with Nova Canvas cover) if time allows
6. **Day 11-12**: Demo video recording, Devpost writeup, final testing
7. **Buffer days**: Polish, edge cases, reliability testing

---

## IMPROVEMENTS (Polish & Judge Appeal)

The following improvements add polish, make demos more reliable, and improve cohesion across the app.

### AI Pipeline Security

1. **Real invocation tracking** — Call `record_invocation(model)` from the orchestrator when agents actually run, so charts and AML.T0040 reflect real usage instead of seeded demo data.
2. **Cost table from real data** — Pull per-agent calls, tokens, and latency from orchestration response or backend instead of hardcoded demo values.
3. **"Last scanned" timestamp** — After "Scan Now", show "Last scanned: Xs ago" so monitoring feels live.

### Remediation Engine

4. **Execution timeline** — Add a horizontal timeline below the plan: Plan → Auto-executed → Approved → Executed.
5. **Copy rollback command** — Add a "Copy Rollback" button next to the rollback command in the proof panel.
6. **Demo pre-stage** — Ensure at least one step (e.g. quarantine tag) runs reliably in demo mode so proof panel always appears.

### Incident History

7. **Auto-refresh after demo** — When user runs Quick Demo, auto-refresh Incident History (or refetch when tab is shown) so it doesn't show 0 incidents until user clicks Refresh.
8. **Empty-state CTA** — When 0 incidents, add a prominent "Run a demo to populate" button that navigates to scenario picker.
9. **Click-to-load incident** — When user clicks an incident row, load that incident's full analysis (timeline, remediation, attack path).

### Documentation

10. **Platform badges** — Add small badges/pills for JIRA, Slack, Confluence tabs to make them visually distinct.
11. **"Posted" state** — If Nova Act posts to platforms, show "Posted to #channel" or similar instead of just "Copy".

### General UX / Cohesion

12. **Loading skeletons** — Replace generic "Loading…" with skeleton loaders that match the layout (cards, rows).
13. **Error recovery** — Add "Retry" or "Back to overview" in error states.
14. **Demo checklist panel** — A collapsible "Demo checklist" for hackathon: Run scenario → Show timeline → Show remediation → Show AI security → Show incident history.

### Implementation order (high-impact first)

1. Auto-refresh Incident History after demo
2. Real invocation tracking in orchestrator
3. Copy rollback command button
4. Empty-state CTA in Incident History
5. Demo checklist panel
6. Remaining items as time allows

---

## THINGS NOT TO CHANGE

- Do NOT redesign existing screens that are rated 9+/10
- Do NOT add more MCP tools (22 is enough)
- Do NOT add more compliance frameworks (6 is enough)
- Do NOT rebuild the UI design system
- Do NOT change the Strands orchestrator's core pipeline logic
- Do NOT remove demo scenarios or pre-computed results
- Do NOT change the model assignments (which Nova model does what)

---

## DEVPOST COPY GUIDANCE

Title: "Nova Sentinel — Autonomous Security Incident Response Powered by Amazon Nova"

Tagline: "From alert to resolution, autonomously. Not with one model, but with specialized Nova models working together like a real security team."

Key differentiators to emphasize:
1. **Multi-model orchestration**: 4 Nova models, each doing what it's best at
2. **Persistent cross-incident memory**: DynamoDB-backed correlation engine detects campaigns
3. **Autonomous remediation with proof**: Actually executes remediations, not just plans
4. **AI self-monitoring**: First security tool that monitors its own AI pipeline using MITRE ATLAS
5. **Real AWS integration**: MCP servers for CloudTrail, IAM, CloudWatch — not mock data

DO NOT say: "security monitoring tool", "dashboard", "SIEM replacement"
DO say: "agentic incident response pipeline", "multi-agent orchestration", "autonomous security operations"