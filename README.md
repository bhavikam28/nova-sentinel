# 🛡 Nova Sentinel

**Autonomous Security Incident Response Powered by Amazon Nova**

> From alert to resolution in under 60 seconds. Not with one model, but with 5 specialized Nova models working together like a real security team.

[![Amazon Nova AI Hackathon 2026](https://img.shields.io/badge/Amazon%20Nova%20AI-Hackathon%202026-6366f1)](https://amazonnova.devpost.com/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-22d3ee)](https://nova-sentinel.vercel.app)

---

## What is Nova Sentinel?

Nova Sentinel is an **agentic incident response pipeline** that autonomously detects, investigates, classifies, remediates, and documents cloud security threats. It uses 5 Amazon Nova AI models in coordinated orchestration, each chosen for what it does best.

**This is not a dashboard or SIEM. It's an autonomous multi-agent system that takes action.**

## 🏗 Architecture

```
CloudTrail Alert
      ↓
┌─────────────────────────────────────────────────┐
│  STRANDS AGENTS SDK — Orchestration Layer        │
├─────────┬──────────┬──────────┬────────┬────────┤
│  Nova   │  Nova 2  │  Nova    │ Orch-  │ Nova 2 │
│  Pro    │  Lite    │  Micro   │ estrator│ Lite   │
│ Detect  │Investigate│ Classify │Remediate│Document│
├─────────┴──────────┴──────────┴────────┴────────┤
│  4 AWS MCP Servers (CloudTrail, IAM, CW, Canvas) │
│  22 MCP Tools · 12 Strands @tool Functions       │
└──────────────────────────────────────────────────┘
      ↓              ↓             ↓
  DynamoDB     CloudTrail      JIRA/Slack/
  (Memory)     (Audit Proof)   Confluence
```

## 🔑 Key Differentiators

### 1. Cross-Incident Memory (DynamoDB)
Persistent correlation engine detects attack campaigns across incidents. Run two demos — the second one says "78% probability this is the same attacker."

### 2. Autonomous Remediation with Proof
Actually executes AWS API calls (not just plans). Before/after state snapshots, CloudTrail confirmation, one-click rollback.

### 3. AI Pipeline Self-Monitoring (MITRE ATLAS)
"Who protects the AI?" Monitors its own Bedrock pipeline for prompt injection, API abuse, and data exfiltration using 6 MITRE ATLAS techniques.

## 🤖 Nova Models Used

| Model | Role | Why This Model |
|-------|------|----------------|
| **Nova Pro** | Visual architecture analysis | Multimodal — reads diagram images |
| **Nova 2 Lite** | Temporal analysis, remediation, docs | Fast, accurate text reasoning |
| **Nova Micro** | Risk classification (0-100) | Ultra-fast, deterministic (temp=0.1) |
| **Nova 2 Sonic** | Voice investigation (Aria) | Real-time conversational audio |
| **Nova Canvas** | Report cover art generation | Image generation |

## 🔧 AWS Services

- **Amazon Bedrock** — All Nova model invocations
- **DynamoDB** — Cross-incident memory + correlation
- **CloudTrail** — Security event source + audit proof
- **IAM** — Policy analysis + remediation execution
- **CloudWatch** — Anomaly detection + billing monitoring
- **S3** — Architecture diagram storage
- **Strands Agents SDK** — Multi-agent orchestration

## 📦 Tech Stack

- **Backend**: Python, FastAPI, Strands Agents SDK, boto3
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Framer Motion
- **MCP**: FastMCP with 4 AWS MCP servers (22 tools)
- **Deployment**: Vercel (frontend), Local/EC2 (backend)

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- AWS credentials configured (`aws configure`)

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
# API runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:5173
```

### Demo
1. Open http://localhost:5173
2. Click "Demo Scenarios"
3. Run "IAM Privilege Escalation" — watch the full pipeline execute
4. Navigate through: Timeline → Attack Path → Remediation → AI Security
5. Ask Aria: "Have we seen this attack before?"

## 📊 Performance

| Metric | Value |
|--------|-------|
| Alert to Resolution | < 60 seconds |
| Cost per Incident | $0.013 |
| MITRE ATT&CK Coverage | T1078, T1098, T1059, T1496, T1530 |
| MITRE ATLAS Monitoring | 6 techniques |
| Compliance Frameworks | CIS, NIST 800-53, SOC 2, PCI-DSS, SOX, HIPAA |

## 💰 AWS Billing & Open Source

**Important**: This project uses **your AWS account and credentials**. All AWS charges will be billed to **your account**.

- Each user configures their own AWS credentials
- Estimated cost: ~$2-5/month for light usage
- See [BILLING_AND_OPEN_SOURCE.md](BILLING_AND_OPEN_SOURCE.md) for details

## 📄 License

Built for the Amazon Nova AI Hackathon 2026.

---

**#AmazonNova** | **#NovaSentinel** | **#AIforSecurity**
