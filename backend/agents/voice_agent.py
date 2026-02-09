"""
Voice Agent - Nova 2 Sonic powered speech-to-text and text-to-speech
Handles voice commands and voice confirmations
"""
import json
import time
from typing import Dict, Any, Optional

from services.bedrock_service import BedrockService
from utils.logger import logger


class VoiceAgent:
    """
    Agent responsible for voice interface using Nova 2 Sonic
    """
    
    def __init__(self):
        self.bedrock = BedrockService()
        
    async def speech_to_text(
        self,
        audio_data: bytes,
        language: str = "en-US"
    ) -> Dict[str, Any]:
        """
        Convert speech to text using Nova 2 Sonic
        
        Args:
            audio_data: Raw audio bytes (WAV, MP3, etc.)
            language: Language code (default: en-US)
            
        Returns:
            Transcription with text and confidence
        """
        start_time = time.time()
        
        try:
            logger.info(f"Converting speech to text (audio size: {len(audio_data)} bytes)")
            
            # Note: Nova 2 Sonic speech-to-text would use the audio input
            # For now, we'll use a text-based approach as a placeholder
            # In production, this would use the actual audio API
            
            # This is a placeholder - actual implementation would use Nova 2 Sonic's audio API
            # For the hackathon, we can simulate this or use a different approach
            
            prompt = f"""You are a voice command processor for a security incident response system.
Process the following voice command and extract the intent and parameters.

Voice command transcription (simulated for demo):
[Audio would be processed here in production]

For now, return a JSON response with:
- text: The transcribed text
- intent: The user's intent (analyze, remediate, query, etc.)
- parameters: Extracted parameters
- confidence: Confidence score (0-1)"""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=500,
                temperature=0.1
            )
            
            transcription_text = response.get("text", "")
            
            # Parse response
            try:
                if "```json" in transcription_text:
                    json_start = transcription_text.find("```json") + 7
                    json_end = transcription_text.find("```", json_start)
                    json_text = transcription_text[json_start:json_end].strip()
                else:
                    json_start = transcription_text.find("{")
                    json_end = transcription_text.rfind("}") + 1
                    json_text = transcription_text[json_start:json_end] if json_start >= 0 else "{}"
                
                result = json.loads(json_text)
            except:
                result = {
                    "text": transcription_text,
                    "intent": "unknown",
                    "parameters": {},
                    "confidence": 0.5
                }
            
            analysis_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Speech-to-text complete in {analysis_time}ms")
            
            return {
                **result,
                "processing_time_ms": analysis_time,
                "model_used": "amazon.nova-sonic-v1:0",
                "audio_size_bytes": len(audio_data)
            }
            
        except Exception as e:
            logger.error(f"Error in speech-to-text: {e}")
            raise
    
    async def text_to_speech(
        self,
        text: str,
        voice: str = "default"
    ) -> Dict[str, Any]:
        """
        Convert text to speech using Nova 2 Sonic
        
        Args:
            text: Text to convert to speech
            voice: Voice type (default, male, female)
            
        Returns:
            Audio data and metadata
        """
        start_time = time.time()
        
        try:
            logger.info(f"Converting text to speech: {text[:50]}...")
            
            # Note: Nova 2 Sonic text-to-speech would generate audio
            # For now, we'll return metadata as a placeholder
            # In production, this would use the actual TTS API
            
            # This is a placeholder - actual implementation would use Nova 2 Sonic's TTS API
            # For the hackathon, we can simulate this
            
            analysis_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Text-to-speech complete in {analysis_time}ms")
            
            return {
                "text": text,
                "voice": voice,
                "audio_format": "wav",
                "sample_rate": 22050,
                "processing_time_ms": analysis_time,
                "model_used": "amazon.nova-sonic-v1:0",
                "note": "Audio generation would be implemented with Nova 2 Sonic TTS API"
            }
            
        except Exception as e:
            logger.error(f"Error in text-to-speech: {e}")
            raise
    
    async def process_voice_command(
        self,
        command_text: str
    ) -> Dict[str, Any]:
        """
        Process a voice command and determine the action
        
        Args:
            command_text: Transcribed voice command
            
        Returns:
            Command interpretation with action and parameters
        """
        try:
            logger.info(f"Processing voice command: {command_text}")
            
            prompt = f"""You are a voice command processor for Nova Sentinel security platform.
Process the following voice command and determine the user's intent.

Voice Command: "{command_text}"

Available actions:
- analyze: Analyze a security incident
- remediate: Generate or execute remediation
- query: Query incident status
- confirm: Confirm an action
- cancel: Cancel an operation

Return JSON with:
- intent: The detected intent
- action: The action to take
- parameters: Extracted parameters (incident_id, resource, etc.)
- confidence: Confidence score (0-1)
- response_text: Suggested text response to speak back"""
            
            response = await self.bedrock.invoke_nova_lite(
                prompt=prompt,
                max_tokens=500,
                temperature=0.1
            )
            
            command_text_response = response.get("text", "")
            
            # Parse response
            try:
                if "```json" in command_text_response:
                    json_start = command_text_response.find("```json") + 7
                    json_end = command_text_response.find("```", json_start)
                    json_text = command_text_response[json_start:json_end].strip()
                else:
                    json_start = command_text_response.find("{")
                    json_end = command_text_response.rfind("}") + 1
                    json_text = command_text_response[json_start:json_end] if json_start >= 0 else "{}"
                
                result = json.loads(json_text)
            except:
                result = {
                    "intent": "unknown",
                    "action": "query",
                    "parameters": {},
                    "confidence": 0.5,
                    "response_text": "I didn't understand that command. Please try again."
                }
            
            logger.info(f"Voice command processed: {result.get('intent')}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing voice command: {e}")
            raise
