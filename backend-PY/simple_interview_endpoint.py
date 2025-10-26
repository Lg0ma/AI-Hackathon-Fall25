"""
Simple Interview Endpoint - Uses skill_interview.py logic with database job
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, List, Optional
import logging
import uuid

from database import supabase
from skill_interview import OllamaClient, SkillAnalyzer
from RTtranscribe import StreamingTranscriber
import threading
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simple-interview", tags=["Simple Interview"])


class StartInterviewRequest(BaseModel):
    job_id: str
    duration_minutes: Optional[int] = 5


class InterviewSession:
    """Simple interview session that uses skill_interview.py logic"""

    def __init__(self, job_description: str, session_id: str):
        self.session_id = session_id
        self.ollama = OllamaClient(model="mistral:7b")
        self.analyzer = SkillAnalyzer(self.ollama)

        # Extract skills and generate questions
        logger.info(f"[{session_id}] Analyzing job description...")
        self.skills = self.analyzer.analyze_job_description(job_description)
        self.skills = self.skills[:8]  # Limit to 8 for 5-min interview

        logger.info(f"[{session_id}] Generating questions...")
        self.questions = self.analyzer.generate_questions()

        # Interview state
        self.transcriptions = []
        self.is_active = False

        logger.info(f"[{session_id}] Ready: {len(self.skills)} skills, {len(self.questions)} questions")

    def get_status(self):
        """Get current interview status"""
        detected_count = sum(1 for s in self.analyzer.skill_status.values() if s["has"])
        total_skills = len(self.skills)

        return {
            "session_id": self.session_id,
            "skills": self.skills,
            "questions": self.questions,
            "detected_count": detected_count,
            "total_skills": total_skills,
            "progress_percentage": (detected_count / total_skills * 100) if total_skills > 0 else 0,
            "transcriptions": self.transcriptions
        }

    def process_audio(self, audio_file_path: str):
        """Process uploaded audio and detect skills"""
        from faster_whisper import WhisperModel

        # Load Whisper model
        model = WhisperModel("large-v3", device="cuda", compute_type="float16")

        # Transcribe
        segments, info = model.transcribe(audio_file_path, beam_size=5, language=None)
        transcript = " ".join([s.text for s in segments]).strip()

        language = info.language if hasattr(info, 'language') else "unknown"
        timestamp = datetime.now().strftime("%H:%M:%S")

        logger.info(f"[{self.session_id}] Transcribed: \"{transcript}\"")

        # Clean transcription
        cleaned = self.ollama.cleanup_transcription(transcript)

        # Detect skills
        detected_skills = self.analyzer.detect_skills_in_text(transcript, timestamp, cleaned)

        # Store transcription
        self.transcriptions.append({
            "timestamp": timestamp,
            "original": transcript,
            "cleaned": cleaned,
            "detected_skills": detected_skills,
            "language": language
        })

        logger.info(f"[{self.session_id}] Detected skills: {detected_skills}")

        return {
            "transcript": cleaned,
            "detected_skills": detected_skills,
            "language": language
        }

    def get_final_report(self):
        """Generate final report"""
        report = self.analyzer.get_report()
        return {
            "session_id": self.session_id,
            "report": report,
            "transcriptions": self.transcriptions
        }


# Store active sessions
sessions: Dict[str, InterviewSession] = {}


@router.post("/start/{job_id}")
async def start_simple_interview(job_id: str):
    """
    Start interview for a job (fetches from database)

    Returns: {session_id, skills, questions}
    """
    logger.info(f"Starting simple interview for job: {job_id}")

    # Fetch job from database
    try:
        # Use 'demo' as ID or actual UUID
        job_response = supabase.table('job_listings').select('*').eq('id', job_id).execute()

        if not job_response.data or len(job_response.data) == 0:
            raise HTTPException(status_code=404, detail="Job not found")

        job = job_response.data[0]
        job_description = job['description']

        logger.info(f"Loaded job: {job['title']}")

    except Exception as e:
        logger.error(f"Error fetching job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Create session
    session_id = str(uuid.uuid4())
    session = InterviewSession(job_description, session_id)
    sessions[session_id] = session

    return {
        "session_id": session_id,
        "job_title": job['title'],
        "skills": session.skills,
        "questions": session.questions,
        "total_skills": len(session.skills)
    }


@router.get("/status/{session_id}")
async def get_interview_status(session_id: str):
    """Get current interview progress"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    return session.get_status()


@router.post("/answer/{session_id}")
async def submit_answer(session_id: str, audio_file: UploadFile = File(...)):
    """
    Submit audio answer (same as current endpoint)
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]

    # Save audio file
    import shutil
    import os

    temp_path = f"temp_{session_id}_{len(session.transcriptions)}.webm"
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        # Process audio
        result = session.process_audio(temp_path)

        # Get updated status
        status = session.get_status()

        return {
            **result,
            "progress": {
                "detected": status["detected_count"],
                "total": status["total_skills"],
                "percentage": status["progress_percentage"]
            }
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/complete/{session_id}")
async def complete_simple_interview(session_id: str):
    """
    Get final report and close session
    """
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]
    report = session.get_final_report()

    # Cleanup session
    del sessions[session_id]

    return report
