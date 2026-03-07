# Autonomous Agent — Status & Issues for Claude

## What We Built

Nova Sentinel includes an **Autonomous Agent** (Strands Agents SDK) that lets users type or click prompts to run security audits. Unlike the fixed pipeline (Timeline → Risk → Remediation → Docs), the Agent **autonomously decides which tools to call** based on the prompt.

### Architecture

- **Framework:** Strands Agents SDK (Python)
- **Model:** Amazon Nova 2 Lite via inference profile `us.amazon.nova-2-lite-v1:0`
- **Tools:** 14 registered tools including:
  - **Core Nova tools:** temporal analysis, risk scoring, remediation, documentation
  - **AWS MCP server tools:** CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas

### Flow

1. User enters prompt (e.g. "Audit all IAM users for security issues") or clicks a suggested prompt
2. Frontend calls `POST /api/orchestration/agent-query` with the prompt
3. Strands Agent receives prompt + all 14 tools
4. Agent plans which tools to call and in what order
5. Agent executes tools and returns a response

---

## Issues We Fixed

### 1. `'BedrockRuntime' object has no attribute 'converse_stream'`

**Cause:** Strands Agent uses Bedrock's ConverseStream API, which requires **boto3 1.42.62+**. The environment had boto3 1.34.51.

**Fix:** Upgraded `requirements.txt` to `boto3>=1.42.62` and ran `pip install -U "boto3>=1.42.62"`.

### 2. `ValidationException: Invocation of model ID amazon.nova-2-lite-v1:0 with on-demand throughput isn't supported`

**Cause:** AWS Bedrock no longer supports direct model IDs for on-demand invocation. Must use an **inference profile** (e.g. `us.amazon.nova-2-lite-v1:0`).

**Fix:** Updated `strands_orchestrator.py` to use `get_settings().nova_lite_model_id` instead of hardcoded `amazon.nova-2-lite-v1:0`. Config already had `nova_lite_model_id: str = "us.amazon.nova-2-lite-v1:0"`.

---

## Current Status

**Agent works.** It successfully:
- Receives prompts
- Plans tool execution
- Calls IAM User Audit, IAM Role Audit, CloudTrail, Security Hub, etc.
- Returns coherent responses

**Current limitation:** IAM tools return permission errors when the backend's AWS credentials don't have IAM permissions (`iam:ListUsers`, `iam:GetUser`, etc.). The Agent correctly interprets this and suggests alternatives (e.g. "audit just the current user" or "use an account with proper permissions").

---

## Open Questions / Possible Improvements

1. **Credentials context:** When running in "Console" mode with user-connected AWS, should the Agent use the **user's** credentials (from frontend) or the **backend's** credentials? Currently it uses backend credentials only.

2. **Demo mode fallback:** For prompts like "Audit all IAM users" in demo mode, could we return simulated/mock IAM audit results instead of permission errors, so judges see a complete flow?

3. **Tool error handling:** Should the Agent retry with different tools when one fails (e.g. IAM fails → try CloudTrail)?

4. **Region/Inference profile:** Config uses `us.amazon.nova-2-lite-v1:0` (us-east-1). Users in other regions may need `NOVA_LITE_MODEL_ID` env var (e.g. `usw2.amazon.nova-2-lite-v1:0` for us-west-2).

---

## Files to Review

- `backend/agents/strands_orchestrator.py` — Agent creation, tool registration, agent_query
- `backend/utils/config.py` — nova_lite_model_id and other model IDs
- `backend/requirements.txt` — boto3>=1.42.62
- `frontend/src/components/Analysis/AgenticQuery.tsx` — Autonomous Agent UI
