# Incident Response Playbook: Cryptomining Detection and Remediation

## Overview
Cryptomining (cryptojacking) occurs when attackers use compromised AWS resources to mine cryptocurrency without authorization. Common indicators include unusual EC2 CPU utilization, Lambda invocations, or container workloads.

## Detection Indicators
- EC2 instances with sustained 90%+ CPU utilization
- Lambda functions with abnormal invocation patterns
- CloudTrail events: RunInstances, CreateFunction from unexpected principals
- CloudWatch metrics: CPUUtilization spikes, NetworkIn/Out anomalies

## Response Steps

### 1. Containment (Immediate)
- Isolate affected resources: Stop EC2 instances, disable Lambda functions
- Revoke temporary credentials if IAM role/user is compromised
- Block outbound connections to known mining pools (Security Group rules)

### 2. Investigation
- Review CloudTrail for RunInstances, CreateFunction, AssumeRole
- Check IAM for new roles, inline policies, or permission changes
- Inspect EC2 user data and Lambda environment variables for mining scripts

### 3. Eradication
- Terminate malicious instances and delete compromised Lambda functions
- Rotate all credentials (access keys, instance profiles)
- Remove backdoors: unauthorized IAM policies, Security Group rules

### 4. Recovery
- Restore from known-good AMI or redeploy from infrastructure-as-code
- Re-enable monitoring and alerting

## AWS CLI Commands (Examples)
```bash
# Stop suspected EC2 instance
aws ec2 stop-instances --instance-ids i-xxxxx

# Revoke IAM user access keys
aws iam delete-access-key --user-name compromised-user --access-key-id AKIAXXXX

# List Lambda functions by last modified
aws lambda list-functions --query 'Functions[?LastModified>=`2024-01-01`]'
```

## MITRE ATT&CK Mapping
- T1496: Resource Hijacking
- T1525: Implant Internal Image (container mining)
- T1098: Account Manipulation (persistence)
