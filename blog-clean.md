# wolfir: The AI Security Platform That Watches Itself

*Seven Amazon Nova capabilities, Strands Agents SDK, and MITRE ATLAS self-monitoring — every architectural decision explained.*

---

## The Problem

Every security platform today runs on AI. GuardDuty uses ML for behavioral anomaly detection. Security Hub correlates findings from Inspector, Macie, and dozens of partner tools. IAM Access Analyzer flags overly permissive policies. The signal infrastructure AWS has built is genuinely exceptional.

But I kept asking myself one question while building wolfir: *what happens when someone targets the AI itself?*

If an unidentified principal can embed instructions into the data my models process, misuse my Bedrock inference API, trigger runaway invocations, or extract sensitive account patterns through model outputs — my security tool becomes the risk surface. MITRE built the ATLAS framework specifically to catalogue AI and ML system weaknesses. Most production teams do not deploy any monitoring against it.

There is a second gap. Prophet Security's 2025 AI in SOC Survey puts the average SOC at 960+ alerts per day, with 40% going completely uninvestigated. The problem is not detection. It is the time cost of turning detection into action — correlating events, building a timeline, figuring out root cause, mapping the blast radius, writing a remediation plan with real AWS CLI commands, and documenting everything for the team. That part is still almost entirely manual.

wolfir exists to close both gaps at once: **cloud security and AI security, one platform, where each pillar watches the other.**

---

### System Architecture

![wolfir comprehensive platform architecture](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-architecture-v2.png)

*Figure 1 — wolfir full platform architecture. Top: four input sources (CloudTrail events, architecture diagrams, demo scenarios, CloudFormation ChangeSets). Middle: the 5-agent Strands pipeline with context pruning at every handoff, plus the autonomous Agentic Query mode. Bottom left: the complete 12-feature Incident Response Package. Bottom right: the AI Security Pillar monitoring the pipeline with MITRE ATLAS + OWASP + NIST AI RMF. Foundation: Amazon Bedrock with all 7 Nova capabilities, Guardrails, and Knowledge Base.*

### Why "wolfir"?

**wolf + IR** (Incident Response). A wolf hunts in a pack — coordinated, each member with a role, sharing context, moving from signal to resolution together. That is exactly how the multi-agent pipeline works: seven Nova capabilities, each specialized, sharing structured state, going from raw CloudTrail events to a complete incident response package.

---

## What wolfir Does

wolfir is an autonomous security platform for AWS built on two architecturally connected pillars.

### Pillar 1 — Cloud Security, End to End

CloudTrail events flow in — from a live AWS account or one of three demo scenarios — and a five-agent Nova pipeline fires: Detect → Investigate → Classify → Remediate → Document. The output is a complete Security Response Package:

- **Forensic event timeline** with root cause and event chain analysis
- **Interactive event path diagram** — a React Flow graph where every event is a clickable node showing risk score, MITRE Framework technique, source IP, timestamp, and the IAM control that would have blocked it
- **Blast Radius Simulator** — given the affected identity, runs IAM policy simulation to map every AWS service, resource, and data store reachable from that identity, tiered by severity with financial impact per resource
- **AWS Organizations Dashboard** — full org tree with real-time risk level indicators, cross-account cross-resource movement detection, and SCP gap analysis across OUs
- **Per-event risk scores** with MITRE Framework technique mapping and confidence intervals
- **Compliance mapping** across CIS AWS Foundations, NIST 800-53, SOC 2 Type II, PCI-DSS v4.0, SOX IT Controls, and HIPAA — each finding mapped to specific control IDs automatically
- **Cost impact** using the IBM Cost of Data Exposure 2024 methodology — direct compute cost, data exposure per record, incident response labor, and regulatory fine exposure across GDPR, CCPA, HIPAA
- **Remediation plan** with real, executable AWS CLI commands, three-tier human-in-the-loop approval gates, before/after state snapshots, and one-click rollback
- **Documentation** ready for JIRA tickets, Slack alerts, and Confluence postmortems
- **SLA Tracker** — P1/P2 incident response SLA monitoring with real-time countdown and SLA miss prediction
- **ChangeSet Analysis** — CloudFormation change risk assessment before deployment, rated by risk tier and mapped to compliance controls
- **Cross-incident memory** — every finding persisted to DynamoDB with behavioral fingerprints; Nova Embeddings compute semantic similarity on every new finding against all past ones

Run demo scenario 1 then scenario 2 and wolfir surfaces: *"78% probability this is the same unidentified principal"* — overlapping IP range, similar IAM enumeration sequence, findings four days apart.

### Pillar 2 — AI Security: wolfir Watches Itself

MITRE ATLAS monitoring runs on the Bedrock pipeline in real time. Every Bedrock invocation powering the analysis above is simultaneously monitored by wolfir's own AI security layer:

- **AML.T0051 — Instruction Integrity Check** — pattern scanning against 12 known signatures on every user input before it reaches the Strands Agent
- **AML.T0016 — Ungoverned Model Access** — every Bedrock invocation recorded with model ID; non-approved model IDs flagged immediately
- **AML.T0040 — ML Inference API Access** — invocation rate monitoring with baseline comparison; surges annotated as PIPELINE_RUN or flagged as anomalous
- **AML.T0043 — Crafted Data** — input validation on CloudTrail event structure integrity before events reach the temporal agent
- **AML.T0024 — Ungoverned Data Transfer** — output scanning on every model response for AWS account IDs, resource ARNs, access key patterns, and credential-shaped strings
- **AML.T0048 — Model Tampering** — correctly flagged as N/A; wolfir uses Bedrock foundation models without fine-tuning. Honest non-applicability is more credible than a fabricated detection.

OWASP LLM Top 10 posture, Ungoverned AI detection, NIST AI RMF alignment, EU AI Act readiness, AI-BOM, and Bedrock Guardrails coverage audit complete the picture.

**When you run an incident analysis, the AI Security Posture dashboard updates based on the actual Bedrock invocations that just happened.** Cloud security and AI security share a live data plane — connected, not bolted together.

**Live demo:** [wolfir.vercel.app](https://wolfir.vercel.app) — explore with pre-built scenarios, then connect your AWS account for real analysis.
**Source code:** [github.com/bhavikam28/wolfir](https://github.com/bhavikam28/wolfir) — MIT licensed, ~47K lines.

---

## Infrastructure: Terraform, Docker, and a Deliberate Stack Choice

Before getting into AI — let's talk about infrastructure, because it shaped every decision above it.

### Everything is Infrastructure as Code (Terraform)

wolfir's AWS infrastructure is fully defined in Terraform. The primary Terraform module (`terraform/main.tf`) deploys:

- **S3 bucket** for the Bedrock Knowledge Base source documents — the security playbook library
- **S3 server-side encryption** with AES256, enforced at the bucket level
- **Block public access** on all four dimensions
- **Automated playbook upload** — six curated Markdown playbooks uploaded as S3 objects during `terraform apply`, covering IAM access expansion, ungoverned compute usage, data incident response, non-compliant access, OWASP LLM response, and Prompt Guard

```hcl
resource "aws_s3_object" "playbooks" {
  for_each = fileset("${path.module}/../playbooks", "**/*.md")

  bucket       = aws_s3_bucket.kb_source.id
  key          = "playbooks/${each.key}"
  source       = "${path.module}/../playbooks/${each.key}"
  content_type = "text/markdown"
  etag         = filemd5("${path.module}/../playbooks/${each.key}")
}
```

The `etag` on each object means Terraform only re-uploads playbooks that actually changed — deterministic, idempotent deploys.

After `terraform apply`, you connect the bucket to a Bedrock Knowledge Base via the console (S3 Vectors, Quick Create), set `KNOWLEDGE_BASE_ID` in `.env`, and wolfir's Agentic Query gains RAG-powered playbook retrieval. The Knowledge Base is optional — wolfir works without it, falling back to inline prompts. But with it, the Agentic Query agent can cite specific playbook excerpts in its responses.

Why Terraform instead of CloudFormation? Familiarity, the provider ecosystem, and the ability to tear down and rebuild the full environment in under 10 minutes — invaluable for testing and for eventually supporting dedicated customer deployments.

### Docker: Zero-Friction Local Setup

The entire stack runs with a single command:

```bash
docker compose up
```

`docker-compose.yml` defines two services:

**Backend** — `python:3.11-slim` container, FastAPI served by uvicorn, exposes port 8000. AWS credentials are provided either via environment variables or by mounting `~/.aws` as a read-only volume:

```yaml
volumes:
  - ${USERPROFILE:-~}/.aws:/root/.aws:ro
```

This is deliberate. wolfir never asks you to paste credentials into a UI. Either use existing AWS CLI profiles (mounted volume) or set standard AWS environment variables. The credentials stay on your machine.

**Frontend** — Vite dev server on port 5173, depends on backend service, `VITE_API_URL` pointed at the backend container.

Both services have `restart: unless-stopped` and the backend has a health check on `/health` — if FastAPI is not responding, Docker restarts it rather than failing silently. The Dockerfile uses `python:3.11-slim` (not `-alpine`) to avoid pip build failures on packages with C extensions.

**Why Docker for a hackathon?** Because "it works on my machine" is not a demo strategy. A judge who clones the repo and runs `docker compose up` gets a running stack in under 2 minutes without installing Python, configuring virtualenvs, or debugging dependency conflicts.

### Frontend: Vercel

The React/TypeScript frontend deploys to Vercel via `vercel.json`. When the Vercel deployment cannot reach the FastAPI backend — because the backend runs locally or on EC2 — it falls back to client-side demo mode automatically. Same build artifact, same code, two modes of operation.

---

## How I Built It: 7 Amazon Nova Capabilities

The first version of wolfir was a single-model system. One Nova 2 Lite call received CloudTrail events and was asked to produce a timeline, risk scores, remediation steps, and documentation simultaneously. It failed fast.

The failure was not capability — it was focus. A model trying to simultaneously reason about forensic timelines, assign numerical risk scores with consistency, generate executable CLI commands, and write Confluence-ready documentation produced mediocre output on all four tasks. Context bloated past 16K tokens on any realistic incident. Remediation steps contradicted the timeline. Documentation used different severity ratings than the risk scores.

The insight: these are genuinely different cognitive tasks. Each requires different attention, different speed/accuracy tradeoffs, and in some cases a different modality entirely. The seven-model architecture followed directly from this.

### 1. Amazon Nova 2 Lite — The Reasoning Engine
`us.amazon.nova-2-lite-v1:0`

The workhorse. Handles forensic timeline analysis (building incident narratives from raw CloudTrail events), remediation plan generation (step-by-step AWS CLI commands with rollback procedures), documentation generation (JIRA tickets, Slack alerts, Confluence postmortems), the Aria voice assistant, and Strands Agent orchestration for Agentic Query. Extended thinking at medium effort is used for agentic workflows — this measurably improved tool selection accuracy.

Nova 2 Lite handles the longest context windows in the pipeline. It receives structured timeline summaries rather than raw events — the context pruning layer ensures it always operates on exactly what it needs, nothing more.

### 2. Amazon Nova Micro — The Risk Classifier
`amazon.nova-micro-v1:0`

Risk scoring at `temperature=0.1` — very low for determinism. Each CloudTrail event is classified as LOW/MEDIUM/HIGH/CRITICAL with a confidence score and MITRE Framework technique mapping.

Three parallel calls run via `asyncio.gather()` and return a confidence interval: *"77/100 (CI: 70–84)"* is more honest than a single number, because a single number implies precision that language models do not have.

Hard calibration adjustments handle known miscalibrations:

```python
# Nova Micro consistently overcalls these — domain knowledge backstops the model
CALIBRATION_ADJUSTMENTS = {
    "GetCallerIdentity": {"max_score": 30, "reason": "Routine identity check"},
    "CreatePolicyVersion": {"risk_floor": 75, "reason": "Policy modification — HIGH minimum"},
    "PutLogEvents": {"max_score": 20, "reason": "Logging routine — not a risk signal"},
}
```

The model is excellent at pattern recognition. Domain-specific calibration makes it accurate. Neither alone is sufficient.

### 3. Amazon Nova Pro — Visual Analysis
`amazon.nova-pro-v1:0`

Upload an architecture diagram and Nova Pro performs a STRIDE risk assessment — reading actual network topology, identifying security groups, load balancers, databases, API gateways, and reasoning about risk surfaces across all six STRIDE categories. This is genuinely multimodal work. Text-only models cannot read a VPC diagram. Nova Pro can. A structured risk model in under 30 seconds from a PNG.

### 4. Amazon Nova Canvas — Report Imagery
`amazon.nova-canvas-v1:0`

Generates incident-specific cover images for exported PDF reports. An ungoverned compute usage incident gets a different cover than a data exposure incident. This is not decoration — it signals that the output is a real security deliverable, not a plain text export. Each image is generated with incident type, severity, and affected services as context parameters.

### 5. Amazon Nova 2 Sonic — Voice Interaction
`amazon.nova-2-sonic-v1:0`

Powers Aria's voice interface with WebSocket streaming architecture. Real-time speech-to-speech conversation about active incidents. Ask "what is the root cause?" while running remediation in another terminal. Hands-free incident Q&A matters when you have four browser tabs open.

### 6. Nova Act — Browser Automation
`nova-act SDK`

Click "Generate Nova Act Plan" in the Remediation tab and wolfir generates executable browser automation instructions for AWS Console navigation and JIRA ticket creation. Nova Act translates "revoke this IAM policy, open this Security Hub finding, create this ticket" into specific step-by-step browser actions.

### 7. Nova Multimodal Embeddings — Cross-Incident Memory
`amazon.nova-2-multimodal-embeddings-v1:0`

After every incident analysis, a structured behavioral summary is embedded at 384 dimensions and stored in DynamoDB. When a new incident arrives, it is embedded and compared via cosine similarity against all past incidents:

```python
async def embed_text(text: str, dimension: int = 384) -> Optional[List[float]]:
    body = {
        "taskType": "SINGLE_EMBEDDING",
        "singleEmbeddingParams": {
            "embeddingPurpose": "TEXT_RETRIEVAL",
            "embeddingDimension": dimension,
            "text": {"truncationMode": "END", "value": text[:8000]},
        },
    }
    response = await asyncio.to_thread(
        client.invoke_model, body=json.dumps(body),
        modelId="amazon.nova-2-multimodal-embeddings-v1:0",
        ...
    )
```

Structured feature vectors (incident type, MITRE techniques, IP ranges, IAM patterns) are embedded rather than prose descriptions. The model finds semantic patterns in incident behavior, not surface-level text similarity. This is what catches the second occurrence of a campaign described differently the first time.

The campaign probability formula combines three signals: SHA-256 fingerprint matching (incident type + sorted MITRE technique list), MITRE technique overlap count (≥2 shared techniques flags a match), and cosine similarity from Nova Embeddings — all capped at 0.95 to prevent overconfident attribution.

---

## Architecture Deep Dive

### The Pipeline: Dependency Order with Parallelism

![wolfir 5-agent pipeline flow](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-pipeline-flow-v2.png)

*Figure 2 — wolfir's 5-agent pipeline in full detail. Step 1 (Temporal, ~8s): incident chain analysis, root cause, Blast Radius via IAM policy simulation, Prompt Guard scan on event fields, and the conditional Agentic branch step. Step 2 (Risk Scoring, ~4s): Nova Micro x3 parallel via asyncio.gather(), MITRE Framework mapping, confidence intervals, calibration adjustments. Steps 3+4 (Remediation + Documentation, concurrent, ~5–6s): run in parallel since both depend only on the timeline output, not each other. Step 5 (Save and Correlate, ~2s): 4-signal correlation via DynamoDB + Nova Embeddings. Total: ~15–25s end to end on ~12K tokens (versus ~40K without context pruning).*

**Step 1 — Temporal Analysis (Nova 2 Lite)**

CloudTrail events are filtered to six essential fields before hitting the model: `eventTime`, `eventName`, `sourceIPAddress`, `userIdentity` summary, `errorCode`, `requestParameters`. The `filter_interesting_events()` function removes routine background:

```python
ROUTINE_EVENTS = {
    "PutLogEvents", "GetCallerIdentity", "AssumeRole",  # service-to-service
    "DescribeInstances", "ListBuckets",                 # read-only inventory
    "PutMetricData", "PutMetricAlarm",                  # CloudWatch background
}
```

Feed 50 routine CloudTrail events to a language model and ask "what is the incident pattern?" — it will invent one. Confidently. With specific MITRE Framework technique mappings. Filtering reduces the event set to signals that actually indicate risk activity. When all events are routine, the pipeline returns "no risk detected" instead of fabricating a story. That reliability is worth more than covering every possible event.

**Agentic Branch Step (conditional)**

If timeline confidence drops below 0.3, the pipeline automatically runs a CloudTrail anomaly scan via the CloudTrail MCP server for additional signal before proceeding to risk scoring. This is a runtime decision — the orchestrator evaluates its own confidence and chooses to gather more data.

**Step 2 — Risk Scoring (Nova Micro, parallel)**

Up to five events scored simultaneously via `asyncio.gather()`. Each gets risk level, confidence interval, and MITRE Framework mapping.

**Steps 3 + 4 — Remediation + Documentation (Nova 2 Lite, concurrent)**

Both depend only on the timeline output, not on each other. They run concurrently. The remediation agent receives structured summaries — never raw events.

**Step 5 — Save to DynamoDB**

Complete incident object saved for future correlation using the 4-signal behavioral fingerprint system.

### Context Pruning: The Seam Between Agents

The most important architectural decision in the pipeline was not model selection — it was how data moves between agents. The naive approach (full output from one agent to the next) collapses at any realistic incident size. 80 CloudTrail events → 16K tokens of timeline output → 32K tokens by the remediation agent. Models start contradicting their earlier outputs.

Each handoff in wolfir sends a compact, typed object — only what the next agent needs:

```python
timeline_handoff = {
    "incident_pattern": result["identified_pattern"],
    "root_cause": result["root_cause"],
    "affected_resources": result["affected_resources"][:10],
    "risk_signals": [e for e in events if e.get("flagged")],
    "branch_resource": result["cross_resource_origin"],
    "confidence": result["confidence_score"],
}
# ~800 tokens to next agent, not 12K
```

Context size dropped 60% across the pipeline. Hallucinations from context bloat disappeared.

```
Input (raw)          After pruning          Sent to next agent
─────────────────    ──────────────────     ─────────────────────────
80 CloudTrail        50 events × 6          800 tokens
events               fields each            (not 12K)
~40K tokens          ↓                      ↓
                  filter_interesting_    timeline_handoff{}
                  events()               incident_pattern
                                         root_cause
                                         affected_resources[:10]
                                         risk_signals (flagged only)
                                         confidence
```

### The MCP Architecture: Why Not Direct boto3?

Six FastMCP servers expose 27 tools to the Strands agent layer: CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas, and AI Security.

The alternative — direct boto3 calls from within agent prompts — creates implicit coupling. When AWS API behavior changes, agent behavior changes in unpredictable ways. When you want to test agent tool selection, you need live AWS access.

MCP servers create an **explicit typed contract**: the agent calls a named function with typed inputs, the server handles boto3, error handling, retry logic, and response normalization, and the agent gets structured output. Testing is clean — mock the MCP server, never touch agent logic.

Caching at the MCP layer (CloudTrail events: 60s TTL, IAM policies: 5min TTL) eliminates redundant API calls when the Agentic Query agent calls the same tool multiple times in one session.

### DynamoDB: Design Decisions

DynamoDB is wolfir's memory layer. I chose it for three reasons: **PAY_PER_REQUEST billing** (no provisioned capacity to over-provision), **O(1) partition key lookups** by `incident_id`, and **auto-table-creation on first use**.

Auto-creation matters for the deployment story:

```python
async def _ensure_table_exists(self):
    try:
        await asyncio.to_thread(self.client.describe_table, TableName=self.table_name)
    except AWSServiceException as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            await asyncio.to_thread(
                self.client.create_table,
                TableName=self.table_name,
                KeySchema=[{'AttributeName': 'incident_id', 'KeyType': 'HASH'}],
                AttributeDefinitions=[{'AttributeName': 'incident_id', 'AttributeType': 'S'}],
                BillingMode='PAY_PER_REQUEST'
            )
```

A judge who runs the backend for the first time against a real AWS account does not need to pre-create any DynamoDB tables. The table appears automatically on the first incident write. If DynamoDB is unavailable, the pipeline continues with an in-memory fallback — the demo never breaks because of a missing table.

Nova Embeddings are stored as JSON-serialized arrays alongside each incident. DynamoDB does not have a native vector type, so the values serialize to a string field and deserialize at query time. For 384-dimensional vectors, cosine similarity runs synchronously at query time — no vector database needed.

### Bedrock Knowledge Base: RAG for Playbooks

wolfir supports two knowledge sources for Agentic Query, selected at runtime:

**Source 1 — AWS Knowledge MCP** (`USE_AWS_KNOWLEDGE_MCP=true`): Real-time AWS documentation search with no setup. The agent queries live AWS docs for security guidance without any Terraform or console configuration.

**Source 2 — Bedrock Knowledge Base** (S3 Vectors): Terraform creates an S3 bucket, uploads six curated security playbooks as Markdown, you connect it to Bedrock Knowledge Base via console, set `KNOWLEDGE_BASE_ID` in `.env`. The agent then retrieves specific, cited excerpts from the playbooks when generating remediation guidance.

The knowledge service tries AWS Knowledge MCP first, falls back to Bedrock KB, falls back to inline prompts:

```python
async def retrieve_and_generate(query: str) -> Dict[str, Any]:
    # Try AWS Knowledge MCP first — real-time docs, no setup required
    if is_aws_knowledge_mcp_enabled():
        result = await search_aws_documentation(query)
        if result.get("answer"):
            return result  # includes source attribution

    # Fall back to Bedrock Knowledge Base
    if kb_id := get_settings().knowledge_base_id:
        return await _bedrock_kb_retrieve_and_generate(query, kb_id)

    # Inline fallback — always works
    return {"answer": "No knowledge source configured.", "kb_enabled": False}
```

Why S3 Vectors instead of OpenSearch Serverless? S3 Vectors is purpose-built for document retrieval workloads at lower cost. For six security playbooks ranging from 500–2000 tokens each, OpenSearch Serverless is significantly over-provisioned. S3 Vectors gives the same Bedrock `RetrieveAndGenerate` API surface at a fraction of the cost.

### Bedrock Guardrails: Infrastructure-Level Safety

wolfir queries the Bedrock control plane to list and audit configured guardrails:

```python
def list_guardrails(max_results: int = 20) -> Dict[str, Any]:
    client = session.client("bedrock", region_name=settings.aws_region)
    resp = client.list_guardrails(maxResults=max_results)
    return {
        "guardrails": [{"id", "arn", "name", "status", "version"} for g in resp["guardrails"]],
        "error": None
    }
```

In the Agentic Query tab, Bedrock Guardrails are applied at the API level before prompts reach the model. Guardrail enforcement happens at the infrastructure layer, not the prompt layer — it cannot be circumvented by a cleverly crafted input that tricks the model into ignoring its system prompt. The `GUARDRAIL_IDENTIFIER` and `GUARDRAIL_VERSION` environment variables configure which guardrail profile applies.

The AI Security Posture dashboard shows current guardrail status — active vs. not configured — so the team can see at a glance whether the safety layer is in place.

### Human-in-the-Loop: Approval Gates for Risky Remediations

Not all remediations should execute immediately. wolfir classifies each remediation step into three safety tiers:

- **AUTO** — low-risk read operations, monitoring changes, tagging. Execute without approval.
- **APPROVAL** — policy modifications, security group changes, access key operations. Require explicit approval before executing.
- **MANUAL** — destructive actions (user deletion, S3 bucket deletion). Generate CLI commands; analyst executes manually.

The approval system issues a UUID approval token per pending action:

```python
def create_pending_approval(incident_id, step_id, step_action, target, params) -> str:
    token = str(uuid.uuid4())
    _pending[token] = {
        "token": token, "incident_id": incident_id,
        "step_action": step_action, "target": target,
        "params": params, "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
    }
    return token
```

Approving a token via the API initiates the actual boto3 execution. Every execution result is stored as an execution proof — before-state, after-state, CloudTrail event reference, timestamp. The analyst can audit exactly what wolfir did, when, and with what result. Rollback is implemented for reversible actions using the before-state snapshot.

---

## The AI Security Pillar: MITRE ATLAS Self-Monitoring

This is the part of wolfir I am most proud of building — and the part nobody else is building.

### The Security Model

wolfir's agents consume CloudTrail data, IAM policies, CloudFormation templates, and free-text user prompts. They produce remediation commands, JIRA tickets, Slack messages, and voice responses. Every step of that flow is a risk surface.

Input data may contain instructions embedded in a CloudTrail event's `requestParameters.resourceName` field — data that the temporal agent reads and reasons about. A resource exhaustion incident could cause runaway Bedrock invocations. A crafted query through the Agentic Query interface could cause the model to include private account identifiers in its response. These are real risks against a system with IAM API access.

### 6 MITRE ATLAS Techniques, Implemented

**AML.T0051 — Prompt Guard.** Pattern scanning against 12 known signatures on every user input before it reaches the Strands Agent. Signatures include role-override patterns, data extraction probes, and instruction adjustment via data fields. The status indicator in the Agentic Query UI is a live signal from this monitor — not decoration.

**AML.T0016 — Ungoverned Model Access.** Every Bedrock invocation is recorded with the model ID. If any non-approved model outside the defined Nova set is invoked — whether by the orchestrator, the Strands agent, or a tool — the status flips to WARNING and names the offending model.

**AML.T0040 — ML Inference API Access.** Invocation rate monitoring with baseline comparison. Baseline: approximately 20 invocations per full incident analysis. Alert threshold: >3× baseline. Expected surges during active pipeline runs are annotated as "PIPELINE_RUN" and do not flag false alerts. Unexpected surges do.

**AML.T0043 — Crafted Data.** Input validation on CloudTrail event structure integrity before events reach the temporal agent. Anomalous field values, falsified timestamps (events with future dates, events with impossible ordering), and structurally malformed events are flagged and optionally quarantined.

**AML.T0024 — Ungoverned Data Transfer via Inference.** Output scanning on every model response for AWS account IDs (12-digit patterns), access key patterns (`AKIA`, `ASIA` prefixes), private IP ranges, and common secrets patterns. If a response contains what looks like an access key, it is flagged before being returned to the frontend.

**AML.T0048 — Model Tampering.** Explicitly N/A — wolfir uses Bedrock foundation models without fine-tuning or custom training. Claiming to monitor for fine-tuning tampering when there is no fine-tuning pipeline would be misleading. Honest non-applicability is more credible than a fabricated detection.

### Beyond ATLAS

The AI Security pillar also includes:

- **OWASP LLM Top 10 posture** (LLM01–LLM10) — mapped to wolfir's implementation with live radar chart, posture score 87/100
- **Ungoverned AI detection** — CloudTrail InvokeModel monitoring for calls from non-approved principals in the account
- **NIST AI RMF alignment** — Govern, Map, Measure, Manage function coverage assessment
- **EU AI Act readiness** — AI system risk classification readiness
- **AI-BOM** — Bedrock model inventory for the account
- **Guardrail coverage audit** — which Bedrock guardrails are active vs. not configured

When you run an incident analysis, the AI Security dashboard updates based on the Bedrock invocations that just ran through the pipeline.

![wolfir AI Security Posture dashboard](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-ai-security-posture.png)

*Figure 3 — wolfir's AI Security Posture dashboard. Left: MITRE ATLAS live technique status updated from actual Bedrock invocations. Center: OWASP LLM Top 10 radar chart showing posture score of 87/100. Right: AI compliance coverage across all three frameworks. The invocation rate bar chart lets you visually spot pipeline runs versus anomalous surges.*

---

## Interactive Incident Path Visualization

Understanding what happened requires more than a text timeline. wolfir generates an interactive React Flow graph where every event in the incident chain is a clickable node — click any node to see its full risk score, MITRE technique mapping, source IP, timestamp, and what IAM control would have prevented it.

![wolfir interactive incident path diagram](https://raw.githubusercontent.com/bhavikam28/wolfir/main/frontend/public/images/wolfir-incident-path.png)

*Figure 4 — wolfir's interactive incident path for an IAM access expansion incident. Nodes are color-coded by severity: green (low), orange (medium), dark red (high), bright red (critical). Arrows show temporal progression with exact time deltas. Clicking "CreatePolicyVersion" (the access expansion step) opens the inspection panel: risk score 94/100 (CI: 88–97), MITRE technique T1548.005, source IP, and the specific IAM control that would have prevented it.*

The graph is built from the temporal agent's incident chain analysis. Nodes are positioned by incident phase (Detection → Discovery → Access Expansion → Cross-Resource Movement → Impact), so the visual layout itself tells the story of how the unidentified principal moved through the environment.

---

## Three Demo Scenarios

wolfir ships with three pre-built demo scenarios, each pre-computed with real Nova outputs so the full pipeline result loads in under 2 seconds.

**Scenario 1 — IAM Access Expansion.** A vendor account misuses an AssumeRole chain to gain AdministratorAccess. MITRE techniques T1098 and T1078. 9 events. CRITICAL severity. Full incident chain: discovery → movement → continued access.

**Scenario 2 — AWS Organizations Cross-Account Exposure.** A affected role in a Dev account moves via STS AssumeRole into Production and Security accounts — cross-resource movement across 3 OUs and 12 member accounts. wolfir detects and contains with org-wide SCPs. 18 events. CRITICAL severity.

**Scenario 3 — Ungoverned AI / Ungoverned LLM Use.** Ungoverned Bedrock InvokeModel calls combined with a Prompt Guard detection. This scenario demonstrates both pillars simultaneously — the AI security pillar catching a risk that cloud security monitoring alone would not surface. 7 events. CRITICAL severity.

Run scenario 1 first, then scenario 2 — the cross-incident memory will flag *"78% probability this is the same unidentified principal."* This is the correlation seeding design: scenario 1 runs silently in the background when you land on the page so scenario 2 always has historical data to correlate against.

---

## Blast Radius Simulator and Organizations Dashboard

### Blast Radius Simulator

Knowing that an IAM identity was affected is one thing. Knowing every resource an unidentified principal with that identity can reach is another. The Blast Radius Simulator takes the affected identity from an incident and runs IAM policy simulation to map its full reachable risk surface:

```
affected: arn:aws:iam::123456789:role/DataPipelineRole
│
├── CRITICAL — S3:GetObject on s3://prod-customer-data/* (personal data exposure)
├── CRITICAL — DynamoDB:Scan on CustomerOrders table (financial data)
├── HIGH     — EC2:RunInstances (ungoverned compute vector)
├── HIGH     — Bedrock:InvokeModel (ungoverned model access)
├── MEDIUM   — Lambda:InvokeFunction on 3 functions
└── LOW      — CloudWatch:PutMetricData (routine low-priority activity)
```

Each resource shows the IAM action that enables access, the risk zone, the estimated financial impact, and what would have prevented it. This turns *"there was an IAM incident"* into *"here is exactly what was at risk and what to fix first."*

### AWS Organizations Dashboard

When incidents span accounts, a single-account view is insufficient. The Organizations Dashboard shows:

- Full org tree (Management Account → OUs → Member Accounts) with real-time risk level indicators
- **Cross-account cross-resource movement detection** — identifying when a security incident in one account created vectors into others
- **SCP gap analysis** — which Service Control Policies are missing across OUs, what they would have prevented
- Per-account security posture scores, finding counts, and compliance percentages

---

## ChangeSet Analysis, SLA Tracking, and Cost Impact

### ChangeSet Analysis — Risk Before You Deploy

The Blast Radius Simulator asks: *what could an unidentified principal reach with this identity?* The ChangeSet Analyzer asks a different question: *what security risk does this CloudFormation change introduce before you deploy it?*

You paste a CloudFormation change set and wolfir evaluates:

- **IAM policy changes** — new or expanded permissions, wildcard actions, missing conditions
- **Security group modifications** — new ingress rules, port ranges, CIDR scope
- **S3 bucket configuration changes** — public access, encryption, versioning, bucket policy scope
- **Encryption at rest changes** — removing KMS keys, switching to SSE-S3, disabling encryption
- **Network topology changes** — new VPC peering, route table entries, NAT gateway additions

Each finding is rated by risk tier and mapped to the compliance controls it would fail if deployed. A pre-deployment security review in 15 seconds instead of a manual audit that takes hours.

### SLA Tracker — Are You Responding Fast Enough?

wolfir tracks incident response SLA compliance across every incident:

- **P1 (CRITICAL)** — 15-minute detection-to-acknowledgement, 1-hour detection-to-remediation
- **P2 (HIGH)** — 1-hour detection-to-acknowledgement, 4-hour detection-to-remediation

The tracker shows real-time progress bars for active incidents, historical SLA compliance rates, and predicts exposure risk for in-flight incidents based on pipeline stage and historical resolution time. SLA miss events are logged to DynamoDB, so compliance reporting is automatic rather than derived from meeting notes.

### Cost Impact Analysis

Every incident analysis includes a financial exposure estimate using the IBM Cost of Data Exposure 2024 methodology:

- **Direct compute cost** — ungoverned EC2/Lambda/Bedrock invocations at AWS on-demand pricing
- **Data exposure cost** — estimated cost per PII record exposed, scaled by the record count from Blast Radius
- **Incident response labor cost** — analyst hours × median SOC analyst hourly rate × estimated resolution time
- **Regulatory fine exposure** — per-jurisdiction GDPR, CCPA, HIPAA fine calculation based on record count and sensitivity tier
- **Total estimated exposure range** — low/mid/high scenarios with confidence intervals

*"7 API calls happened"* and *"$2.1M–4.7M exposure range"* have very different business impact. The cost output feeds directly into executive briefing documents.

---

## Challenges I Ran Into

### 1. The Strands SDK Async Bridge — The Biggest Architectural Challenge

This one was not in any documentation. Strands `@tool` functions are **synchronous**. The agent implementations use `async` Bedrock calls (`asyncio.to_thread`, `asyncio.gather`). You cannot call an async function from a synchronous context without a running event loop — and you cannot just call `asyncio.run()` inside a Strands tool because FastAPI already owns an event loop in the main thread.

The first approach (creating a new event loop per tool call) worked but introduced 200–400ms of overhead per call just in loop creation and teardown. At 5 agent steps per incident, that is up to 2 seconds of pure overhead.

The solution was a single persistent worker thread that owns one event loop for the entire process lifetime:

```python
_WORKER_LOOP: asyncio.AbstractEventLoop = asyncio.new_event_loop()
_WORKER_THREAD: threading.Thread = threading.Thread(
    target=_WORKER_LOOP.run_forever,
    daemon=True,
    name="wolfir-async-worker",
)
_WORKER_THREAD.start()

def _run_async(coro):
    """Submit a coroutine to the persistent worker loop and block until done."""
    future = asyncio.run_coroutine_threadsafe(coro, _WORKER_LOOP)
    try:
        return future.result(timeout=180)
    except concurrent.futures.TimeoutError:
        future.cancel()
        raise WolfirTimeoutException("Async tool call timed out after 180s")
```

Every Strands `@tool` function now submits its async coroutine to `_WORKER_LOOP` and blocks until it gets the result. Overhead dropped from 200–400ms to under 5ms per call.

### 2. Context Window Collapse Across Five Models

A realistic 80-event incident produces ~40K tokens if you send full output from each agent to the next. By the time you reach the remediation agent, the model is contradicting its own earlier outputs because the beginning of its context is too far away.

Layered context pruning at every handoff — each agent receives only a typed, compact object extracted from the previous output:

- Temporal agent: events filtered to 6 fields, cap of 50 events (~800 tokens in, not 12K)
- Risk scorer: individual events one at a time, never cumulative context
- Remediation agent: structured summary — incident pattern, affected resources, root cause — never raw events
- Documentation agent: executive summary + structured findings, never any intermediate reasoning

Token consumption dropped from ~40K to ~12K per pipeline run. Hallucinations from context bloat disappeared.

### 3. Fabricated Risk Narratives from Routine Events

This was the most damaging reliability issue and the hardest to catch because it failed silently. Feed 50 routine CloudTrail events — `PutLogEvents`, `DescribeInstances`, service-to-service `AssumeRole` — and ask "what is the incident pattern?" The model will invent one. Confidently. With specific MITRE Framework technique mappings.

Building `filter_interesting_events()` was the fix: a curated set of 60+ routine event names filtered before the temporal agent sees anything. Service-to-service `AssumeRole` calls required a separate check because the event name alone is not enough:

```python
def _is_routine_assume_role(event: Dict[str, Any]) -> bool:
    if _get_event_name(event) != "AssumeRole":
        return False
    invoker = (ui.get("sessionContext") or {}).get("sessionIssuer") or {}
    return "amazonaws.com" in str(invoker.get("principalId", ""))
```

When all events after filtering are routine, the pipeline returns "no risk detected." That output is worth more than a convincing-sounding false incident.

### 4. CloudTrail LookupEvents Is Per-Region — 12 Regions × 50 Events/Page

CloudTrail's `LookupEvents` API does not return global results. It queries one region at a time with a maximum of 50 events per page. A real AWS account with activity across us-east-1, us-west-2, and eu-west-1 requires at least three separate paginated queries for complete coverage.

wolfir queries 12 regions by default with rate-limit delays between pages:

```python
CLOUDTRAIL_EVENTS_PER_PAGE = 50       # API max per LookupEvents call
CLOUDTRAIL_MAX_PAGES_PER_REGION = 20  # 1,000 events max per region
CLOUDTRAIL_PAGE_DELAY_SEC = 0.6       # Rate limit between paginated calls
CLOUDTRAIL_REGION_DELAY_SEC = 0.5     # Delay between regions
```

A 2-minute cache (keyed on days_back + max_results + profile) means repeated analyses with the same parameters return consistent results and do not re-hit the API.

### 5. The Model Outputs Placeholder Access Key IDs in Remediation Steps

When Nova 2 Lite generates a remediation plan involving a compromised access key, it outputs steps like:

```
aws iam update-access-key --access-key-id AKIAEXAMPLE --user-name affected-user --status Inactive
```

`AKIAEXAMPLE` is a placeholder. When run against a real account, it fails immediately. The fix requires runtime discovery in every executor function:

```python
# Model output AKIAEXAMPLE — discover the real key at execution time
if access_key_id == "AKIAEXAMPLE" or not access_key_id.startswith("AKIA"):
    keys = iam.list_access_keys(UserName=username).get("AccessKeyMetadata", [])
    active_keys = [k for k in keys if k["Status"] == "Active"]
    if active_keys:
        real_key_id = active_keys[0]["AccessKeyId"]
```

Similar sanitization was added for IAM role names, policy ARNs, and instance IDs — every remediation executor function now has a verification step before executing.

### 6. IAM Policy Detach Requires Verifying Attachment First

Calling `iam.detach_role_policy()` on a policy that is not attached throws an exception that breaks execution flow. The model's remediation plan might say "detach AdministratorAccess" but the model output uses just the policy name while AWS requires the full ARN.

Full ARN matching with partial-match fallback:

```python
attached = iam.list_attached_role_policies(RoleName=role_name).get("AttachedPolicies", [])
policy_arns = [p["PolicyArn"] for p in attached]
if policy_arn not in policy_arns:
    match = next((p for p in policy_arns if policy_arn in p), None)
    if match:
        policy_arn = match
    else:
        return ExecutionResult(status="FAILED", message=f"Policy not attached. Attached: {policy_arns}")
```

### 7. Session Revocation Requires a Specific IAM Pattern

"Revoke all active sessions for a role" sounds straightforward. AWS does not have an API call for this — you cannot list and terminate active STS sessions. The only way to invalidate sessions retroactively is an IAM policy condition:

```python
policy_doc = {
    "Statement": [{
        "Effect": "Deny",
        "Action": ["*"],
        "Resource": ["*"],
        "Condition": {
            "DateLessThan": {"aws:TokenIssueTime": revoke_time}  # NOW
        }
    }]
}
```

Any session token issued before `revoke_time` is denied all actions. New sessions issued after the policy is attached are unaffected. This is the documented AWS session revocation pattern — but it is non-obvious and required careful testing.

### 8. Risk Score Miscalibration at temperature=0.1

Even very low temperature does not give perfectly calibrated domain knowledge. Nova Micro consistently over-called certain events:

- `GetCallerIdentity` → scored HIGH (appears in enumeration playbooks, but is also a routine SDK health check)
- `CreatePolicyVersion` → scored CRITICAL regardless of context (legitimate DevOps teams do this constantly)
- `PutLogEvents` → scored MEDIUM (it is CloudWatch log shipping, not an incident)

The fix was hard calibration adjustments applied after the model scores, combined with three parallel calls returning confidence intervals rather than single scores.

### 9. CloudTrail Event Field Names Are Inconsistent

Events from different sources use different field name conventions. The same event time might be `eventTime`, `EventTime`, or buried inside a serialized `CloudTrailEvent` JSON string. Every event parsing function needed defensive field extraction:

```python
def _get_event_name(event: Dict[str, Any]) -> str:
    name = event.get("eventName") or event.get("event_name") or event.get("EventName", "")
    if name:
        return name
    ct = event.get("CloudTrailEvent")
    if isinstance(ct, str):
        try:
            parsed = json.loads(ct)
            return parsed.get("eventName", "") if isinstance(parsed, dict) else ""
        except Exception:
            pass
    return ""
```

This pattern appears throughout the codebase. Inconsistent field names across real AWS LookupEvents output, raw CloudTrail S3 logs, and Security Hub findings cost days of debugging.

### 10. Bedrock Guardrails Flagged Legitimate Security Queries

Adding Guardrails to Agentic Query introduced a failure mode I did not anticipate: `GuardrailInterventionException` from completely legitimate security queries. Asking "which IAM role was used in the incident?" activates Guardrails if "incident" matches a restricted phrase filter. Security tooling is inherently full of words that content filters are trained to block.

The fix was two-pronged: tuning the guardrail to allow security operations context, and adding graceful degradation:

```python
except GuardrailInterventionException as e:
    return {
        "answer": f"Query flagged by content guardrails. Rephrase without restricted terms. Reason: {e.intervention_reason}",
        "guardrail_flagged": True,
        "suggestion": "Try: 'What IAM actions were performed?' instead of 'What risk techniques were used?'"
    }
```

### 11. Demo Mode Had to Mirror Real Execution Exactly

The demo mode is not a shortcut — it is a parallel implementation that must produce structurally identical output to the real pipeline for the frontend to use one codebase. Every `ExecutionResult` object, every risk score shape, every timeline format must be identical whether the pipeline ran live or returned pre-computed outputs.

The discipline cost time: every new feature required both a real implementation and a demo implementation. The upside: the discipline forced clean, typed API contracts between every layer. Demo mode is a constant test that the real mode's output structure is stable.

### 12. Nova Act Plan Generation Produced Steps for the Wrong Console

Nova Act generates browser automation plans for AWS Console navigation. Early outputs would generate steps for the IAM Classic console, which AWS has been deprecating. Steps that said "click Users in the left sidebar" stopped working when the console reorganized that page.

Console version annotations were added to the Nova Act prompts — specifying the current IAM console URL structure, not just the destination — and outputs are validated against expected current URL patterns before returning them.

### 13. DynamoDB Table Auto-Creation Race Condition

The `_ensure_table_exists()` pattern works fine for single requests. Under concurrent load, two incident analyses starting simultaneously both check for the table, both find it missing, and both try to create it. The second `create_table` call throws `ResourceInUseException`.

```python
except AWSServiceException as create_err:
    # ResourceInUseException — another request created it first, that's fine
    if create_err.response['Error']['Code'] != 'ResourceInUseException':
        raise
```

Catching `ResourceInUseException` and continuing is the correct behavior. Took a concurrency test to find this.

### 14. MCP Server Initialization on Import Caused Bedrock Client Creation at Module Load

The MCP server singletons were originally initialized at module import time. When FastAPI imported the orchestrator module, six Bedrock clients and six boto3 sessions were created immediately — before any request arrived, before credentials were configured, in the wrong region.

The fix was deferred initialization with closures:

```python
_cloudtrail_mcp = None

def get_cloudtrail_mcp():
    global _cloudtrail_mcp
    if _cloudtrail_mcp is None:
        _cloudtrail_mcp = CloudTrailMCP()  # Creates boto3 client here, at first use
    return _cloudtrail_mcp
```

Same pattern for all six MCP servers and all six agent instances. Startup time dropped from 8 seconds to under 1 second.

---

## Accomplishments I'm Proud Of

**The two-pillar architecture is genuinely new.** Cloud security platforms exist. AI security tools are emerging. A platform where one pillar monitors the other in real time — where running an incident analysis updates the AI security posture dashboard — is a new category. I have not seen another project that monitors its own Bedrock pipeline against MITRE ATLAS in production.

**Seven Nova capabilities, each doing non-fungible work.** Not "the API was called seven times." Nova Pro reads images — text models cannot. Nova Micro at temperature=0.1 is deterministic in a way that Nova 2 Lite at default temperature is not. Nova Embeddings finds behavioral patterns that keyword matching misses. Each model handles a task the others either cannot do or cannot do as well.

**The Blast Radius Simulator changes the incident response question.** Not *"what happened?"* but *"what could have happened, and what do I lock down right now?"* IAM policy simulation as a first-class incident response tool.

**Cross-incident memory that actually works.** Run two demo scenarios and watch wolfir surface *"78% probability this is the same unidentified principal"* — overlapping IOCs, MITRE technique overlap, and semantic similarity from Nova Embeddings. That is the moment that made the engineering feel worth it.

**Infrastructure as Code from day one.** `terraform apply` creates the full AWS environment. `terraform destroy` removes everything. `docker compose up` runs the full stack in under 2 minutes. Not aspirational — the baseline.

**Credentials never leave the user's machine.** In a security product, this is not optional. wolfir uses local AWS CLI profiles and mounted credentials volumes. Nothing is stored or transmitted.

---

## What I Learned

**Model selection matters more than model capability.** The breakthrough was not using a more powerful model — it was matching each task to the right model. Nova Micro for speed and determinism. Nova 2 Lite for complex reasoning. Nova Pro for vision. Using the wrong model for a task creates quality problems that more capability cannot fix.

**Multi-agent systems are about the seams.** The models are excellent. The plumbing between them is where things break. What gets sent, in what format, with how much context, at what precision — these decisions determined reliability more than any prompt engineering.

**Hallucination prevention is a design pattern, not a prompt trick.** Event filtering before the temporal agent, calibration adjustments for the risk scorer, confidence intervals instead of single scores, "no risk detected" as a valid output — these are code patterns. Prompts alone could not achieve this.

**Demo engineering is product engineering.** Making the full five-agent pipeline work offline, client-side, with pre-computed real Nova outputs forced me to define clean API contracts, unified data shapes, and graceful degradation across every layer. The discipline of keeping demo mode and real mode on the same API contract made the real backend better.

**Infrastructure decisions compound.** Terraform from day one meant the Knowledge Base setup was three commands. Docker from day one meant the demo setup was one command. These are not things you add later cleanly.

**Security products must monitor themselves.** Monitoring wolfir's Bedrock pipeline with MITRE ATLAS came from asking: "If someone targeted wolfir specifically, what would they try?" Answering that question led to building a genuinely new capability.

---

## What's Next for wolfir

**Real-time streaming via EventBridge.** EventBridge rules on CloudTrail write events → SQS FIFO with priority tiers → wolfir workers on ECS Fargate. Shifts wolfir from batch analysis to live incident detection.

**Multi-account correlation across AWS Organizations.** wolfir already has the Organizations Dashboard and cross-account AssumeRole support. Next: detecting cross-resource movement campaigns across OUs using the cross-incident memory system.

**AI Red Teaming module.** Automated Prompt Guard testing against the user's own Bedrock pipelines. If you deploy Nova in production, you should verify that your guardrails actually hold against realistic crafted inputs.

**Deeper JIRA/Slack/Confluence integration via Nova Act.** Full browser automation to create tickets, post to incident channels, and generate postmortems in one flow — not just plan generation, but execution.

**Community playbook library.** The Bedrock Knowledge Base integration already supports custom playbooks in S3. The vision: community-contributed SOPs for common AWS incident types — curated, versioned, searchable via RAG.

**Enterprise deployment template.** CloudFormation template for VPC-isolated backend, private Bedrock endpoints, WAF in front of the FastAPI layer, and multi-region DynamoDB Global Tables for cross-region incident correlation.

---

## The Technical Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **AI models** | Amazon Nova (Pro · 2 Lite · Micro · 2 Sonic · Canvas · Act · Embeddings) | 7 capabilities, each with a distinct non-fungible role |
| **Agent framework** | Strands Agents SDK | Native `@tool` decorators, Bedrock-native, pipeline + autonomous mode |
| **MCP servers** | FastMCP — 6 servers, 27 tools | Typed contracts between agents and AWS APIs, testable in isolation |
| **Backend** | FastAPI + uvicorn + Python 3.11 | Async-native, `asyncio.gather()` for parallel agent steps |
| **Frontend** | React + TypeScript + Vite + Tailwind + Framer Motion + React Flow | Full type safety, animation-ready, interactive incident path diagrams |
| **Memory** | DynamoDB (PAY_PER_REQUEST) + Nova Embeddings | Auto-provisioning, cosine similarity at query time, in-memory fallback |
| **Knowledge** | Bedrock Knowledge Base (S3 Vectors) + AWS Knowledge MCP | RAG-powered playbook retrieval, dual source with fallback chain |
| **Safety** | Bedrock Guardrails + MITRE ATLAS monitoring | Infrastructure-level enforcement + AI-layer behavioral monitoring |
| **Infrastructure** | Terraform | Reproducible, reversible, audit-ready |
| **Containers** | Docker + docker-compose | Zero-friction local setup, credential mounting, health checks |
| **Frontend deploy** | Vercel | CDN-deployed static build, client-side demo mode when backend offline |

---

## Who This Is For

**Small and mid-sized security teams** that do not have Splunk, Cortex XSOAR, or dedicated SOC analysts. They have CloudTrail, maybe GuardDuty, and not enough hours. wolfir gives them what a 20-person SOC has: a structured response pipeline that runs in minutes.

**Cloud engineers learning incident response.** The three demo scenarios walk through realistic incident chains — IAM access expansion, cross-account cross-resource movement, and ungoverned AI misuse. Running a scenario and reading the generated incident timeline teaches you what to look for in real incidents.

**Teams deploying AI who need to secure it.** The MITRE ATLAS self-monitoring pillar is a proof of concept for a problem barely anyone is addressing: who watches the watcher? If you are deploying language models for security analysis, Prompt Guard and API misuse are real risk vectors, not theoretical ones.

**AWS builders exploring multi-agent architectures.** The codebase is a reference implementation: Strands Agents SDK + MCP + multiple Nova models + DynamoDB cross-incident memory + Bedrock Knowledge Base + demo/real mode coexistence. MIT-licensed.

I am keeping the barrier low: MIT license, credentials never leave your machine, ~$0.01–0.02 per incident on Bedrock on-demand, ~$2–5/month estimated for light usage.

---

## Conclusion

wolfir started from two questions. What happens when AI actually responds to security alerts? And who watches the AI?

Building it showed me that Nova's model diversity is not marketing — it is architecture. Micro for speed, 2 Lite for reasoning, Pro for vision, Canvas for generation, Act for automation, Sonic for voice, Embeddings for similarity. Each does something the others cannot. The Strands Agents SDK makes them work together. Terraform makes the infrastructure reproducible. Docker makes the setup frictionless. Bedrock Knowledge Bases ground the responses in your security playbooks. Guardrails make it safe at the API level.

The AI security pillar is where I think the industry is heading. Every security platform will be AI-powered soon. Every AI-powered security platform is itself a risk surface. The ones that monitor their own pipelines with frameworks like MITRE ATLAS — and build the infrastructure to do it systematically — will be the ones that earn trust. wolfir is a proof of concept for that future.

Try it. Share your feedback.

---

**Live Demo:** [wolfir.vercel.app](https://wolfir.vercel.app) — explore with demo scenarios, then connect your AWS account for real analysis.
**Source Code:** [github.com/bhavikam28/wolfir](https://github.com/bhavikam28/wolfir) — MIT licensed.

**Built with:** Amazon Nova (Pro · 2 Lite · Micro · 2 Sonic · Canvas · Act · Multimodal Embeddings) · Strands Agents SDK · 6 AWS MCP Servers · Bedrock Knowledge Bases · Bedrock Guardrails · FastAPI · React · DynamoDB · Terraform · Docker

`#AmazonNova` `#wolfir` `#AIforSecurity` `#CloudSecurity` `#AISecurity` `#MITREAtlas`
