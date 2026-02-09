"""
Configuration management for SecOps Lens Pro
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # AWS Configuration
    aws_region: str = "us-east-1"
    aws_profile: str = "default"
    
    # Amazon Bedrock Model IDs
    nova_lite_model_id: str = "amazon.nova-lite-v1:0"
    nova_pro_model_id: str = "amazon.nova-pro-v1:0"
    nova_micro_model_id: str = "amazon.nova-micro-v1:0"
    nova_sonic_model_id: str = "amazon.nova-sonic-v1:0"
    nova_embed_model_id: str = "amazon.nova-embed-v1:0"
    # Note: Nova Act is for browser automation. Documentation agent uses Nova 2 Lite for content generation.
    # Future: Could use Nova Act for actual browser automation to post to JIRA/Slack/Confluence
    
    # AWS Resources
    dynamodb_table: str = "secops-incidents"
    s3_bucket_cloudtrail: str = "secops-lens-cloudtrail-logs"
    s3_bucket_diagrams: str = "secops-lens-diagrams"
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
