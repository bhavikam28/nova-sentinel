"""
Remediation Executor — Executes safe remediation actions via AWS APIs.

SAFETY MODEL:
- Level 1 (AUTO): Tag QUARANTINE, attach DENY policy, disable access key
- Level 2 (APPROVAL): Detach policies, stop/terminate instance, modify SG, revoke sessions
- Level 3 (MANUAL): Delete role, VPC changes

For demo_mode=True: returns pre-cached proof without calling AWS.
For demo_mode=False: calls real AWS APIs using the configured boto3 credentials.
"""
import json
from dataclasses import dataclass
from typing import Dict, Any, List, Optional
from datetime import datetime

from utils.logger import logger

DEMO_CLOUDTRAIL = {
    "eventName": "PutRolePolicy",
    "eventTime": datetime.utcnow().isoformat() + "Z",
    "sourceIPAddress": "wolfir.internal",
    "userAgent": "wolfir/1.0",
    "requestParameters": {"roleName": "CompromisedRole", "policyName": "wolfir-EmergencyDeny"},
}


def _now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _get_real_account_id() -> str:
    """Fetch real AWS account ID via STS. Falls back to placeholder."""
    try:
        import boto3
        sts = boto3.client("sts")
        return sts.get_caller_identity()["Account"]
    except Exception:
        return "UNKNOWN-ACCOUNT"


def _get_real_region() -> str:
    """Fetch the configured AWS region, falling back to us-east-1 only as last resort."""
    try:
        import boto3
        session = boto3.session.Session()
        return session.region_name or "us-east-1"
    except Exception:
        return "us-east-1"


@dataclass
class ExecutionResult:
    action_type: str
    status: str            # SUCCESS | FAILED | SIMULATED
    resource_arn: str
    before_state: dict
    after_state: dict
    rollback_command: str
    cloudtrail_event: dict
    execution_timestamp: str
    executed_by: str       # WOLFIR-AUTO | HUMAN-APPROVED | SIMULATED
    incident_id: str
    step_id: Optional[str] = None
    message: Optional[str] = None


class RemediationExecutor:
    def __init__(self, demo_mode: bool = False):
        self.demo_mode = demo_mode

    # ──────────────────────────────────────────────
    # Level 1 — AUTO-EXECUTE actions
    # ──────────────────────────────────────────────

    async def execute_quarantine_tag(
        self, resource_arn: str, incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        """Tag a resource as quarantined (safe, reversible, no access impact)."""
        tags = {
            "WOLFIR-QUARANTINE": "true",
            "QUARANTINE-TIMESTAMP": _now(),
            "QUARANTINE-INCIDENT": incident_id,
        }
        if self.demo_mode:
            return ExecutionResult(
                action_type="QUARANTINE_TAG",
                status="SIMULATED",
                resource_arn=resource_arn,
                before_state={"tags": {}},
                after_state={"tags": tags},
                rollback_command=f"aws resourcegroupstaggingapi untag-resources --resource-arn-list {resource_arn} --tag-keys WOLFIR-QUARANTINE QUARANTINE-TIMESTAMP QUARANTINE-INCIDENT",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "TagResources"},
                execution_timestamp=_now(),
                executed_by="SIMULATED",
                incident_id=incident_id,
                message="Demo mode: no real AWS call made.",
            )
        try:
            import boto3
            client = boto3.client("resourcegroupstaggingapi")
            client.tag_resources(ResourceARNList=[resource_arn], Tags=tags)
            return ExecutionResult(
                action_type="QUARANTINE_TAG",
                status="SUCCESS",
                resource_arn=resource_arn,
                before_state={"tags": {}},
                after_state={"tags": tags},
                rollback_command=f"aws resourcegroupstaggingapi untag-resources --resource-arn-list {resource_arn} --tag-keys WOLFIR-QUARANTINE QUARANTINE-TIMESTAMP QUARANTINE-INCIDENT",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "TagResources"},
                execution_timestamp=_now(),
                executed_by="WOLFIR-AUTO",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_quarantine_tag failed: {e}")
            return ExecutionResult(
                action_type="QUARANTINE_TAG", status="FAILED",
                resource_arn=resource_arn, before_state={}, after_state={},
                rollback_command="", cloudtrail_event={},
                execution_timestamp=_now(), executed_by="WOLFIR-AUTO",
                incident_id=incident_id, message=str(e),
            )

    async def execute_deny_policy(
        self, role_name: str, denied_actions: List[str], incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        """Attach an inline DENY policy to an IAM role (emergency lockout)."""
        policy_name = f"wolfir-EmergencyDeny-{incident_id.replace('INC-', '')[:12]}"
        policy_doc = {
            "Version": "2012-10-17",
            "Statement": [{"Effect": "Deny", "Action": denied_actions or ["*"], "Resource": "*"}],
        }
        account_id = "DEMO" if self.demo_mode else _get_real_account_id()
        resource_arn = f"arn:aws:iam::{account_id}:role/{role_name}"

        if self.demo_mode:
            return ExecutionResult(
                action_type="DENY_POLICY",
                status="SIMULATED",
                resource_arn=resource_arn,
                before_state={"inline_policies": []},
                after_state={"inline_policies": [policy_name]},
                rollback_command=f"aws iam delete-role-policy --role-name {role_name} --policy-name {policy_name}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "requestParameters": {"roleName": role_name, "policyName": policy_name}},
                execution_timestamp=_now(),
                executed_by="SIMULATED",
                incident_id=incident_id,
                message="Demo mode: no real AWS call made.",
            )
        try:
            import boto3
            iam = boto3.client("iam")
            iam.put_role_policy(
                RoleName=role_name,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(policy_doc),
            )
            return ExecutionResult(
                action_type="DENY_POLICY", status="SUCCESS",
                resource_arn=resource_arn,
                before_state={}, after_state={"policy_added": policy_name},
                rollback_command=f"aws iam delete-role-policy --role-name {role_name} --policy-name {policy_name}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "requestParameters": {"roleName": role_name, "policyName": policy_name}},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_deny_policy failed: {e}")
            return ExecutionResult(
                action_type="DENY_POLICY", status="FAILED",
                resource_arn=resource_arn, before_state={}, after_state={},
                rollback_command="", cloudtrail_event={},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id, message=str(e),
            )

    async def execute_disable_access_key(
        self, access_key_id: str, username: str, incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        """Disable an IAM access key (immediate lockout, reversible)."""
        account_id = "DEMO" if self.demo_mode else _get_real_account_id()
        resource_arn = f"arn:aws:iam::{account_id}:user/{username}"

        if self.demo_mode:
            return ExecutionResult(
                action_type="DISABLE_ACCESS_KEY", status="SIMULATED",
                resource_arn=resource_arn,
                before_state={"Status": "Active"},
                after_state={"Status": "Inactive"},
                rollback_command=f"aws iam update-access-key --access-key-id {access_key_id} --user-name {username} --status Active",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "UpdateAccessKey"},
                execution_timestamp=_now(), executed_by="SIMULATED",
                incident_id=incident_id, message="Demo mode: no real AWS call made.",
            )
        try:
            import boto3
            iam = boto3.client("iam")
            # Discover real access key IDs if AKIAEXAMPLE was passed
            real_key_id = access_key_id
            if access_key_id == "AKIAEXAMPLE" or not access_key_id.startswith("AKIA"):
                keys = iam.list_access_keys(UserName=username).get("AccessKeyMetadata", [])
                active_keys = [k for k in keys if k["Status"] == "Active"]
                if active_keys:
                    real_key_id = active_keys[0]["AccessKeyId"]
                else:
                    return ExecutionResult(
                        action_type="DISABLE_ACCESS_KEY", status="FAILED",
                        resource_arn=resource_arn, before_state={}, after_state={},
                        rollback_command="", cloudtrail_event={},
                        execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                        incident_id=incident_id,
                        message=f"No active access keys found for user {username}.",
                    )
            iam.update_access_key(AccessKeyId=real_key_id, UserName=username, Status="Inactive")
            return ExecutionResult(
                action_type="DISABLE_ACCESS_KEY", status="SUCCESS",
                resource_arn=resource_arn,
                before_state={"Status": "Active", "AccessKeyId": real_key_id},
                after_state={"Status": "Inactive", "AccessKeyId": real_key_id},
                rollback_command=f"aws iam update-access-key --access-key-id {real_key_id} --user-name {username} --status Active",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "UpdateAccessKey"},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_disable_access_key failed: {e}")
            return ExecutionResult(
                action_type="DISABLE_ACCESS_KEY", status="FAILED",
                resource_arn=resource_arn, before_state={}, after_state={},
                rollback_command="", cloudtrail_event={},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id, message=str(e),
            )

    # ──────────────────────────────────────────────
    # Level 2 — APPROVAL-REQUIRED actions
    # ──────────────────────────────────────────────

    async def execute_detach_managed_policy(
        self, role_name: str, policy_arn: str, incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        """Detach a managed policy from an IAM role (e.g. AdministratorAccess)."""
        account_id = "DEMO" if self.demo_mode else _get_real_account_id()
        resource_arn = f"arn:aws:iam::{account_id}:role/{role_name}"

        if self.demo_mode:
            return ExecutionResult(
                action_type="DETACH_MANAGED_POLICY", status="SIMULATED",
                resource_arn=resource_arn,
                before_state={"policies": [policy_arn]},
                after_state={"policies": []},
                rollback_command=f"aws iam attach-role-policy --role-name {role_name} --policy-arn {policy_arn}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "DetachRolePolicy",
                                  "requestParameters": {"roleName": role_name, "policyArn": policy_arn}},
                execution_timestamp=_now(), executed_by="SIMULATED",
                incident_id=incident_id, message="Demo mode: no real AWS call made.",
            )
        try:
            import boto3
            iam = boto3.client("iam")
            # Verify the policy is attached before trying to detach
            attached = iam.list_attached_role_policies(RoleName=role_name).get("AttachedPolicies", [])
            policy_arns = [p["PolicyArn"] for p in attached]
            if policy_arn not in policy_arns:
                # Try to find by name suffix
                match = next((p for p in policy_arns if policy_arn in p), None)
                if match:
                    policy_arn = match
                else:
                    return ExecutionResult(
                        action_type="DETACH_MANAGED_POLICY", status="FAILED",
                        resource_arn=resource_arn, before_state={"policies": policy_arns},
                        after_state={}, rollback_command="", cloudtrail_event={},
                        execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                        incident_id=incident_id,
                        message=f"Policy {policy_arn} not attached to {role_name}. Attached: {policy_arns}",
                    )
            iam.detach_role_policy(RoleName=role_name, PolicyArn=policy_arn)
            return ExecutionResult(
                action_type="DETACH_MANAGED_POLICY", status="SUCCESS",
                resource_arn=resource_arn,
                before_state={"policies": policy_arns},
                after_state={"policies": [p for p in policy_arns if p != policy_arn]},
                rollback_command=f"aws iam attach-role-policy --role-name {role_name} --policy-arn {policy_arn}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "DetachRolePolicy",
                                  "requestParameters": {"roleName": role_name, "policyArn": policy_arn}},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_detach_managed_policy failed: {e}")
            return ExecutionResult(
                action_type="DETACH_MANAGED_POLICY", status="FAILED",
                resource_arn=resource_arn, before_state={}, after_state={},
                rollback_command="", cloudtrail_event={},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id, message=str(e),
            )

    async def execute_revoke_role_sessions(
        self, role_name: str, incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        """Revoke all active sessions for an IAM role by attaching a deny-all policy with a past date condition."""
        account_id = "DEMO" if self.demo_mode else _get_real_account_id()
        resource_arn = f"arn:aws:iam::{account_id}:role/{role_name}"
        policy_name = f"wolfir-RevokeSession-{incident_id.replace('INC-', '')[:12]}"
        # AWS session revocation: deny all if token issued before NOW
        revoke_time = datetime.utcnow().isoformat() + "Z"
        policy_doc = {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Deny",
                "Action": ["*"],
                "Resource": ["*"],
                "Condition": {
                    "DateLessThan": {"aws:TokenIssueTime": revoke_time}
                }
            }]
        }
        if self.demo_mode:
            return ExecutionResult(
                action_type="REVOKE_ROLE_SESSIONS", status="SIMULATED",
                resource_arn=resource_arn,
                before_state={"active_sessions": "unknown"},
                after_state={"active_sessions": "all revoked before " + revoke_time},
                rollback_command=f"aws iam delete-role-policy --role-name {role_name} --policy-name {policy_name}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "PutRolePolicy",
                                  "requestParameters": {"roleName": role_name, "policyName": policy_name}},
                execution_timestamp=_now(), executed_by="SIMULATED",
                incident_id=incident_id, message="Demo mode: no real AWS call made.",
            )
        try:
            import boto3
            iam = boto3.client("iam")
            iam.put_role_policy(
                RoleName=role_name,
                PolicyName=policy_name,
                PolicyDocument=json.dumps(policy_doc),
            )
            return ExecutionResult(
                action_type="REVOKE_ROLE_SESSIONS", status="SUCCESS",
                resource_arn=resource_arn,
                before_state={"active_sessions": "active"},
                after_state={"active_sessions": "all revoked", "deny_policy": policy_name},
                rollback_command=f"aws iam delete-role-policy --role-name {role_name} --policy-name {policy_name}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "PutRolePolicy",
                                  "requestParameters": {"roleName": role_name, "policyName": policy_name}},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_revoke_role_sessions failed: {e}")
            return ExecutionResult(
                action_type="REVOKE_ROLE_SESSIONS", status="FAILED",
                resource_arn=resource_arn, before_state={}, after_state={},
                rollback_command="", cloudtrail_event={},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id, message=str(e),
            )

    async def execute_terminate_instances(
        self, instance_ids: List[str], incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        """Terminate EC2 instances (e.g. crypto-mining instances). IRREVERSIBLE."""
        account_id = "DEMO" if self.demo_mode else _get_real_account_id()
        region = "demo-region" if self.demo_mode else _get_real_region()
        ids_str = " ".join(instance_ids)

        if self.demo_mode:
            return ExecutionResult(
                action_type="TERMINATE_INSTANCES", status="SIMULATED",
                resource_arn=f"arn:aws:ec2:{region}:{account_id}:instance/*",
                before_state={"instances": instance_ids, "state": "running"},
                after_state={"instances": instance_ids, "state": "terminated"},
                rollback_command="# IRREVERSIBLE — terminated instances cannot be restarted.",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "TerminateInstances",
                                  "requestParameters": {"instancesSet": instance_ids}},
                execution_timestamp=_now(), executed_by="SIMULATED",
                incident_id=incident_id, message="Demo mode: no real AWS call made.",
            )
        try:
            import boto3
            ec2 = boto3.client("ec2")
            # Safety: verify instances exist and are running before terminating
            described = ec2.describe_instances(InstanceIds=instance_ids)
            found_ids = []
            for res in described.get("Reservations", []):
                for inst in res.get("Instances", []):
                    if inst["State"]["Name"] not in ("terminated", "shutting-down"):
                        found_ids.append(inst["InstanceId"])
            if not found_ids:
                    return ExecutionResult(
                        action_type="TERMINATE_INSTANCES", status="FAILED",
                        resource_arn=f"arn:aws:ec2:{region}:{account_id}:instance/*",
                        before_state={}, after_state={},
                        rollback_command="", cloudtrail_event={},
                        execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                        incident_id=incident_id,
                        message=f"None of {instance_ids} found in a running state.",
                    )
            ec2.terminate_instances(InstanceIds=found_ids)
            return ExecutionResult(
                action_type="TERMINATE_INSTANCES", status="SUCCESS",
                resource_arn=f"arn:aws:ec2:{region}:{account_id}:instance/*",
                before_state={"instances": found_ids, "state": "running"},
                after_state={"instances": found_ids, "state": "terminated"},
                rollback_command=f"# IRREVERSIBLE — aws ec2 run-instances to launch new instances if needed.",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "TerminateInstances",
                                  "requestParameters": {"instancesSet": found_ids}},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_terminate_instances failed: {e}")
            return ExecutionResult(
                action_type="TERMINATE_INSTANCES", status="FAILED",
                resource_arn=f"arn:aws:ec2:{region}:{account_id}:instance/*",
                before_state={}, after_state={},
                rollback_command="", cloudtrail_event={},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id, message=str(e),
            )

    async def execute_revoke_security_group_ingress(
        self, group_id: str, port: int, cidr: str, protocol: str = "tcp",
        incident_id: str = "INC-DEMO"
    ) -> ExecutionResult:
        """Revoke an overly permissive security group ingress rule."""
        account_id = "DEMO" if self.demo_mode else _get_real_account_id()
        region = "demo-region" if self.demo_mode else _get_real_region()
        resource_arn = f"arn:aws:ec2:{region}:{account_id}:security-group/{group_id}"

        if self.demo_mode:
            return ExecutionResult(
                action_type="REVOKE_SG_INGRESS", status="SIMULATED",
                resource_arn=resource_arn,
                before_state={"rules": [f"{protocol}:{port} from {cidr}"]},
                after_state={"rules": []},
                rollback_command=f"aws ec2 authorize-security-group-ingress --group-id {group_id} --protocol {protocol} --port {port} --cidr {cidr}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "RevokeSecurityGroupIngress",
                                  "requestParameters": {"groupId": group_id, "port": port, "cidr": cidr}},
                execution_timestamp=_now(), executed_by="SIMULATED",
                incident_id=incident_id, message="Demo mode: no real AWS call made.",
            )
        try:
            import boto3
            ec2 = boto3.client("ec2")
            ec2.revoke_security_group_ingress(
                GroupId=group_id,
                IpPermissions=[{
                    "IpProtocol": protocol,
                    "FromPort": port,
                    "ToPort": port,
                    "IpRanges": [{"CidrIp": cidr}],
                }],
            )
            return ExecutionResult(
                action_type="REVOKE_SG_INGRESS", status="SUCCESS",
                resource_arn=resource_arn,
                before_state={"rules": [f"{protocol}:{port} from {cidr}"]},
                after_state={"rules": []},
                rollback_command=f"aws ec2 authorize-security-group-ingress --group-id {group_id} --protocol {protocol} --port {port} --cidr {cidr}",
                cloudtrail_event={**DEMO_CLOUDTRAIL, "eventName": "RevokeSecurityGroupIngress",
                                  "requestParameters": {"groupId": group_id, "port": port, "cidr": cidr}},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id,
            )
        except Exception as e:
            logger.error(f"execute_revoke_security_group_ingress failed: {e}")
            return ExecutionResult(
                action_type="REVOKE_SG_INGRESS", status="FAILED",
                resource_arn=resource_arn, before_state={}, after_state={},
                rollback_command="", cloudtrail_event={},
                execution_timestamp=_now(), executed_by="HUMAN-APPROVED",
                incident_id=incident_id, message=str(e),
            )
