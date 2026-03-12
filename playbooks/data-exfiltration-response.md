# Incident Response Playbook: Data Exfiltration

## Overview
Data exfiltration involves unauthorized transfer of data from AWS to external locations. Common vectors include S3 bucket misconfigurations, compromised credentials, or insider threats.

## Detection Indicators
- S3 GetObject from unexpected IPs or principals
- S3 bucket policy changes allowing public access
- Large data transfer volumes (DataTransfer-Out metrics)
- CloudTrail: GetObject, PutBucketPolicy, ListBucket from unusual sources

## Response Steps

### 1. Containment
- Disable public access on affected S3 buckets
- Revoke compromised credentials
- Block egress to known malicious IPs (NACL, Security Group)

### 2. Investigation
- Identify scope: Which buckets, objects, time range?
- Review S3 access logs and CloudTrail
- Check for replication rules or cross-account access

### 3. Eradication
- Remove public bucket policies
- Restrict bucket access to least-privilege
- Rotate keys and revoke temporary credentials

### 4. Recovery
- Restore from backups if data was modified
- Notify affected parties per compliance requirements

## S3 Security Best Practices
- Block public access at account level
- Use bucket policies with explicit Allow (avoid broad Deny)
- Enable S3 access logging
- Use VPC endpoints for private access
- Encrypt data at rest (SSE-S3 or SSE-KMS)

## AWS CLI Commands
```bash
# Block public access on bucket
aws s3api put-public-access-block --bucket my-bucket \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# List bucket policies
aws s3api get-bucket-policy --bucket my-bucket
```

## Compliance Considerations
- GDPR, CCPA: Breach notification timelines
- PCI DSS: Restrict cardholder data access
- HIPAA: BAA requirements, audit logging
