"""
AI Routes - FastAPI endpoints for AI workflows
Includes routes for:
1. Rating Agent - Candidate evaluation using Mistral AI
2. Skill Interview - Job skill extraction and detection
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import List, Dict, Optional, Any
import json

# Import AI workflow modules
from rating_agent import evaluate_worker
from skill_interview import (
    OllamaClient,
    SkillAnalyzer,
    extract_json_from_response
)

# Create router
router = APIRouter(prefix="/ai", tags=["AI Workflows"])

# ============================================================================
# MODELS / SCHEMAS
# ============================================================================

class CandidateEvaluationRequest(BaseModel):
    job_description: str
    candidate_info: str

class CandidateEvaluationResponse(BaseModel):
    # Experience
    has_done_this_work_before: bool
    months_experience: int
    skill_level: str

    # Equipment
    equipment_used: List[str]
    equipment_match_score: int

    # Abilities
    can_do_physical_work: bool
    has_transportation: bool
    can_work_schedule: bool

    # Work history
    time_at_last_job_months: Optional[int]
    work_history_score: int

    # Overall
    overall_score: int
    ready_to_work: bool
    what_they_can_do: List[str]
    what_they_cant_do: List[str]
    recommendation: str
    reason: str

class JobDescriptionRequest(BaseModel):
    job_description: str

class SkillExtractionResponse(BaseModel):
    skills: List[Dict[str, str]]  # [{"skill": "...", "category": "..."}]
    total_skills: int

class QuestionGenerationRequest(BaseModel):
    skills: List[Any]  # Accept both strings and dicts
    max_questions: Optional[int] = 8  # Maximum number of questions (default 8 for 5-min interview)

    @validator('skills', pre=True)
    def normalize_skills(cls, v):
        """
        Normalize skills to always be List[Dict[str, str]]
        Accepts both formats:
        - ["Carpentry", "Welding"] -> [{"skill": "Carpentry", "category": "General"}, ...]
        - [{"skill": "Carpentry", "category": "Trade Skill"}] -> unchanged
        """
        if not v:
            return v

        normalized = []
        for item in v:
            if isinstance(item, str):
                # Convert string to dict format
                normalized.append({"skill": item, "category": "General"})
            elif isinstance(item, dict):
                # Already in dict format, but ensure it has required fields
                if "skill" not in item:
                    raise ValueError(f"Skill object missing 'skill' field: {item}")
                if "category" not in item:
                    item["category"] = "General"
                normalized.append(item)
            else:
                raise ValueError(f"Invalid skill format: {item}. Must be string or dict.")

        return normalized

class QuestionGenerationResponse(BaseModel):
    questions: List[str]
    total_questions: int

class SkillDetectionRequest(BaseModel):
    skills: List[Any]  # Accept both strings and dicts
    transcribed_text: str
    timestamp: Optional[str] = None

    @validator('skills', pre=True)
    def normalize_skills(cls, v):
        """
        Normalize skills to always be List[Dict[str, str]]
        Accepts both formats:
        - ["Carpentry", "Welding"] -> [{"skill": "Carpentry", "category": "General"}, ...]
        - [{"skill": "Carpentry", "category": "Trade Skill"}] -> unchanged
        """
        if not v:
            return v

        normalized = []
        for item in v:
            if isinstance(item, str):
                # Convert string to dict format
                normalized.append({"skill": item, "category": "General"})
            elif isinstance(item, dict):
                # Already in dict format, but ensure it has required fields
                if "skill" not in item:
                    raise ValueError(f"Skill object missing 'skill' field: {item}")
                if "category" not in item:
                    item["category"] = "General"
                normalized.append(item)
            else:
                raise ValueError(f"Invalid skill format: {item}. Must be string or dict.")

        return normalized

class SkillDetectionResponse(BaseModel):
    detected_skills: List[str]
    total_detected: int

# ============================================================================
# RATING AGENT ROUTES
# ============================================================================

@router.post("/evaluate-candidate", response_model=CandidateEvaluationResponse)
async def evaluate_candidate(request: CandidateEvaluationRequest):
    """
    Evaluate a job candidate using AI

    Takes a job description and candidate information, returns a structured evaluation
    with recommendations, scores, skills analysis, and more.

    **Example Request:**
    ```json
    {
      "job_description": "Construction worker needed. Must have 2+ years experience...",
      "candidate_info": "I have 3 years as a carpenter. I can use power tools, read blueprints..."
    }
    ```

    **Returns:**
    - Recommendation (YES/MAYBE/NO)
    - Overall score (0-100)
    - Experience level
    - Equipment match score
    - Skills they can/can't do
    - And more...
    """
    print(f"\n[AI Routes] === Candidate Evaluation Request ===")
    print(f"[AI Routes] Job description length: {len(request.job_description)} chars")
    print(f"[AI Routes] Candidate info length: {len(request.candidate_info)} chars")

    try:
        # Call the rating agent
        evaluation = evaluate_worker(
            job_description=request.job_description,
            candidate_info=request.candidate_info
        )

        if not evaluation:
            raise HTTPException(
                status_code=500,
                detail="AI evaluation failed. Check if Ollama is running."
            )

        print(f"[AI Routes] Evaluation complete")
        print(f"[AI Routes] Recommendation: {evaluation.recommendation}")
        print(f"[AI Routes] Score: {evaluation.overall_score}/100")

        # Convert Pydantic model to dict for response
        response_data = {
            "has_done_this_work_before": evaluation.has_done_this_work_before,
            "months_experience": evaluation.months_experience,
            "skill_level": evaluation.skill_level,
            "equipment_used": evaluation.equipment_used,
            "equipment_match_score": evaluation.equipment_match_score,
            "can_do_physical_work": evaluation.can_do_physical_work,
            "has_transportation": evaluation.has_transportation,
            "can_work_schedule": evaluation.can_work_schedule,
            "time_at_last_job_months": evaluation.time_at_last_job_months,
            "work_history_score": evaluation.work_history_score,
            "overall_score": evaluation.overall_score,
            "ready_to_work": evaluation.ready_to_work,
            "what_they_can_do": evaluation.what_they_can_do,
            "what_they_cant_do": evaluation.what_they_cant_do,
            "recommendation": evaluation.recommendation,
            "reason": evaluation.reason
        }

        return response_data

    except Exception as e:
        print(f"[AI Routes] ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error evaluating candidate: {str(e)}"
        )

# ============================================================================
# SKILL INTERVIEW ROUTES
# ============================================================================

# Initialize Ollama client (shared across skill interview routes)
ollama_client = OllamaClient(model="mistral:7b")

@router.get("/health-check")
async def health_check():
    """
    Check if Ollama AI service is running and accessible

    **Returns:**
    - `connected`: boolean indicating if Ollama is accessible
    - `model`: the AI model being used
    """
    print(f"\n[AI Routes] Health check requested")

    is_connected = ollama_client.check_connection()

    print(f"[AI Routes] Ollama status: {'Connected' if is_connected else 'Not connected'}")

    return {
        "connected": is_connected,
        "model": ollama_client.model,
        "message": "Ollama is running" if is_connected else "Ollama is not accessible"
    }

@router.post("/extract-skills", response_model=SkillExtractionResponse)
async def extract_skills(request: JobDescriptionRequest):
    """
    Extract required skills from a job description using AI

    Analyzes the job description and extracts all mentioned skills plus
    commonly expected skills for that type of role.

    **Example Request:**
    ```json
    {
      "job_description": "Construction worker needed. Must know carpentry, use power tools..."
    }
    ```

    **Returns:**
    - List of skills with categories
    - Total skill count

    **Categories:**
    - Trade Skill (Carpentry, Welding, etc.)
    - Equipment Operation (Forklift, Power Tools, etc.)
    - Safety & Certification (OSHA, First Aid, etc.)
    - Technical Skill (Blueprint Reading, etc.)
    - Physical Ability (Heavy Lifting, etc.)
    - Soft Skill (Communication, Teamwork, etc.)
    - License/Credential (Driver's License, etc.)
    - Language (English, Spanish, etc.)
    """
    print(f"\n[AI Routes] === Skill Extraction Request ===")
    print(f"[AI Routes] Job description: {request.job_description[:100]}...")

    try:
        # Create skill analyzer
        analyzer = SkillAnalyzer(ollama_client)

        # Extract skills
        skills = analyzer.analyze_job_description(request.job_description)

        if not skills:
            raise HTTPException(
                status_code=500,
                detail="Could not extract skills from job description"
            )

        print(f"[AI Routes] Extracted {len(skills)} skills")

        return {
            "skills": skills,
            "total_skills": len(skills)
        }

    except Exception as e:
        print(f"[AI Routes] ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error extracting skills: {str(e)}"
        )

@router.post("/generate-questions", response_model=QuestionGenerationResponse)
async def generate_questions(request: QuestionGenerationRequest):
    """
    Generate interview questions for a list of skills

    Creates natural, conversational interview questions tailored for
    blue-collar/construction workers. One question per skill.

    **Accepts two skill formats:**

    Format 1 - Array of strings (simplified):
    ```json
    {
      "skills": ["Carpentry", "Forklift Operation", "Welding"],
      "max_questions": 8
    }
    ```

    Format 2 - Array of objects (with categories):
    ```json
    {
      "skills": [
        {"skill": "Carpentry", "category": "Trade Skill"},
        {"skill": "Forklift Operation", "category": "Equipment Operation"}
      ],
      "max_questions": 8
    }
    ```

    **Returns:**
    - List of interview questions (max 8)
    - Total question count

    **Note:** Questions are limited to 8 max for a 5-minute interview session
    """
    print(f"\n[AI Routes] === Question Generation Request ===")
    print(f"[AI Routes] Skills count: {len(request.skills)}")
    print(f"[AI Routes] Skills after normalization:")
    for i, skill in enumerate(request.skills[:3], 1):  # Show first 3
        print(f"[AI Routes]   {i}. {skill}")
    if len(request.skills) > 3:
        print(f"[AI Routes]   ... and {len(request.skills) - 3} more")

    try:
        # Validate skills structure (should already be normalized by Pydantic validator)
        if not request.skills:
            print(f"[AI Routes] ERROR: No skills provided")
            raise HTTPException(
                status_code=400,
                detail="No skills provided. Please provide at least one skill."
            )

        print(f"[AI Routes] All skills normalized and validated")

        # Limit skills to max_questions if we have more skills than max questions
        max_q = request.max_questions or 8
        skills_to_use = request.skills[:max_q] if len(request.skills) > max_q else request.skills

        if len(request.skills) > max_q:
            print(f"[AI Routes] Limiting from {len(request.skills)} skills to {max_q} (max_questions limit)")

        # Create skill analyzer and set skills
        analyzer = SkillAnalyzer(ollama_client)
        analyzer.skills = skills_to_use

        # Initialize skill status
        for skill_item in skills_to_use:
            skill_name = skill_item["skill"]
            analyzer.skill_status[skill_name] = {
                "has": False,
                "detected_in": [],
                "category": skill_item.get("category", "General")
            }

        print(f"[AI Routes] Calling analyzer.generate_questions() for {len(skills_to_use)} skills...")
        # Generate questions
        questions = analyzer.generate_questions()

        if not questions:
            print(f"[AI Routes] ERROR: No questions generated")
            raise HTTPException(
                status_code=500,
                detail="Could not generate questions"
            )

        # Double-check we don't exceed max_questions
        if len(questions) > max_q:
            print(f"[AI Routes] Truncating {len(questions)} questions to {max_q}")
            questions = questions[:max_q]

        print(f"[AI Routes] Generated {len(questions)} questions (max: {max_q})")

        return {
            "questions": questions,
            "total_questions": len(questions)
        }

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"[AI Routes] ERROR: {e}")
        print(f"[AI Routes] Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating questions: {str(e)}"
        )

@router.post("/detect-skills", response_model=SkillDetectionResponse)
async def detect_skills(request: SkillDetectionRequest):
    """
    Detect skills mentioned in transcribed text using AI

    Analyzes transcribed speech to identify which skills from a given list
    the candidate has claimed to possess or demonstrated experience with.

    **Accepts two skill formats:**

    Format 1 - Array of strings:
    ```json
    {
      "skills": ["Carpentry", "Power Tool Operation"],
      "transcribed_text": "I've been a carpenter for 5 years and I use power tools every day",
      "timestamp": "14:30:25"
    }
    ```

    Format 2 - Array of objects:
    ```json
    {
      "skills": [
        {"skill": "Carpentry", "category": "Trade Skill"},
        {"skill": "Power Tool Operation", "category": "Equipment Operation"}
      ],
      "transcribed_text": "I've been a carpenter for 5 years and I use power tools every day",
      "timestamp": "14:30:25"
    }
    ```

    **Returns:**
    - List of detected skill names
    - Total detected count

    **Detection Logic:**
    - Matches explicit claims ("I have", "I know", "I can")
    - Matches experience mentions ("I worked with", "I've been doing")
    - Flexible matching (informal language accepted)
    - Understands context
    """
    print(f"\n[AI Routes] === Skill Detection Request ===")
    print(f"[AI Routes] Skills to detect: {len(request.skills)}")
    print(f"[AI Routes] Text: {request.transcribed_text[:100]}...")

    try:
        # Create skill analyzer and set skills
        analyzer = SkillAnalyzer(ollama_client)
        analyzer.skills = request.skills

        # Initialize skill status
        for skill_item in request.skills:
            skill_name = skill_item["skill"]
            analyzer.skill_status[skill_name] = {
                "has": False,
                "detected_in": [],
                "category": skill_item.get("category", "General")
            }

        # Detect skills
        timestamp = request.timestamp or "N/A"
        detected_skills = analyzer.detect_skills_in_text(
            request.transcribed_text,
            timestamp
        )

        print(f"[AI Routes] Detected {len(detected_skills)} skills")
        for skill in detected_skills:
            print(f"[AI Routes]   - {skill}")

        return {
            "detected_skills": detected_skills,
            "total_detected": len(detected_skills)
        }

    except Exception as e:
        print(f"[AI Routes] ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error detecting skills: {str(e)}"
        )

# ============================================================================
# UTILITY ROUTES
# ============================================================================

@router.post("/cleanup-transcription")
async def cleanup_transcription(text: str):
    """
    Clean up transcription errors using AI

    Fixes common transcription errors like:
    - Incorrect word recognition (homophones)
    - Missing punctuation
    - Run-on sentences
    - Capitalization errors
    - Misheard technical terms

    **Example:**
    - Input: "i no how two use power tooles"
    - Output: "I know how to use power tools"
    """
    print(f"\n[AI Routes] === Transcription Cleanup Request ===")
    print(f"[AI Routes] Text: {text[:100]}...")

    try:
        cleaned = ollama_client.cleanup_transcription(text)

        print(f"[AI Routes] Cleaned transcription")
        if cleaned != text:
            print(f"[AI Routes] Changes made: YES")
        else:
            print(f"[AI Routes] Changes made: NO")

        return {
            "original": text,
            "cleaned": cleaned,
            "changed": cleaned != text
        }

    except Exception as e:
        print(f"[AI Routes] ERROR: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error cleaning transcription: {str(e)}"
        )
