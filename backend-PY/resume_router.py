"""
Resume Routes
=============
REST API for voice-based resume building

This module provides endpoints for:
1. Transcribing audio responses for resume questions
2. Generating PDF resumes from collected data

Endpoints:
- POST /resume/transcribe - Transcribe audio to text
- POST /resume/generate - Generate PDF resume from JSON data
- GET  /resume/health - Health check
"""

import os
import time
import json
import shutil
import logging
import uuid
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Import ResumeAI
from resumeAI import ResumeAI

logger = logging.getLogger(__name__)

# ===========================
# Router Setup
# ===========================

router = APIRouter(
    prefix="/resume",
    tags=["Resume"]
)

# Global references (will be set by main.py)
whisper_model = None
resume_ai = None
ollama_client = None


def set_models(whisper, ollama=None):
    """
    Set the AI models (called from main.py after initialization)

    Args:
        whisper: Loaded WhisperModel instance
        ollama: Ollama client for validation (optional)
    """
    global whisper_model, resume_ai, ollama_client
    whisper_model = whisper
    ollama_client = ollama
    # Initialize ResumeAI
    resume_ai = ResumeAI(model_name="qwen2.5-coder:7b")
    logger.info("[Resume] AI models configured")


# ===========================
# Request/Response Models
# ===========================

class TranscriptionResult(BaseModel):
    """Response model for transcribe endpoint"""
    transcript: str
    language: Optional[str] = None
    confidence: float = 0.0


class ResumeGenerateRequest(BaseModel):
    """Request model for generating resume"""
    interview_responses: dict


class ValidateResponseRequest(BaseModel):
    """Request model for validating a single response"""
    question: str
    answer: str
    question_id: str


# ===========================
# Endpoints
# ===========================

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Resume API",
        "whisper_loaded": whisper_model is not None,
        "resume_ai_loaded": resume_ai is not None
    }


@router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_audio(
    audio_file: UploadFile = File(...)
):
    """
    Transcribe audio for resume question responses

    **Process:**
    1. Save uploaded audio temporarily
    2. Transcribe with Whisper (bilingual English/Spanish)
    3. Return cleaned transcript

    **Args:**
    - audio_file: Recorded audio response (webm format)

    **Returns:**
    - transcript: Transcribed text
    - language: Detected language (en/es)
    - confidence: Confidence score (0.0-1.0)
    """

    # Validate models are loaded
    if whisper_model is None:
        logger.error("[Resume] Whisper model not initialized!")
        raise HTTPException(
            status_code=503,
            detail="AI models not loaded. Please contact system administrator."
        )

    logger.info("=" * 60)
    logger.info("[Resume] === NEW TRANSCRIPTION REQUEST ===")
    logger.info(f"[Resume] Audio file: {audio_file.filename}")

    temp_audio_path = None

    try:
        # ===========================
        # Step 1: Save Audio File
        # ===========================
        temp_audio_path = f"temp_resume_{uuid.uuid4()}.webm"

        logger.info(f"[Resume] Saving audio to: {temp_audio_path}")
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        file_size = os.path.getsize(temp_audio_path)
        logger.info(f"[Resume] ✓ Audio saved ({file_size} bytes)")

        if file_size == 0:
            logger.error("[Resume] ✗ Audio file is empty!")
            return TranscriptionResult(
                transcript="",
                language="unknown",
                confidence=0.0
            )

        # ===========================
        # Step 2: Transcribe with Whisper
        # ===========================
        logger.info("[Resume] Transcribing with Whisper...")
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

        logger.info(f"[Resume] ✓ Transcription complete ({transcription_time:.2f}s)")
        logger.info(f"[Resume]   Language: {language.upper()} ({language_confidence:.0%})")
        logger.info(f"[Resume]   Transcript: \"{transcript}\"")
        logger.info(f"[Resume]   Length: {len(transcript)} characters")

        if not transcript or len(transcript.strip()) == 0:
            logger.warning("[Resume] ! Empty transcript!")
            return TranscriptionResult(
                transcript="",
                language=language,
                confidence=0.0
            )

        logger.info("[Resume] ✓ Request complete")
        logger.info("=" * 60)

        return TranscriptionResult(
            transcript=transcript,
            language=language,
            confidence=language_confidence
        )

    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"[Resume] ✗ ERROR IN TRANSCRIPTION")
        logger.error(f"[Resume] Error type: {type(e).__name__}")
        logger.error(f"[Resume] Error message: {str(e)}")
        import traceback
        logger.error(f"[Resume] Traceback:")
        for line in traceback.format_exc().split('\n'):
            logger.error(f"[Resume]   {line}")
        logger.error("=" * 60)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temp file
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
                logger.info(f"[Resume] ✓ Temp file removed: {temp_audio_path}")
            except Exception as e:
                logger.warning(f"[Resume] ! Could not remove temp file: {e}")


@router.post("/validate-response")
async def validate_response(request: ValidateResponseRequest):
    """
    Validate and fix a single response using AI

    **Process:**
    1. Receive question and user's answer
    2. Use AI to validate the answer makes sense for the question
    3. Fix formatting, expand abbreviations, correct obvious errors
    4. Return cleaned/validated answer

    **Args:**
    - question: The question that was asked
    - answer: The user's response
    - question_id: The question ID (e.g., Q1, Q2)

    **Returns:**
    - validated_answer: The cleaned and validated answer
    - is_valid: Whether the answer is acceptable
    - suggestion: Any suggestions for improvement
    """
    logger.info(f"[Resume] Validating response for {request.question_id}")
    logger.info(f"[Resume]   Question: {request.question}")
    logger.info(f"[Resume]   Answer: {request.answer}")

    # Check if answer is empty or too short
    if not request.answer or len(request.answer.strip()) < 1:
        return {
            "validated_answer": request.answer,
            "is_valid": False,
            "suggestion": "Please provide an answer to this question."
        }

    # Use Ollama to validate and fix the response
    if ollama_client:
        try:
            # Determine question type and create appropriate validation prompt
            question_id = request.question_id

            # Location questions (Q5, Q7, Q16, Q35)
            if question_id in ['Q5', 'Q7', 'Q16', 'Q35']:
                prompt = f"""Extract and format the location from the user's answer.

Requirements:
- Format as: "City, State" or "City, ST" (e.g., "El Paso, TX" or "El Paso, Texas")
- Verify the location is real (use common US cities/states)
- Use proper capitalization
- If user says "No" or doesn't provide a location, return: No

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY the formatted location (e.g., "Phoenix, AZ"). No explanations."""

            # Skills question (Q30 - technical skills)
            elif question_id == 'Q30':
                prompt = f"""Extract individual skills, tools, equipment, and machinery from the user's answer.

Requirements:
- List skills separated by commas
- Be specific (e.g., "forklift (sit-down)", "MIG welding", "TIG welding")
- Remove filler words and sentences
- Keep technical terminology exact
- If user says "No" or "None", return: No

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY a comma-separated list of skills. Example: "forklift operation, MIG welding, TIG welding, power tools, hand tools"
No explanations or extra text."""

            # Certifications question (Q31)
            elif question_id == 'Q31':
                prompt = f"""Extract certifications and licenses from the user's answer.

Requirements:
- List certifications separated by commas
- Include specific details (e.g., "CDL Class A with Hazmat", not just "CDL")
- Use standard abbreviations (OSHA, CDL, EPA, etc.)
- Remove filler words
- If user says "No" or "None", return: No

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY a comma-separated list of certifications. Example: "CDL Class A, OSHA 30-hour, Forklift certified"
No explanations."""

            # Core competencies question (Q32)
            elif question_id == 'Q32':
                prompt = f"""Extract core competencies and soft skills from the user's answer.

Requirements:
- List competencies separated by commas
- Use professional terminology
- Remove filler words and full sentences
- If user says "No" or "None", return: No

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY a comma-separated list of competencies. Example: "safety compliance, team leadership, problem-solving, attention to detail"
No explanations."""

            # Date questions (Q9, Q10, Q18, Q19, Q37)
            elif question_id in ['Q9', 'Q10', 'Q18', 'Q19', 'Q37']:
                prompt = f"""Extract and format the date from the user's answer.

Requirements:
- Format as: "Month Year" (e.g., "January 2020", "Jan 2020")
- If currently employed/attending, use: "Present"
- Verify date is reasonable (year between 1970-2030)
- If user says "No" or unclear, return: No

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY the formatted date. Examples: "March 2018", "Present", "Jun 2022"
No explanations."""

            # Phone number (Q3)
            elif question_id == 'Q3':
                prompt = f"""Extract and format the phone number from the user's answer.

Requirements:
- Format as: (XXX) XXX-XXXX or XXX-XXX-XXXX
- Remove any text, just the number
- Must be 10 digits
- If invalid, return: INVALID

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY the formatted phone number. Example: "(915) 555-1234"
No explanations."""

            # Email (Q4)
            elif question_id == 'Q4':
                prompt = f"""Extract and validate the email address from the user's answer.

Requirements:
- Must be valid email format (user@domain.com)
- Remove any surrounding text
- Convert to lowercase
- If user says "No" or "None", return: No
- If invalid email, return: INVALID

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY the email address. Example: "john.doe@gmail.com"
No explanations."""

            # Name (Q1)
            elif question_id == 'Q1':
                prompt = f"""Extract the full name from the user's answer.

Requirements:
- Format as: "First Last" or "First Middle Last"
- Proper capitalization
- Remove titles (Mr., Mrs., etc.)
- Remove extra words

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY the formatted name. Example: "John Smith"
No explanations."""

            # Accomplishments (Q11, Q12, Q13, Q14, Q20, Q21, Q22)
            elif question_id in ['Q11', 'Q12', 'Q13', 'Q14', 'Q20', 'Q21', 'Q22']:
                prompt = f"""Extract and format the accomplishment from the user's answer.

Requirements:
- Write as a concise bullet point (1-2 sentences max)
- Start with action verb (Operated, Managed, Improved, Maintained, etc.)
- Include specific numbers/metrics if mentioned
- Remove filler words like "um", "like", "you know"
- If user says "No" or has nothing, return: No

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY the formatted accomplishment. Example: "Operated forklift to move 200+ pallets daily with zero safety incidents"
No explanations."""

            # Default: general cleanup
            else:
                prompt = f"""Extract the relevant information from the user's answer.

Requirements:
- Remove filler words and unnecessary details
- Keep answer concise and professional
- Fix obvious typos and formatting
- If user says "No", "None", or "N/A", return: No
- Proper capitalization

Question: {request.question}
User's Answer: {request.answer}

Respond with ONLY the cleaned answer. No explanations."""

            response = ollama_client.generate(prompt)
            validated_answer = response.strip()

            # Check if AI marked it as invalid
            if validated_answer == "INVALID":
                return {
                    "validated_answer": request.answer,
                    "is_valid": False,
                    "suggestion": "This answer doesn't seem to address the question. Please try again."
                }

            logger.info(f"[Resume]   Validated: {validated_answer}")

            return {
                "validated_answer": validated_answer,
                "is_valid": True,
                "suggestion": ""
            }

        except Exception as e:
            logger.warning(f"[Resume] Validation failed, using original answer: {e}")
            # If AI validation fails, just return the original answer
            return {
                "validated_answer": request.answer,
                "is_valid": True,
                "suggestion": ""
            }
    else:
        # No AI available, do basic validation
        logger.warning("[Resume] No Ollama client available for validation")
        return {
            "validated_answer": request.answer,
            "is_valid": True,
            "suggestion": ""
        }


@router.post("/generate")
async def generate_resume(request: ResumeGenerateRequest):
    """
    Generate PDF resume from interview responses

    **Process:**
    1. Receive JSON data with interview responses
    2. Use ResumeAI to generate LaTeX resume
    3. Compile to PDF
    4. Return PDF file

    **Args:**
    - interview_responses: Dict with resume data (contact, work, skills, education, certifications)

    **Returns:**
    - PDF file (application/pdf)
    """

    # Validate resume_ai is loaded
    if resume_ai is None:
        logger.error("[Resume] ResumeAI not initialized!")
        raise HTTPException(
            status_code=503,
            detail="Resume generator not loaded. Please contact system administrator."
        )

    logger.info("=" * 60)
    logger.info("[Resume] === NEW RESUME GENERATION REQUEST ===")
    logger.info(f"[Resume] Data keys: {list(request.interview_responses.keys())}")

    # Log full JSON response for debugging
    logger.info("")
    logger.info("[Resume] FULL JSON REQUEST:")
    logger.info("-" * 60)
    try:
        pretty_json = json.dumps(request.dict(), indent=2, ensure_ascii=False)
        for line in pretty_json.split('\n'):
            logger.info(f"[Resume]   {line}")
    except Exception as e:
        logger.warning(f"[Resume] Could not pretty-print JSON: {e}")
        logger.info(f"[Resume]   {request.dict()}")
    logger.info("-" * 60)

    # Log individual sections with question counts
    logger.info("")
    logger.info("[Resume] INTERVIEW RESPONSES BREAKDOWN:")
    logger.info("-" * 60)

    ir = request.interview_responses

    # Contact Information
    if 'contact_information' in ir:
        contact = ir['contact_information']
        logger.info(f"[Resume] Contact Information ({len(contact)} fields):")
        for key, value in contact.items():
            logger.info(f"[Resume]   - {key}: {value}")

    # Work Experience - Job 1
    if 'work_experience_job1' in ir:
        job1 = ir['work_experience_job1']
        logger.info(f"[Resume] Work Experience - Job 1 ({len(job1)} fields):")
        for key, value in job1.items():
            logger.info(f"[Resume]   - {key}: {value}")

    # Work Experience - Job 2
    if 'work_experience_job2' in ir:
        job2 = ir['work_experience_job2']
        logger.info(f"[Resume] Work Experience - Job 2 ({len(job2)} fields):")
        for key, value in job2.items():
            logger.info(f"[Resume]   - {key}: {value}")

    # Skills
    if 'skills' in ir:
        skills = ir['skills']
        logger.info(f"[Resume] Skills ({len(skills)} fields):")
        for key, value in skills.items():
            logger.info(f"[Resume]   - {key}: {value}")

    # Education
    if 'education' in ir:
        education = ir['education']
        logger.info(f"[Resume] Education ({len(education)} fields):")
        for key, value in education.items():
            logger.info(f"[Resume]   - {key}: {value}")

    # Certifications
    if 'certifications_detailed' in ir:
        certs = ir['certifications_detailed']
        logger.info(f"[Resume] Certifications ({len(certs)} fields):")
        for key, value in certs.items():
            logger.info(f"[Resume]   - {key}: {value}")

    logger.info("-" * 60)
    logger.info("")

    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"resume_{timestamp}"

        logger.info(f"[Resume] Generating resume: {output_filename}")

        # Generate resume PDF
        result = resume_ai.generate_resume(
            json_data=request.dict(),
            output_filename=output_filename,
            enhance=True,  # Use AI to enhance accomplishments
            compile_pdf=True,  # Compile to PDF
            keep_tex=False  # Don't keep .tex file
        )

        if not result or 'pdf' not in result:
            logger.error("[Resume] ✗ Failed to generate PDF")
            raise HTTPException(status_code=500, detail="Failed to generate resume PDF")

        pdf_path = result['pdf']
        logger.info(f"[Resume] ✓ Resume generated: {pdf_path}")

        # Check if file exists
        if not os.path.exists(pdf_path):
            logger.error(f"[Resume] ✗ PDF file not found: {pdf_path}")
            raise HTTPException(status_code=500, detail="PDF file not found after generation")

        file_size = os.path.getsize(pdf_path)
        logger.info(f"[Resume] ✓ PDF file size: {file_size} bytes")
        logger.info("[Resume] ✓ Request complete")
        logger.info("=" * 60)

        # Return PDF file
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename="resume.pdf",
            headers={
                "Content-Disposition": "attachment; filename=resume.pdf"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"[Resume] ✗ ERROR IN GENERATION")
        logger.error(f"[Resume] Error type: {type(e).__name__}")
        logger.error(f"[Resume] Error message: {str(e)}")
        import traceback
        logger.error(f"[Resume] Traceback:")
        for line in traceback.format_exc().split('\n'):
            logger.error(f"[Resume]   {line}")
        logger.error("=" * 60)
        raise HTTPException(status_code=500, detail=str(e))
