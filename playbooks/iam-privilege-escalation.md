# IAM Privilege Escalation: Detection and Remediation

## Overview
Privilege escalation in AWS IAM occurs when an attacker gains higher permissions than intended, often through overly permissive policies, role assumption chains, or policy manipulation.

## Common Escalation Paths

### 1. PassRole + EC2/Lambda
- Attacker with `iam:PassRole` and `ec2:RunInstances` can launch an instance with a high-privilege role
- Mitigation: Restrict PassRole to least-privilege roles only

### 2. CreateAccessKey on Other Users
- `iam:CreateAccessKey` on another user allows key creation
- Mitigation: Never grant CreateAccessKey for `Resource: "*"`

### 3. PutUserPolicy / PutRolePolicy
- Inline policy attachment can grant self-modification
- Mitigation: Prefer managed policies; audit inline policies

### 4. UpdateAssumeRolePolicy
- Modifying trust policies to add unauthorized principals
- Mitigation: Use conditions (e.g., MFA, IP) in trust policies

## Detection
- CloudTrail: CreateAccessKey, PutUserPolicy, PutRolePolicy, AttachUserPolicy
- Look for events from non-break-glass principals
- Security Hub: IAM.1 (unused credentials), IAM.2 (MFA not enabled)

## Remediation Steps

### Immediate
1. Revoke newly created access keys
2. Revert inline policy changes
3. Remove unauthorized trust policy principals

### Short-term
1. Enable MFA for all human users
2. Implement permission boundaries
3. Use AWS Organizations SCPs to deny dangerous actions

### Long-term
1. Adopt least-privilege with regular access reviews
2. Use IAM Access Analyzer for policy validation
3. Implement just-in-time access (e.g., PAM)

## AWS Best Practices
- Use roles instead of long-term access keys where possible
- Enable CloudTrail in all regions
- Use IAM Access Analyzer to detect external access
- Implement session duration limits for assumed roles
