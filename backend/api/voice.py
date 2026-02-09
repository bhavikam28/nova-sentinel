"""
Voice API endpoints
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, Optional

from agents.voice_agent import VoiceAgent
from utils.logger import logger

router = APIRouter(prefix="/api/voice", tags=["voice"])
voice_agent = VoiceAgent()


@router.post("/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    language: str = Form("en-US")
) -> Dict[str, Any]:
    """
    Convert speech to text
    
    Upload an audio file and get transcription
    
    Args:
        file: Audio file (WAV, MP3, etc.)
        language: Language code (default: en-US)
        
    Returns:
        Transcription with text and confidence
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('audio/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an audio file (WAV, MP3, etc.)"
            )
        
        # Read audio data
        audio_data = await file.read()
        
        if len(audio_data) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="Audio file too large (max 10MB)"
            )
        
        logger.info(f"Received speech-to-text request: {file.filename} ({len(audio_data)} bytes)")
        
        # Convert to text
        transcription = await voice_agent.speech_to_text(
            audio_data=audio_data,
            language=language
        )
        
        return transcription
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in speech-to-text: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Speech-to-text failed: {str(e)}"
        )


@router.post("/text-to-speech")
async def text_to_speech(
    text: str = Form(...),
    voice: str = Form("default")
) -> Dict[str, Any]:
    """
    Convert text to speech
    
    Args:
        text: Text to convert to speech
        voice: Voice type (default, male, female)
        
    Returns:
        Audio metadata (audio generation would be implemented with Nova 2 Sonic)
    """
    try:
        logger.info(f"Received text-to-speech request: {text[:50]}...")
        
        # Convert to speech
        result = await voice_agent.text_to_speech(
            text=text,
            voice=voice
        )
        
        return result
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error in text-to-speech: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Text-to-speech failed: {str(e)}"
        )


@router.post("/process-command")
async def process_command(
    command: str = Form(...)
) -> Dict[str, Any]:
    """
    Process a voice command
    
    Args:
        command: Transcribed voice command text
        
    Returns:
        Command interpretation with action and parameters
    """
    try:
        logger.info(f"Received voice command: {command}")
        
        # Process command
        result = await voice_agent.process_voice_command(command)
        
        return result
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error processing voice command: {e}")
        logger.error(f"Traceback: {error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Command processing failed: {str(e)}"
        )


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "voice-api",
        "model": "amazon.nova-sonic-v1:0"
    }
