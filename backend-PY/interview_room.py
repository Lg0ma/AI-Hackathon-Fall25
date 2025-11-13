"""
AI Interview Room Routes
========================
REST API for voice-based interview Q&A with keyword-based grading

This module provides a simple interview system where:
1. Frontend sends questions with expected keywords
2. User records audio responses
3. Backend transcribes with Whisper
4. Backend cleans transcript with Ollama
5. Backend analyzes keywords and provides feedback
6. Frontend displays results with pass/fail grading

Endpoints:
- POST /interview-room/transcribe-and-analyze - Main endpoint for processing answers
- GET  /interview-room/health - Health check
"""

import os
import time
import json
import shutil
import logging
import uuid
from typing import List, Dict, Optional
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel

# Import shared Whisper model and Ollama client from main.py
# These will be injected when router is included
logger = logging.getLogger(__name__)

# ===========================
# Router Setup
# ===========================

router = APIRouter(
    prefix="/interview-room",
    tags=["Interview Room"]
)

# Global references (will be set by main.py)
whisper_model = None
ollama_client = None


def set_models(whisper, ollama):
    """
    Set the AI models (called from main.py after initialization)
    
    Args:
        whisper: Loaded WhisperModel instance
        ollama: OllamaClient instance
    """
    global whisper_model, ollama_client
    whisper_model = whisper
    ollama_client = ollama
    logger.info("[Interview Room] AI models configured")


# ===========================
# Request/Response Models
# ===========================

class AnalysisResult(BaseModel):
    """Response model for transcribe-and-analyze endpoint"""
    transcript: str
    is_correct: bool
    feedback: str
    detected_keywords: List[str]
    missing_keywords: List[str]
    confidence: float = 0.5
    language: Optional[str] = None


# ===========================
# Endpoints
# ===========================

@router.post("/transcribe-and-analyze", response_model=AnalysisResult)
async def transcribe_and_analyze(
    audio_file: UploadFile = File(...),
    question: str = Form(None),
    expected_keywords: str = Form(None)
):
    """
    Transcribe audio and analyze if the response correctly answers the question
    
    **Process:**
    1. Save uploaded audio temporarily
    2. Transcribe with Whisper (bilingual English/Spanish)
    3. Clean transcript with Ollama Mistral
    4. Analyze response for keywords using Ollama
    5. Return structured feedback
    
    **Args:**
    - audio_file: Recorded audio response (webm format)
    - question: The interview question being answered
    - expected_keywords: Comma-separated list of keywords to detect
    
    **Returns:**
    - transcript: Cleaned transcribed text
    - is_correct: Boolean (true if >= 40% keywords detected)
    - feedback: AI-generated encouragement/suggestions
    - detected_keywords: Keywords found in response
    - missing_keywords: Keywords not mentioned
    - confidence: AI confidence score (0.0-1.0)
    - language: Detected language (en/es)
    """
    
    # Validate models are loaded
    if whisper_model is None or ollama_client is None:
        logger.error("[Interview Room] AI models not initialized!")
        raise HTTPException(
            status_code=503,
            detail="AI models not loaded. Please contact system administrator."
        )
    
    logger.info("=" * 60)
    logger.info("[Interview Room] === NEW REQUEST ===")
    logger.info(f"[Interview Room] Question: {question}")
    logger.info(f"[Interview Room] Expected keywords: {expected_keywords}")
    logger.info(f"[Interview Room] Audio file: {audio_file.filename}")
    
    temp_audio_path = None
    
    try:
        # ===========================
        # Step 1: Save Audio File
        # ===========================
        temp_audio_path = f"temp_interview_room_{uuid.uuid4()}.webm"
        
        logger.info(f"[Interview Room] Saving audio to: {temp_audio_path}")
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        
        file_size = os.path.getsize(temp_audio_path)
        logger.info(f"[Interview Room] ✓ Audio saved ({file_size} bytes)")
        
        if file_size == 0:
            logger.error("[Interview Room] X - Audio file is empty!")
            return AnalysisResult(
                transcript="",
                is_correct=False,
                feedback="No audio detected. Please try recording again.",
                detected_keywords=[],
                missing_keywords=expected_keywords.split(",") if expected_keywords else []
            )
        
        # ===========================
        # Step 2: Transcribe with Whisper
        # ===========================
        logger.info("[Interview Room] Step 1: Transcribing with Whisper...")
        start_time = time.time()
        
        segments, info = whisper_model.transcribe(
            temp_audio_path,
            beam_size=5,
            task="transcribe",
            language=None  # Auto-detect English/Spanish
        )
        
        transcript = " ".join([s.text for s in segments]).strip()
        transcription_time = time.time() - start_time
        
        language = info.language if hasattr(info, 'language') else "unknown"
        language_confidence = info.language_probability if hasattr(info, 'language_probability') else 0.0
        
        logger.info(f"[Interview Room] ✓ Transcription complete ({transcription_time:.2f}s)")
        logger.info(f"[Interview Room]   Language: {language.upper()} ({language_confidence:.0%})")
        logger.info(f"[Interview Room]   Transcript: \"{transcript}\"")
        logger.info(f"[Interview Room]   Length: {len(transcript)} characters")
        
        if not transcript or len(transcript.strip()) == 0:
            logger.warning("[Interview Room] !Empty transcript!")
            return AnalysisResult(
                transcript="",
                is_correct=False,
                feedback="No speech detected. Please speak louder and clearer.",
                detected_keywords=[],
                missing_keywords=expected_keywords.split(",") if expected_keywords else [],
                language=language
            )
        
        # ===========================
        # Step 3: Clean Transcript with Ollama
        # ===========================
        logger.info("[Interview Room] Step 2: Cleaning transcript with Mistral...")
        start_time = time.time()
        
        cleaned_transcript = ollama_client.cleanup_transcription(transcript)
        cleanup_time = time.time() - start_time
        
        logger.info(f"[Interview Room] ✓ Cleanup complete ({cleanup_time:.2f}s)")
        if cleaned_transcript != transcript:
            logger.info("[Interview Room]   Changes made: YES")
            logger.info(f"[Interview Room]   Original:  \"{transcript}\"")
            logger.info(f"[Interview Room]   Cleaned:   \"{cleaned_transcript}\"")
        else:
            logger.info("[Interview Room]   No cleanup needed")
        
        # ===========================
        # Step 4: Analyze Response with Ollama
        # ===========================
        logger.info("[Interview Room] Step 3: Analyzing response with Mistral...")
        start_time = time.time()
        
        # Parse expected keywords
        keywords_list = []
        if expected_keywords:
            keywords_list = [k.strip() for k in expected_keywords.split(",") if k.strip()]
        
        logger.info(f"[Interview Room]   Expected keywords: {keywords_list}")
        
        # Create AI prompt for analysis
        system_prompt = """You are an expert interview evaluator for blue-collar and construction jobs.

Your task is to analyze if the candidate's spoken response adequately answers the interview question.

EVALUATION CRITERIA:
1. **Keyword Matching**: Does the response mention the expected keywords or closely related terms?
2. **Relevance**: Does the response actually answer the question asked?
3. **Substance**: Does the response contain meaningful information (not just "yes" or "no")?
4. **Experience Indicators**: Does the response show actual experience (e.g., "I've done...", "I worked with...", "I know how to...")?

KEYWORD DETECTION RULES:
- Match keywords flexibly (e.g., "drill" matches "drills", "drilling", "power drill")
- Accept synonyms and related terms (e.g., "saw" matches "circular saw", "cutting")
- Accept Spanish equivalents for bilingual candidates
- A response is "correct" if it mentions at least 40% of expected keywords AND provides relevant information

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
    "is_correct": true or false,
    "feedback": "Brief, encouraging feedback (2-3 sentences)",
    "detected_keywords": ["keyword1", "keyword2"],
    "missing_keywords": ["keyword3", "keyword4"],
    "confidence": 0.0 to 1.0
}

Be encouraging but honest. Focus on what they DID mention, not just what's missing."""

        user_prompt = f"""Question: "{question if question else 'General experience question'}"

Expected Keywords: {', '.join(keywords_list) if keywords_list else 'None specified'}

Candidate's Response: "{cleaned_transcript}"

Analyze this response and return JSON evaluation following the exact format specified."""

        analysis_response = ollama_client.generate(user_prompt, system=system_prompt)
        analysis_time = time.time() - start_time
        
        logger.info(f"[Interview Room] ✓ Analysis complete ({analysis_time:.2f}s)")
        logger.info(f"[Interview Room]   Raw response length: {len(analysis_response)} chars")
        
        # ===========================
        # Step 5: Parse AI Response
        # ===========================
        logger.info("[Interview Room] Step 4: Parsing JSON response...")
        
        try:
            # Try to extract JSON from response (handle markdown code blocks)
            json_start = analysis_response.find('{')
            json_end = analysis_response.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = analysis_response[json_start:json_end]
                analysis_data = json.loads(json_str)
                
                logger.info("[Interview Room] ✓ JSON parsed successfully")
                logger.info(f"[Interview Room]   is_correct: {analysis_data.get('is_correct')}")
                logger.info(f"[Interview Room]   detected_keywords: {analysis_data.get('detected_keywords', [])}")
                logger.info(f"[Interview Room]   missing_keywords: {analysis_data.get('missing_keywords', [])}")
            else:
                raise ValueError("No JSON object found in response")
            
            # Return structured response
            result = AnalysisResult(
                transcript=cleaned_transcript,
                is_correct=analysis_data.get("is_correct", False),
                feedback=analysis_data.get("feedback", "Response received and analyzed."),
                detected_keywords=analysis_data.get("detected_keywords", []),
                missing_keywords=analysis_data.get("missing_keywords", []),
                confidence=analysis_data.get("confidence", 0.5),
                language=language
            )
            
            logger.info("[Interview Room] === RESULT ===")
            logger.info(f"[Interview Room] ✓ Transcript: \"{result.transcript[:100]}...\"")
            logger.info(f"[Interview Room] ✓ Correct: {result.is_correct}")
            logger.info(f"[Interview Room] ✓ Detected: {len(result.detected_keywords)} keywords")
            logger.info(f"[Interview Room] ✓ Missing: {len(result.missing_keywords)} keywords")
            logger.info("[Interview Room] === END ===")
            logger.info("=" * 60)
            
            return result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"[Interview Room] X JSON parse error: {e}")
            logger.error(f"[Interview Room]    Response preview: {analysis_response[:200]}...")
            
            # ===========================
            # Fallback: Simple Keyword Matching
            # ===========================
            logger.info("[Interview Room] Using fallback keyword matching...")
            
            detected = []
            missing = []
            
            if keywords_list:
                transcript_lower = cleaned_transcript.lower()
                
                for keyword in keywords_list:
                    keyword_lower = keyword.lower()
                    # Flexible matching: check if keyword or its stem appears
                    if (keyword_lower in transcript_lower or 
                        any(word.startswith(keyword_lower[:4]) for word in transcript_lower.split() if len(keyword_lower) >= 4)):
                        detected.append(keyword)
                    else:
                        missing.append(keyword)
                
                detection_rate = len(detected) / len(keywords_list) if keywords_list else 0
                is_correct = detection_rate >= 0.4  # 40% threshold
                
                logger.info("[Interview Room] Fallback results:")
                logger.info(f"[Interview Room]   Detected: {detected}")
                logger.info(f"[Interview Room]   Missing: {missing}")
                logger.info(f"[Interview Room]   Rate: {detection_rate:.0%}")
                logger.info(f"[Interview Room]   Correct: {is_correct}")
                
                feedback = f"You mentioned {len(detected)} out of {len(keywords_list)} key topics. "
                if is_correct:
                    feedback += "Good response! Try to include more specific details next time."
                else:
                    feedback += f"Try to mention: {', '.join(missing[:3])}."
            else:
                # No keywords provided, just check response length
                is_correct = len(cleaned_transcript.split()) >= 10  # At least 10 words
                detected = []
                missing = []
                feedback = "Response received. " + (
                    "Good detail provided!" if is_correct else 
                    "Please provide more details in your answer."
                )
            
            return AnalysisResult(
                transcript=cleaned_transcript,
                is_correct=is_correct,
                feedback=feedback,
                detected_keywords=detected,
                missing_keywords=missing,
                confidence=0.6,
                language=language
            )
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error("[Interview Room] X CRITICAL ERROR")
        logger.error("=" * 60)
        logger.error(f"[Interview Room]    Type: {type(e).__name__}")
        logger.error(f"[Interview Room]    Message: {str(e)}")
        import traceback
        logger.error("[Interview Room]    Traceback:")
        for line in traceback.format_exc().split('\n'):
            logger.error(f"[Interview Room]      {line}")
        logger.error("=" * 60)
        
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing response: {str(e)}"
        )
        
    finally:
        # Clean up temp file
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
                logger.info(f"[Interview Room] 🧹 Cleaned up: {temp_audio_path}")
            except Exception as cleanup_error:
                logger.warning(f"[Interview Room] ⚠️ Cleanup failed: {cleanup_error}")


@router.get("/health")
async def health_check():
    """
    Health check endpoint for Interview Room module
    
    Returns status of Whisper and Ollama models
    """
    return {
        "status": "healthy" if (whisper_model and ollama_client) else "degraded",
        "whisper_loaded": whisper_model is not None,
        "ollama_loaded": ollama_client is not None,
        "module": "Interview Room",
        "timestamp": datetime.now().isoformat()
    }


# ===========================
# Startup Message
# ===========================

logger.info("✅ Interview Room routes loaded")
logger.info("   Endpoints:")
logger.info("   - POST /interview-room/transcribe-and-analyze")
logger.info("   - GET  /interview-room/health")