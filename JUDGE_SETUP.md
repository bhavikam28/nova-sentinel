# Judge Setup Guide - Secure AWS Authentication

## Overview

Nova Sentinel uses **secure, local AWS credential management** - judges' credentials are **never stored on our servers**. All AWS API calls are made directly from the backend using the judge's local AWS CLI configuration.

## Authentication Methods

### Method 1: AWS CLI Profile (Recommended) ✅

**How it works:**
- Judges configure AWS credentials locally using AWS CLI
- Backend reads credentials from `~/.aws/credentials` on the judge's machine
- Credentials never leave the judge's local machine
- No credentials transmitted over the network

**Setup Steps:**

1. **Install AWS CLI** (if not already installed):
   ```bash
   # macOS
   brew install awscli
   
   # Linux
   sudo apt-get install awscli
   
   # Windows
   # Download from: https://aws.amazon.com/cli/
   ```

2. **Configure AWS Profile:**
   ```bash
   aws configure --profile secops-lens
   ```
   
   Enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `us-east-1`
   - Default output format: `json`

3. **Verify Connection:**
   - Open Nova Sentinel frontend
   - Go to "Real AWS Account" tab
   - Click "Test AWS Connection"
   - Should show: ✅ "Successfully connected to AWS account"

**Required Permissions:**
- `cloudtrail:LookupEvents` - Read CloudTrail events
- `bedrock:InvokeModel` - Use Nova AI models
- `sts:GetCallerIdentity` - Verify identity (automatic)

### Method 2: Environment Variables (Alternative)

For judges who prefer environment variables:

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1

# Then run backend
cd backend
python main.py
```

### Method 3: AWS SSO (Coming Soon)

For enterprise judges using AWS SSO:
- Browser-based authentication
- No credentials stored locally
- Automatic token refresh

## Security Features

✅ **No Credential Storage**: Credentials are never stored in our database or transmitted to our servers

✅ **Local-Only Access**: Backend reads credentials from judge's local machine only

✅ **Direct AWS API Calls**: All AWS API calls are made directly from backend to AWS (no proxy)

✅ **Revocable Access**: Judges can revoke access anytime by removing AWS profile

✅ **Least Privilege**: Only requires read permissions for CloudTrail and Bedrock

## For Hackathon Judges

### Quick Start (5 minutes):

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd secops-lens-pro
   ```

2. **Configure AWS credentials:**
   ```bash
   aws configure --profile secops-lens
   ```

3. **Start backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

4. **Start frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Test connection:**
   - Open http://localhost:5173
   - Go to "Real AWS Account" tab
   - Click "Test AWS Connection"
   - Once connected, click "Analyze Real CloudTrail Events"

### Testing Without Real AWS Account

If judges don't want to use their AWS account, they can:
- Use the **"Demo Scenarios"** tab
- Explore pre-built security incident scenarios
- See full Nova Sentinel capabilities without AWS access

## Troubleshooting

### "Credentials not found"
- Ensure AWS CLI is installed: `aws --version`
- Check profile exists: `aws configure list-profiles`
- Verify credentials file: `cat ~/.aws/credentials`

### "CloudTrail access denied"
- Ensure IAM user/role has `cloudtrail:LookupEvents` permission
- Check region matches (default: `us-east-1`)

### "Bedrock access denied"
- Ensure Bedrock is enabled in your AWS account
- Verify region supports Bedrock (us-east-1, us-west-2, etc.)
- Check IAM permissions include `bedrock:InvokeModel`

## Architecture

```
Judge's Machine
├── ~/.aws/credentials (local file, never transmitted)
├── Backend (reads credentials locally)
│   ├── CloudTrail Service → AWS CloudTrail API
│   ├── Bedrock Service → AWS Bedrock API
│   └── DynamoDB Service → AWS DynamoDB API
└── Frontend (no AWS credentials)
    └── Makes API calls to local backend
```

**Key Point**: All AWS credentials stay on the judge's machine. The backend acts as a local proxy that uses the judge's credentials to make AWS API calls.

## Questions?

For hackathon judges:
- Demo scenarios work without AWS credentials
- Real AWS analysis requires local AWS CLI setup
- All credentials remain on your machine
- No data is stored on our servers
