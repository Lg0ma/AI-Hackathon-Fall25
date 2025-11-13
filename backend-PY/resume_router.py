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


@router.post("/test-validation")
async def test_resume_validation():
    """
    Test endpoint to validate resume data cleaning and formatting

    Loads test_resume_data.json and shows before/after validation

    **Returns:**
    - original_data: Raw test data
    - cleaned_data: Data after validation and formatting
    - validation_report: Summary of what was cleaned
    """
    import json
    import os

    logger.info("=" * 60)
    logger.info("[Resume Test] TEST VALIDATION ENDPOINT")
    logger.info("=" * 60)

    # Validate resume_ai is loaded
    if resume_ai is None:
        logger.error("[Resume Test] ResumeAI not initialized!")
        raise HTTPException(
            status_code=503,
            detail="Resume generator not loaded."
        )

    try:
        # Load test data
        test_file_path = os.path.join(os.path.dirname(__file__), "test_resume_data.json")

        if not os.path.exists(test_file_path):
            raise HTTPException(
                status_code=404,
                detail="Test data file not found. Please ensure test_resume_data.json exists."
            )

        with open(test_file_path, 'r', encoding='utf-8') as f:
            original_data = json.load(f)

        logger.info("[Resume Test] Loaded test data")
        logger.info("[Resume Test] Original data preview:")
        logger.info(f"[Resume Test]   Job Title (Q2): {original_data['interview_responses']['contact_information'].get('Q2_job_title')}")
        logger.info(f"[Resume Test]   Email: {original_data['interview_responses']['contact_information'].get('Q4_email')}")
        logger.info(f"[Resume Test]   Job 1 Title (Q8): {original_data['interview_responses']['work_experience_job1'].get('Q8_title')}")
        logger.info(f"[Resume Test]   Job 2 Company: {original_data['interview_responses']['work_experience_job2'].get('Q15_company')}")
        logger.info(f"[Resume Test]   Skills (Q30): {original_data['interview_responses']['skills'].get('Q30_technical_skills')[:100]}...")

        # Apply validation and cleaning
        logger.info("[Resume Test] Applying validation and cleaning...")
        cleaned_data = resume_ai.validate_and_clean_all_responses(original_data)

        # Normalize to see final structure
        logger.info("[Resume Test] Normalizing data...")
        normalized_data = resume_ai.normalize_interview_data(cleaned_data)

        logger.info("[Resume Test] Validation complete!")
        logger.info("[Resume Test] Cleaned data preview:")
        logger.info(f"[Resume Test]   Job Title: {normalized_data['contact_info'].get('job_title')}")
        logger.info(f"[Resume Test]   Email: {normalized_data['contact_info'].get('email')}")
        logger.info(f"[Resume Test]   Number of jobs: {len(normalized_data['work_experience'])}")
        if normalized_data['work_experience']:
            logger.info(f"[Resume Test]   Job 1 Title: {normalized_data['work_experience'][0].get('title')}")
            logger.info(f"[Resume Test]   Job 1 Company: {normalized_data['work_experience'][0].get('company')}")
            logger.info(f"[Resume Test]   Job 1 Accomplishments: {len(normalized_data['work_experience'][0].get('accomplishments', []))}")
        logger.info(f"[Resume Test]   Technical Skills: {normalized_data['skills']['technical_skills'][:5]}")
        logger.info("=" * 60)

        # Create validation report
        validation_report = {
            "contact_info": {
                "job_title_original": original_data['interview_responses']['contact_information'].get('Q2_job_title'),
                "job_title_cleaned": normalized_data['contact_info'].get('job_title'),
                "email_original": original_data['interview_responses']['contact_information'].get('Q4_email'),
                "email_cleaned": normalized_data['contact_info'].get('email'),
                "location_original": original_data['interview_responses']['contact_information'].get('Q5_location'),
                "location_cleaned": normalized_data['contact_info'].get('location')
            },
            "work_experience": {
                "job1_title_original": original_data['interview_responses']['work_experience_job1'].get('Q8_title'),
                "job1_title_cleaned": normalized_data['work_experience'][0].get('title') if normalized_data['work_experience'] else None,
                "job1_location_original": original_data['interview_responses']['work_experience_job1'].get('Q7_location'),
                "job1_location_cleaned": normalized_data['work_experience'][0].get('location') if normalized_data['work_experience'] else None,
                "job2_company_original": original_data['interview_responses']['work_experience_job2'].get('Q15_company'),
                "job2_filtered_out": len(normalized_data['work_experience']) == 1,
                "total_jobs_in_resume": len(normalized_data['work_experience'])
            },
            "skills": {
                "technical_skills_original": original_data['interview_responses']['skills'].get('Q30_technical_skills'),
                "technical_skills_cleaned": ", ".join(normalized_data['skills']['technical_skills'][:5]) + "..." if len(normalized_data['skills']['technical_skills']) > 5 else ", ".join(normalized_data['skills']['technical_skills']),
                "certifications_original": original_data['interview_responses']['skills'].get('Q31_certifications_licenses'),
                "certifications_cleaned": ", ".join(normalized_data['skills']['certifications_licenses']),
                "competencies_original": original_data['interview_responses']['skills'].get('Q32_core_competencies')[:100] + "...",
                "competencies_cleaned": ", ".join(normalized_data['skills']['core_competencies'][:5]) + "..." if len(normalized_data['skills']['core_competencies']) > 5 else ", ".join(normalized_data['skills']['core_competencies'])
            },
            "summary": {
                "validation_applied": True,
                "empty_job_filtered": len(normalized_data['work_experience']) < 2,
                "skills_extracted_as_list": isinstance(normalized_data['skills']['technical_skills'], list),
                "job_title_formatted": normalized_data['work_experience'][0].get('title') != original_data['interview_responses']['work_experience_job1'].get('Q8_title') if normalized_data['work_experience'] else False
            }
        }

        return {
            "message": "Validation test completed successfully",
            "validation_report": validation_report,
            "normalized_data": normalized_data,
            "test_passed": validation_report['summary']['empty_job_filtered'] and validation_report['summary']['skills_extracted_as_list']
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"[Resume Test] ERROR IN TEST VALIDATION")
        logger.error(f"[Resume Test] Error type: {type(e).__name__}")
        logger.error(f"[Resume Test] Error message: {str(e)}")
        import traceback
        logger.error(f"[Resume Test] Traceback:")
        for line in traceback.format_exc().split('\n'):
            logger.error(f"[Resume Test]   {line}")
        logger.error("=" * 60)
        raise HTTPException(status_code=500, detail=str(e))


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

            # Job title questions (Q2, Q8, Q17, Q25)
            elif question_id in ['Q2', 'Q8', 'Q17', 'Q25']:
                prompt = f"""Extract ONLY the job title or specialty from the user's answer.

Requirements:
- Return ONLY the job title/specialty (e.g., "Welder", "Forklift Operator", "Construction Manager")
- Remove full sentences like "I work as a..." or "My job is..."
- Remove company names and locations
- Remove phrases like "at", "with", "for"
- Keep it short (2-4 words maximum)
- If user says "No" or unclear, return: No

Question: {request.question}
User's Answer: {request.answer}

Examples:
- "I work as a welder at ABC Company" → "Welder"
- "I'm a forklift operator" → "Forklift Operator"
- "Construction manager with 10 years experience" → "Construction Manager"

Respond with ONLY the job title. No explanations."""

            # Skills question (Q30 - technical skills)
            elif question_id == 'Q30':
                prompt = f"""Extract individual skills, tools, equipment, and machinery from the user's answer.

Requirements:
- Return ONLY a comma-separated list of skills
- Each skill should be 1-4 words (not full sentences)
- Be specific (e.g., "forklift operation", "MIG welding", "TIG welding")
- Remove filler words like "I know", "I can", "I have experience with"
- Remove full sentences or explanations
- Keep technical terminology exact
- If user says "No" or "None", return: No

Question: {request.question}
User's Answer: {request.answer}

Examples:
- "I know how to operate forklifts and I can do MIG welding" → "forklift operation, MIG welding"
- "I have experience with power tools, hand tools, and electrical work" → "power tools, hand tools, electrical work"

Respond with ONLY a comma-separated list of skills. No explanations or extra text."""

            # Certifications question (Q31)
            elif question_id == 'Q31':
                prompt = f"""Extract certifications and licenses from the user's answer.

Requirements:
- Return ONLY a comma-separated list of certifications
- Each certification should be 2-5 words (not full sentences)
- Include specific details (e.g., "CDL Class A with Hazmat", not just "CDL")
- Use standard abbreviations (OSHA, CDL, EPA, etc.)
- Remove filler words like "I have", "I got", "I'm certified in"
- Remove full sentences or explanations
- If user says "No" or "None", return: No

Question: {request.question}
User's Answer: {request.answer}

Examples:
- "I have my CDL Class A and OSHA 30-hour certification" → "CDL Class A, OSHA 30-hour"
- "I'm forklift certified and I have a welding certification" → "Forklift certified, Welding certification"

Respond with ONLY a comma-separated list of certifications. No explanations."""

            # Core competencies question (Q32)
            elif question_id == 'Q32':
                prompt = f"""Extract core competencies and soft skills from the user's answer.

Requirements:
- Return ONLY a comma-separated list of competencies
- Each competency should be 2-4 words (not full sentences)
- Use professional terminology
- Remove filler words like "I am", "I can", "I'm good at"
- Remove full sentences or explanations
- If user says "No" or "None", return: No

Question: {request.question}
User's Answer: {request.answer}

Examples:
- "I'm good at working with teams and I pay attention to details" → "team collaboration, attention to detail"
- "I can solve problems and I'm a leader" → "problem-solving, leadership"

Respond with ONLY a comma-separated list of competencies. No explanations."""

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
