"""
Amazon CloudTrail service for fetching real API events
"""
import asyncio
import boto3
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger


class CloudTrailService:
    """Service for fetching real CloudTrail events"""
    
    def __init__(self, profile: Optional[str] = None):
        self.settings = get_settings()
        
        # Use provided profile, or fall back to settings, or default
        profile_to_use = profile or self.settings.aws_profile
        
        # Create session with profile if specified
        if profile_to_use and profile_to_use != "default":
            self.session = boto3.Session(profile_name=profile_to_use)
            logger.info(f"Using AWS profile: {profile_to_use} for CloudTrail")
        else:
            self.session = boto3.Session()
            logger.info("Using default AWS credentials for CloudTrail")
        
        self.client = self.session.client(
            'cloudtrail',
            region_name=self.settings.aws_region
        )
        logger.info(f"CloudTrail client initialized for region: {self.settings.aws_region}")
    
    async def lookup_events(
        self,
        event_names: Optional[List[str]] = None,
        resource_arns: Optional[List[str]] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        max_results: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Lookup CloudTrail events
        
        Args:
            event_names: Filter by event names (e.g., ['CreateRole', 'AssumeRole'])
            resource_arns: Filter by resource ARNs
            start_time: Start time for lookup
            end_time: End time for lookup
            max_results: Maximum number of events to return
            
        Returns:
            List of CloudTrail events
        """
        try:
            if not start_time:
                start_time = datetime.utcnow() - timedelta(days=7)
            if not end_time:
                end_time = datetime.utcnow()
            
            lookup_attributes = []
            
            if event_names:
                for event_name in event_names:
                    lookup_attributes.append({
                        'AttributeKey': 'EventName',
                        'AttributeValue': event_name
                    })
            
            if resource_arns:
                for resource_arn in resource_arns:
                    lookup_attributes.append({
                        'AttributeKey': 'ResourceArn',
                        'AttributeValue': resource_arn
                    })
            
            all_events = []
            
            # CloudTrail lookup_events returns max 50 per call, so we paginate
            next_token = None
            
            while len(all_events) < max_results:
                params = {
                    'StartTime': start_time,
                    'EndTime': end_time,
                    'MaxResults': min(50, max_results - len(all_events))
                }
                
                if lookup_attributes:
                    params['LookupAttributes'] = lookup_attributes[:1]  # Only one at a time
                
                if next_token:
                    params['NextToken'] = next_token
                
                response = await asyncio.to_thread(
                    self.client.lookup_events,
                    **params
                )
                
                events = response.get('Events', [])
                all_events.extend(events)
                
                next_token = response.get('NextToken')
                if not next_token or len(all_events) >= max_results:
                    break
            
            logger.info(f"Retrieved {len(all_events)} CloudTrail events")
            return all_events[:max_results]
            
        except ClientError as e:
            logger.error(f"Error fetching CloudTrail events: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error fetching CloudTrail events: {e}")
            return []
    
    async def get_security_events(
        self,
        days_back: int = 7,
        max_results: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get security-relevant CloudTrail events
        
        Args:
            days_back: How many days back to search
            max_results: Maximum number of events
            
        Returns:
            List of security events
        """
        # Security-relevant event names
        security_event_names = [
            'CreateRole',
            'AssumeRole',
            'PutRolePolicy',
            'AttachRolePolicy',
            'CreateUser',
            'PutUserPolicy',
            'CreateAccessKey',
            'AuthorizeSecurityGroupIngress',
            'AuthorizeSecurityGroupEgress',
            'RevokeSecurityGroupIngress',
            'RevokeSecurityGroupEgress',
            'ModifyInstanceAttribute',
            'RunInstances',
            'TerminateInstances',
            'CreateBucket',
            'PutBucketPolicy',
            'PutObject',
            'GetObject',
            'DeleteBucket',
            'DeleteObject'
        ]
        
        start_time = datetime.utcnow() - timedelta(days=days_back)
        end_time = datetime.utcnow()
        
        all_events = []
        
        # Fetch events in batches (CloudTrail limits to 1 lookup attribute at a time)
        for event_name in security_event_names[:10]:  # Limit to avoid too many calls
            events = await self.lookup_events(
                event_names=[event_name],
                start_time=start_time,
                end_time=end_time,
                max_results=max_results // len(security_event_names[:10])
            )
            all_events.extend(events)
            
            if len(all_events) >= max_results:
                break
        
        # Sort by time and remove duplicates
        unique_events = {}
        for event in all_events:
            event_id = event.get('EventId')
            if event_id and event_id not in unique_events:
                unique_events[event_id] = event
        
        sorted_events = sorted(
            unique_events.values(),
            key=lambda x: x.get('EventTime', ''),
            reverse=True
        )
        
        return sorted_events[:max_results]
