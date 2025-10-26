"""
AI Routes - FastAPI endpoints for AI workflows
Includes routes for:
1. Rating Agent - Candidate evaluation using Mistral AI
2. Skill Interview - Job skill extraction and detection

FOLLOWS CODE STRUCTURE FROM:
- RTtranscribe.py (logging, error handling, try-except patterns)
- skill_interview.py (OllamaClient, SkillAnalyzer classes)
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import traceback

# Import AI workflow modules
try:
    from rating_agent import evaluate_worker
    RATING_AGENT_AVAILABLE = True
    print("✅ rating_agent imported successfully")
except Exception as e:
    RATING_AGENT_AVAILABLE = False
    print(f"⚠️  rating_agent import failed: {e}")

try:
    from skill_interview import (
        OllamaClient,
        SkillAnalyzer,
        extract_json_from_response
    )
    SKILL_INTERVIEW_AVAILABLE = True
    print("✅ skill_interview imported successfully")
except Exception as e:
    SKILL_INTERVIEW_AVAILABLE = False
    print(f"⚠️  skill_interview import failed: {e}")
    print(f"   Some AI endpoints may not work")

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
    skills: List[Dict[str, str]]  # [{"skill": "...", "category": "..."}]

class QuestionGenerationResponse(BaseModel):
    questions: List[str]
    total_questions: int

class SkillDetectionRequest(BaseModel):
    skills: List[Dict[str, str]]  # Available skills to detect
    transcribed_text: str
    timestamp: Optional[str] = None

class SkillDetectionResponse(BaseModel):
    detected_skills: List[str]
    total_detected: int

# ============================================================================
# INITIALIZE OLLAMA CLIENT (following skill_interview.py pattern)
# ============================================================================

print("\n📡 Initializing Ollama client...")
try:
    if SKILL_INTERVIEW_AVAILABLE:
        ollama_client = OllamaClient(
            base_url="http://localhost:11434",
            model="mistral:7b"
        )
        
        # Test connection
        if ollama_client.check_connection():
            print("✅ Ollama client initialized and connected")
        else:
            print("⚠️  Ollama client initialized but NOT connected")
            print("   Please ensure Ollama is running: ollama serve")
    else:
        ollama_client = None
        print("❌ Ollama client not available (skill_interview import failed)")
except Exception as e:
    ollama_client = None
    print(f"❌ Failed to initialize Ollama client: {e}")

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
    print(f"\n{'='*60}")
    print(f"🔍 CANDIDATE EVALUATION REQUEST")
    print(f"{'='*60}")
    print(f"   Job description: {len(request.job_description)} chars")
    print(f"   Candidate info: {len(request.candidate_info)} chars")

    # Check if rating agent is available
    if not RATING_AGENT_AVAILABLE:
        print(f"❌ Rating agent not available")
        raise HTTPException(
            status_code=503,
            detail="Rating agent module is not available. Please check server logs."
        )

    try:
        print(f"   Calling rating agent...")
        
        # Call the rating agent
        evaluation = evaluate_worker(
            job_description=request.job_description,
            candidate_info=request.candidate_info
        )

        if not evaluation:
            print(f"❌ AI evaluation returned None")
            raise HTTPException(
                status_code=500,
                detail="AI evaluation failed. Check if Ollama is running."
            )

        print(f"✅ Evaluation complete")
        print(f"   Recommendation: {evaluation.recommendation}")
        print(f"   Score: {evaluation.overall_score}/100")
        print(f"   Skill level: {evaluation.skill_level}")

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

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error evaluating candidate: {str(e)}"
        )

# ============================================================================
# SKILL INTERVIEW ROUTES
# ============================================================================

@router.get("/health-check")
async def health_check():
    """
    Check if Ollama AI service is running and accessible

    **Returns:**
    - `connected`: boolean indicating if Ollama is accessible
    - `model`: the AI model being used
    """
    print(f"\n{'='*60}")
    print(f"🏥 HEALTH CHECK")
    print(f"{'='*60}")

    if not SKILL_INTERVIEW_AVAILABLE or not ollama_client:
        print(f"❌ Skill interview not available")
        return {
            "connected": False,
            "model": None,
            "message": "Skill interview module not available"
        }

    try:
        is_connected = ollama_client.check_connection()
        
        if is_connected:
            print(f"✅ Ollama is running")
            print(f"   Model: {ollama_client.model}")
        else:
            print(f"❌ Ollama is NOT accessible")
            print(f"   Please run: ollama serve")

        return {
            "connected": is_connected,
            "model": ollama_client.model,
            "message": "Ollama is running" if is_connected else "Ollama is not accessible"
        }
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return {
            "connected": False,
            "model": None,
            "message": f"Error: {str(e)}"
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
    print(f"\n{'='*60}")
    print(f"🔧 SKILL EXTRACTION REQUEST")
    print(f"{'='*60}")
    print(f"   Job description: {request.job_description[:100]}...")

    # Check availability
    if not SKILL_INTERVIEW_AVAILABLE or not ollama_client:
        print(f"❌ Skill interview not available")
        raise HTTPException(
            status_code=503,
            detail="Skill interview module is not available"
        )

    try:
        print(f"   Creating SkillAnalyzer...")
        
        # Create skill analyzer
        analyzer = SkillAnalyzer(ollama_client)

        print(f"   Analyzing job description...")
        
        # Extract skills
        skills = analyzer.analyze_job_description(request.job_description)

        if not skills:
            print(f"⚠️  No skills extracted")
            raise HTTPException(
                status_code=500,
                detail="Could not extract skills from job description"
            )

        print(f"✅ Extracted {len(skills)} skills")
        for i, skill_item in enumerate(skills[:5], 1):  # Show first 5
            print(f"   {i}. {skill_item['skill']} ({skill_item.get('category', 'General')})")
        if len(skills) > 5:
            print(f"   ... and {len(skills) - 5} more")

        return {
            "skills": skills,
            "total_skills": len(skills)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR: {e}")
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

    **Example Request:**
    ```json
    {
      "skills": [
        {"skill": "Carpentry", "category": "Trade Skill"},
        {"skill": "Forklift Operation", "category": "Equipment Operation"}
      ]
    }
    ```

    **Returns:**
    - List of interview questions
    - Total question count
    """
    print(f"\n{'='*60}")
    print(f"❓ QUESTION GENERATION REQUEST")
    print(f"{'='*60}")
    print(f"   Skills count: {len(request.skills)}")

    # Check availability
    if not SKILL_INTERVIEW_AVAILABLE or not ollama_client:
        print(f"❌ Skill interview not available")
        raise HTTPException(
            status_code=503,
            detail="Skill interview module is not available"
        )

    try:
        print(f"   Creating SkillAnalyzer...")
        
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

        print(f"   Generating questions...")
        
        # Generate questions
        questions = analyzer.generate_questions()

        if not questions:
            print(f"⚠️  No questions generated")
            raise HTTPException(
                status_code=500,
                detail="Could not generate questions"
            )

        print(f"✅ Generated {len(questions)} questions")
        for i, q in enumerate(questions[:3], 1):  # Show first 3
            print(f"   {i}. {q[:60]}...")
        if len(questions) > 3:
            print(f"   ... and {len(questions) - 3} more")

        return {
            "questions": questions,
            "total_questions": len(questions)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR: {e}")
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

    **Example Request:**
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
    print(f"\n{'='*60}")
    print(f"🔍 SKILL DETECTION REQUEST")
    print(f"{'='*60}")
    print(f"   Skills to detect: {len(request.skills)}")
    print(f"   Text: '{request.transcribed_text[:100]}...'")
    if request.timestamp:
        print(f"   Timestamp: {request.timestamp}")

    # Check availability
    if not SKILL_INTERVIEW_AVAILABLE or not ollama_client:
        print(f"❌ Skill interview not available")
        raise HTTPException(
            status_code=503,
            detail="Skill interview module is not available"
        )

    # Validate input
    if not request.skills or len(request.skills) == 0:
        print(f"⚠️  No skills provided")
        return {
            "detected_skills": [],
            "total_detected": 0
        }

    if not request.transcribed_text or len(request.transcribed_text.strip()) < 3:
        print(f"⚠️  Empty or too short transcription")
        return {
            "detected_skills": [],
            "total_detected": 0
        }

    try:
        print(f"   Creating SkillAnalyzer...")
        
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

        print(f"   Detecting skills...")
        
        # Detect skills
        timestamp = request.timestamp or "N/A"
        detected_skills = analyzer.detect_skills_in_text(
            request.transcribed_text,
            timestamp
        )

        print(f"✅ Detected {len(detected_skills)} skills")
        for skill in detected_skills:
            print(f"   ✓ {skill}")

        return {
            "detected_skills": detected_skills,
            "total_detected": len(detected_skills)
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ERROR: {e}")
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
    print(f"\n{'='*60}")
    print(f"🧹 TRANSCRIPTION CLEANUP REQUEST")
    print(f"{'='*60}")
    print(f"   Text: '{text[:100]}...'")

    # Check availability
    if not SKILL_INTERVIEW_AVAILABLE or not ollama_client:
        print(f"❌ Skill interview not available")
        raise HTTPException(
            status_code=503,
            detail="Skill interview module is not available"
        )

    try:
        print(f"   Cleaning transcription...")
        
        cleaned = ollama_client.cleanup_transcription(text)

        if cleaned != text:
            print(f"✅ Transcription cleaned")
            print(f"   Original: {text[:50]}...")
            print(f"   Cleaned:  {cleaned[:50]}...")
        else:
            print(f"✅ No changes needed")

        return {
            "original": text,
            "cleaned": cleaned,
            "changed": cleaned != text
        }

    except Exception as e:
        print(f"❌ ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error cleaning transcription: {str(e)}"
        )

print(f"\n{'='*60}")
print(f"✅ AI Routes module loaded")
print(f"   Rating Agent: {'Available' if RATING_AGENT_AVAILABLE else 'Not available'}")
print(f"   Skill Interview: {'Available' if SKILL_INTERVIEW_AVAILABLE else 'Not available'}")
print(f"   Ollama Client: {'Connected' if ollama_client and ollama_client.check_connection() else 'Not connected'}")
print(f"{'='*60}\n")

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
    skills: List[Dict[str, str]]  # [{"skill": "...", "category": "..."}]

class QuestionGenerationResponse(BaseModel):
    questions: List[str]
    total_questions: int

class SkillDetectionRequest(BaseModel):
    skills: List[Dict[str, str]]  # Available skills to detect
    transcribed_text: str
    timestamp: Optional[str] = None

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

        print(f"[AI Routes] ✓ Evaluation complete")
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

    print(f"[AI Routes] Ollama status: {'✓ Connected' if is_connected else '✗ Not connected'}")

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

        print(f"[AI Routes] ✓ Extracted {len(skills)} skills")

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

    **Example Request:**
    ```json
    {
      "skills": [
        {"skill": "Carpentry", "category": "Trade Skill"},
        {"skill": "Forklift Operation", "category": "Equipment Operation"}
      ]
    }
    ```

    **Returns:**
    - List of interview questions
    - Total question count
    """
    print(f"\n[AI Routes] === Question Generation Request ===")
    print(f"[AI Routes] Skills count: {len(request.skills)}")

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

        # Generate questions
        questions = analyzer.generate_questions()

        if not questions:
            raise HTTPException(
                status_code=500,
                detail="Could not generate questions"
            )

        print(f"[AI Routes] ✓ Generated {len(questions)} questions")

        return {
            "questions": questions,
            "total_questions": len(questions)
        }

    except Exception as e:
        print(f"[AI Routes] ERROR: {e}")
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

    **Example Request:**
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

        print(f"[AI Routes] ✓ Detected {len(detected_skills)} skills")
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

        print(f"[AI Routes] ✓ Cleaned transcription")
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
