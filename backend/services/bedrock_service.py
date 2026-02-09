"""
Amazon Bedrock service wrapper for Nova models
"""
import json
import asyncio
import boto3
from typing import Dict, Any, Optional, List
from botocore.exceptions import ClientError

from utils.config import get_settings
from utils.logger import logger
from utils.logger import logger


class BedrockService:
    """Wrapper for Amazon Bedrock Runtime API"""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Create session with profile if specified
        if self.settings.aws_profile and self.settings.aws_profile != "default":
            session = boto3.Session(profile_name=self.settings.aws_profile)
            logger.info(f"Using AWS profile: {self.settings.aws_profile}")
        else:
            session = boto3.Session()
            logger.info("Using default AWS credentials")
        
        self.client = session.client(
            'bedrock-runtime',
            region_name=self.settings.aws_region
        )
        logger.info(f"Bedrock client initialized for region: {self.settings.aws_region}")
        
    async def invoke_nova_lite(
        self,
        prompt: str,
        max_tokens: int = 8000,
        temperature: float = 0.2,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Invoke Nova 2 Lite model for reasoning tasks
        
        Args:
            prompt: User prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 = deterministic)
            system_prompt: Optional system prompt for context
            
        Returns:
            Model response with generated text
        """
        try:
            # Nova models don't support "system" role - combine system prompt with user prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"
            else:
                full_prompt = prompt
            
            # Nova models use "user" role only
            messages = [{
                "role": "user",
                "content": [{"text": full_prompt}]
            }]
            
            request_body = {
                "messages": messages,
                "inferenceConfig": {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature
                }
            }
            
            logger.info(f"Invoking Nova 2 Lite with prompt length: {len(prompt)}")
            
            # Run blocking boto3 call in thread pool to avoid blocking event loop
            response = await asyncio.to_thread(
                self.client.invoke_model,
                modelId=self.settings.nova_lite_model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            
            logger.info("Nova 2 Lite invocation successful")
            
            return {
                "text": response_body['output']['message']['content'][0]['text'],
                "stop_reason": response_body.get('stopReason', 'end_turn'),
                "usage": response_body.get('usage', {})
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova 2 Lite: {e}")
            raise
    
    async def invoke_nova_pro(
        self,
        prompt: str,
        image_data: Optional[bytes] = None,
        max_tokens: int = 4000,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Invoke Nova Pro model for multimodal analysis
        
        Args:
            prompt: User prompt
            image_data: Optional image bytes for multimodal analysis
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            Model response with analysis
        """
        try:
            content = []
            
            # Add image if provided
            if image_data:
                content.append({
                    "image": {
                        "format": "png",
                        "source": {
                            "bytes": image_data
                        }
                    }
                })
            
            # Add text prompt
            content.append({"text": prompt})
            
            request_body = {
                "messages": [{
                    "role": "user",
                    "content": content
                }],
                "inferenceConfig": {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature
                }
            }
            
            logger.info(f"Invoking Nova Pro (multimodal: {image_data is not None})")
            
            # Run blocking boto3 call in thread pool to avoid blocking event loop
            response = await asyncio.to_thread(
                self.client.invoke_model,
                modelId=self.settings.nova_pro_model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            
            logger.info("Nova Pro invocation successful")
            
            return {
                "text": response_body['output']['message']['content'][0]['text'],
                "stop_reason": response_body.get('stopReason', 'end_turn'),
                "usage": response_body.get('usage', {})
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova Pro: {e}")
            raise
    
    async def invoke_nova_micro(
        self,
        prompt: str,
        max_tokens: int = 500,
        temperature: float = 0.0
    ) -> Dict[str, Any]:
        """
        Invoke Nova Micro model for fast classification
        
        Args:
            prompt: User prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 for deterministic)
            
        Returns:
            Model response with classification
        """
        try:
            request_body = {
                "messages": [{
                    "role": "user",
                    "content": [{"text": prompt}]
                }],
                "inferenceConfig": {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature
                }
            }
            
            logger.info("Invoking Nova Micro for classification")
            
            # Run blocking boto3 call in thread pool to avoid blocking event loop
            response = await asyncio.to_thread(
                self.client.invoke_model,
                modelId=self.settings.nova_micro_model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            
            logger.info("Nova Micro invocation successful")
            
            return {
                "text": response_body['output']['message']['content'][0]['text'],
                "stop_reason": response_body.get('stopReason', 'end_turn'),
                "usage": response_body.get('usage', {})
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error invoking Nova Micro: {e}")
            raise
