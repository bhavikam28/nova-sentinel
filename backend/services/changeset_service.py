"""
ChangeSet Analysis Service — Attack path–aware CloudFormation ChangeSet risk assessment
Analyzes CloudFormation ChangeSets for changes that could create or widen attack paths.
"""
import boto3
from typing import Dict, Any, List, Optional
from utils.config import get_settings
from utils.logger import logger

# Resource types that commonly affect attack paths
ATTACK_PATH_HIGH_RISK = {
    "AWS::IAM::Role", "AWS::IAM::Policy", "AWS::IAM::ManagedPolicy", "AWS::IAM::User",
    "AWS::EC2::SecurityGroup", "AWS::EC2::SecurityGroupIngress", "AWS::EC2::SecurityGroupEgress",
    "AWS::S3::BucketPolicy", "AWS::S3::Bucket",
    "AWS::SecretsManager::Secret", "AWS::SecretsManager::ResourcePolicy",
    "AWS::RDS::DBInstance", "AWS::RDS::DBSecurityGroup",
    "AWS::Lambda::Permission", "AWS::ApiGateway::RestApi", "AWS::ApiGateway::Method",
    "AWS::Bedrock::Guardrail", "AWS::Bedrock::GuardrailVersion", "AWS::Bedrock::ModelInvocationLoggingConfiguration",
}
ATTACK_PATH_MEDIUM_RISK = {
    "AWS::EC2::Instance", "AWS::Lambda::Function", "AWS::ECS::Service",
    "AWS::EKS::Cluster", "AWS::ApiGateway::Stage",
}
RISKY_ACTIONS = {"Add", "Modify", "Remove", "Dynamic"}
REPLACE_OR_DELETE = {"Replace", "Delete"}


def analyze_changeset(
    stack_name: str,
    change_set_name: str,
    region: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Analyze a CloudFormation ChangeSet for attack path risk.
    Returns risk score, risky changes, and attack path implication.
    """
    settings = get_settings()
    reg = region or settings.aws_region
    session = (
        boto3.Session(profile_name=settings.aws_profile)
        if settings.aws_profile and settings.aws_profile != "default"
        else boto3.Session()
    )
    cfn = session.client("cloudformation", region_name=reg)

    try:
        resp = cfn.describe_change_set(
            StackName=stack_name,
            ChangeSetName=change_set_name,
        )
    except Exception as e:
        logger.error(f"DescribeChangeSet failed: {e}")
        return {
            "error": str(e),
            "risk_score": 0,
            "risk_level": "unknown",
            "risky_changes": [],
            "attack_path_implication": "Unable to analyze ChangeSet.",
            "total_changes": 0,
        }

    changes = resp.get("Changes", [])
    risky_changes: List[Dict[str, Any]] = []
    total_risk = 0

    for c in changes:
        rc = c.get("ResourceChange", {})
        if not rc:
            continue
        action = rc.get("Action", "")
        resource_type = rc.get("ResourceType", "")
        logical_id = rc.get("LogicalResourceId", "")
        physical_id = rc.get("PhysicalResourceId", "")
        replacement = rc.get("Replacement", "")

        risk = 0
        reason = ""

        # Replace or Delete always flagged
        if action in REPLACE_OR_DELETE or replacement == "True":
            risk = 9
            reason = f"{action} / Replacement — resource will be replaced or removed"
        elif resource_type in ATTACK_PATH_HIGH_RISK:
            risk = 8
            reason = f"High-impact resource: {resource_type} — can affect IAM, network, or data access"
        elif resource_type in ATTACK_PATH_MEDIUM_RISK:
            risk = 5
            reason = f"Medium-impact: {resource_type} — compute or API exposure"
        elif "IAM" in resource_type or "Security" in resource_type:
            risk = 7
            reason = f"Security-related: {resource_type}"

        if risk > 0:
            risky_changes.append({
                "logical_id": logical_id,
                "resource_type": resource_type,
                "action": action,
                "physical_id": physical_id or "(new)",
                "risk_score": risk,
                "reason": reason,
            })
            total_risk += risk

    # Compute overall risk score
    max_possible = len(changes) * 10 if changes else 1
    risk_score = min(100, round((total_risk / max_possible) * 100)) if changes else 0
    if risky_changes and not risk_score:
        risk_score = min(100, sum(r["risk_score"] for r in risky_changes) // max(1, len(risky_changes)))

    risk_level = "critical" if risk_score >= 70 else "high" if risk_score >= 50 else "medium" if risk_score >= 25 else "low"

    # Attack path implication
    implication = _build_attack_path_implication(risky_changes, risk_level)

    return {
        "stack_name": stack_name,
        "change_set_name": change_set_name,
        "change_set_status": resp.get("Status", ""),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risky_changes": risky_changes,
        "attack_path_implication": implication,
        "total_changes": len(changes),
        "recommendation": "Require human approval before deployment." if risk_score >= 50 else "Review changes before deployment." if risk_score >= 25 else "Low risk — consider auto-approve for safe changes.",
    }


def _build_attack_path_implication(risky_changes: List[Dict], risk_level: str) -> str:
    if not risky_changes:
        return "No changes detected that would create or widen attack paths. Safe to deploy."

    high = [r for r in risky_changes if r["risk_score"] >= 7]
    if not high:
        return "No high-risk changes. Minor resource updates — low attack path impact."

    parts = []
    has_iam = any("IAM" in r["resource_type"] for r in high)
    has_sg = any("SecurityGroup" in r["resource_type"] for r in high)
    has_s3 = any("S3" in r["resource_type"] for r in high)
    has_bedrock = any("Bedrock" in r["resource_type"] for r in high)
    has_delete = any(r["action"] in ("Delete", "Replace") for r in high)

    if has_iam:
        parts.append("IAM changes — may create privilege escalation or new attack paths.")
    if has_bedrock:
        parts.append("Bedrock/Guardrails changes — may affect AI security posture or model access.")
    if has_sg:
        parts.append("Security group changes — may expose resources to the internet.")
    if has_s3:
        parts.append("S3 or bucket policy changes — may affect data access or exfiltration risk.")
    if has_delete:
        parts.append("Resource replacement or deletion — verify no unintended blast radius.")

    if not parts:
        parts.append("High-impact resource changes detected — review before deployment.")

    return " ".join(parts)


def list_changesets(stack_name: str, region: Optional[str] = None) -> Dict[str, Any]:
    """
    List ChangeSets for a CloudFormation stack.
    Returns ChangeSet names and statuses for dropdown/selection.
    """
    settings = get_settings()
    reg = region or settings.aws_region
    session = (
        boto3.Session(profile_name=settings.aws_profile)
        if settings.aws_profile and settings.aws_profile != "default"
        else boto3.Session()
    )
    cfn = session.client("cloudformation", region_name=reg)

    try:
        paginator = cfn.get_paginator("list_change_sets")
        change_sets: List[Dict[str, str]] = []
        for page in paginator.paginate(StackName=stack_name):
            for cs in page.get("Summaries", []):
                change_sets.append({
                    "change_set_name": cs.get("ChangeSetName", ""),
                    "change_set_id": cs.get("ChangeSetId", ""),
                    "status": cs.get("Status", ""),
                    "execution_status": cs.get("ExecutionStatus", ""),
                })
        return {"stack_name": stack_name, "change_sets": change_sets}
    except Exception as e:
        logger.error(f"ListChangeSets failed: {e}")
        return {"error": str(e), "stack_name": stack_name, "change_sets": []}
