# AWS Security Best Practices for Incident Response

## Identity and Access Management
- Enable MFA for root and all IAM users
- Use IAM roles for EC2, Lambda, ECS instead of access keys
- Implement least privilege; review permissions quarterly
- Use AWS Organizations and SCPs for guardrails

## Logging and Monitoring
- Enable CloudTrail in all regions; use a single delegated admin account
- Enable VPC Flow Logs for network analysis
- Use CloudWatch alarms for anomalous API activity
- Integrate with Security Hub for centralized findings

## Network Security
- Use security groups with minimal required access
- Implement VPC endpoints for AWS service access (no internet)
- Segment workloads with private subnets
- Use AWS WAF for public-facing applications

## Data Protection
- Encrypt data at rest (S3, EBS, RDS)
- Use KMS for key management; enable key rotation
- Classify data and apply appropriate controls

## Incident Response Readiness
- Maintain runbooks for common incident types
- Define escalation paths and on-call procedures
- Test backup and restore procedures
- Document and rehearse communication plans

## MITRE ATT&CK Cloud Matrix
- Map detections to MITRE ATT&CK for AWS
- Use Security Hub integration for automated mapping
- Align playbooks with ATT&CK techniques
