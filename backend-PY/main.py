from fastapi import FastAPI, UploadFile, File, Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from database import supabase
import shutil
import os
import warnings
import uuid

# Suppress ctranslate2 pkg_resources deprecation warning
warnings.filterwarnings("ignore", message=".*pkg_resources is deprecated.*")

from faster_whisper import WhisperModel
from fastapi.middleware.cors import CORSMiddleware
import json
import bcrypt
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging
import time
import base64
import subprocess

# Import AI routes and classes
from ai_routes import router as ai_router
from skill_interview import OllamaClient, SkillAnalyzer
from simple_interview_endpoint import router as simple_interview_router
from live_interview_endpoint import router as live_interview_router
from interview_room import router as interview_room_router, set_models as set_interview_room_models
from routers.applications_router import router as applications_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Try to import TTS library (gTTS for Google Text-to-Speech)
try:
    from gtts import gTTS
    import io
    TTS_AVAILABLE = True
    logger_tts = logging.getLogger("gtts")
    logger_tts.setLevel(logging.WARNING)  # Reduce gTTS logging
except ImportError:
    TTS_AVAILABLE = False
    logger.warning("gTTS not installed. Install with: pip install gTTS")

# Audio conversion utility
def convert_to_wav(input_path: str, output_path: str) -> bool:
    """
    Convert audio file to WAV format using ffmpeg
    Returns True if successful, False otherwise
    """
    try:
        logger.info(f"Converting {input_path} to WAV format...")

        # Use ffmpeg to convert to 16kHz mono WAV (optimal for Whisper)
        command = [
            'ffmpeg',
            '-loglevel', 'error',  # Only show errors
            '-i', input_path,
            '-ar', '16000',  # 16kHz sample rate
            '-ac', '1',      # Mono
            '-y',            # Overwrite output file
            output_path
        ]

        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=30
        )

        if result.returncode == 0:
            logger.info(f"✓ Audio converted successfully to {output_path}")
            return True
        else:
            logger.error(f"FFmpeg conversion failed: {result.stderr.decode()}")
            return False

    except FileNotFoundError:
        logger.error("❌ FFmpeg not found! Please install: 'choco install ffmpeg' or 'apt-get install ffmpeg'")
        return False
    except subprocess.TimeoutExpired:
        logger.error("❌ Audio conversion timed out (>30s)")
        return False
    except Exception as e:
        logger.error(f"❌ Audio conversion error: {e}")
        import traceback
        traceback.print_exc()
        return False

from routers.jobs_router import router as jobs_router
from routers import inbox_router

# --- FastAPI App Initialization ---
app = FastAPI()

# --- Global Validation Error Handler ---
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Global handler for Pydantic validation errors (422 responses)
    Provides detailed logging and helpful error messages
    """
    logger.error("="*60)
    logger.error("VALIDATION ERROR (422)")
    logger.error("="*60)
    logger.error(f"Endpoint: {request.url.path}")
    logger.error(f"Method: {request.method}")

    # Try to get request body for debugging
    try:
        body = await request.body()
        body_str = body.decode('utf-8')
        logger.error(f"Request body ({len(body_str)} chars):")
        logger.error(body_str[:1000] + ("..." if len(body_str) > 1000 else ""))
    except Exception as e:
        logger.error(f"Could not read request body: {e}")

    logger.error("Validation errors:")
    for i, error in enumerate(exc.errors(), 1):
        logger.error(f"  Error #{i}:")
        logger.error(f"    Location: {error.get('loc')}")
        logger.error(f"    Type: {error.get('type')}")
        logger.error(f"    Message: {error.get('msg')}")
        if 'input' in error:
            logger.error(f"    Input value: {error.get('input')}")

    logger.error("="*60)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Request validation failed. Check the logs for details.",
            "endpoint": request.url.path
        },
    )

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(inbox_router.router)
app.include_router(jobs_router, prefix="/api", tags=["jobs"])
app.include_router(ai_router)
app.include_router(simple_interview_router)
app.include_router(live_interview_router)
app.include_router(interview_room_router)
app.include_router(applications_router)
print("[OK] AI routes registered at /ai")
print("[OK] Simple interview routes registered at /simple-interview")
print("[OK] Live interview routes registered at /live-interview")
print("[OK] Interview room routes registered at /live-interview")
print("[OK] Jobs Router routes registered at /applications-router")

# --- AI Model Loading ---
logger.info("="*60)
logger.info("INITIALIZING AI MODELS")
logger.info("="*60)

# Load faster-whisper-large-v3 model
logger.info("Loading faster-whisper 'large-v3' model...")
logger.info("Device: CUDA (GPU) | Compute Type: float16")
model = WhisperModel("large-v3", device="cpu", compute_type="int8")
logger.info("✅ faster-whisper-large-v3 model loaded successfully on CUDA")

# Initialize Ollama client for Mistral
logger.info("Initializing Ollama client with Mistral model...")
ollama_client_global = OllamaClient(model="mistral:7b")
if ollama_client_global.check_connection():
    logger.info("✅ Ollama Mistral model ready")
else:
    logger.warning("⚠️ Ollama not accessible - AI features may not work")

# Configuring Module for the interview module
logger.info("Configuring Interview Room module...")
set_interview_room_models(model, ollama_client_global)
logger.info("✅ Interview Room configured")

logger.info("="*60)

# --- Persistent Data Storage (using a JSON file) ---
RESPONSES_FILE = "user_responses.json"

def load_responses():
    if os.path.exists(RESPONSES_FILE):
        with open(RESPONSES_FILE, "r") as f:
            return json.load(f)
    return {"users": []}

def save_responses(responses_data):
    with open(RESPONSES_FILE, "w") as f:
        json.dump(responses_data, f, indent=4)

# --- Account Creation ---
class Account(BaseModel):
    first_name:str
    last_name: str
    email: str
    phone_number: str
    postal_code: str
    password: str

@app.post("/create-account")
async def create_account(account: Account):
    print(f"--- Received request to create account for: {account.email} ---")
    print(f"Data received: {account.dict()}")
    try:
        auth_response = supabase.auth.sign_up({
            'email': account.email,
            'password': account.password,
        })
        print(f"Supabase Auth Response: {auth_response}")
        if auth_response.user:
            user_id = auth_response.user.id
            print(f"Auth user created successfully with ID: {user_id}")
            profile_response = supabase.table('profiles').update({
                'first_name': account.first_name,
                'last_name': account.last_name,
                'postal_code': account.postal_code,
                'phone_number': account.phone_number,
            }).eq('id', user_id).execute()
            print(f"Supabase Profile Response: {profile_response}")
            if profile_response.data:
                print("Profile created successfully.")
                return {"message": "Account created successfully", "phone_number": account.phone_number}
            else:
                print("ERROR: Profile creation failed. Rolling back auth user.")
                supabase.auth.admin.delete_user(user_id)
                error_message = "Unknown profile creation error"
                if profile_response.error:
                    error_message = profile_response.error.message
                return {"error": f"Failed to create user profile: {error_message}"}
        if auth_response.error:
            print(f"ERROR: Auth user creation failed: {auth_response.error.message}")
            return {"error": f"Failed to create auth user: {auth_response.error.message}"}
    except Exception as e:
        print(f"CRITICAL ERROR: An exception occurred: {e}")
        return {"error": str(e)}

# --- Account Login ---
class LoginData(BaseModel):
    email: str
    password: str

@app.post("/login")
async def login(login_data: LoginData):
    print(f"--- Received request to login for: {login_data.email} ---")
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        print(f"Supabase Auth Response: {auth_response}")
        if auth_response.session:
            print("Login successful.")
            return {"message": "Login successful", "session": auth_response.session.dict()}
        if auth_response.error:
            print(f"ERROR: Login failed: {auth_response.error.message}")
            return {"error": f"Login failed: {auth_response.error.message}"}
    except Exception as e:
        print(f"CRITICAL ERROR: An exception occurred: {e}")
        return {"error": str(e)}
    
# --- Voice-based Q&A Logic ---
QUESTIONS = [
    "What are your skills?",
]

@app.get("/questions")
async def get_questions():
    return {"questions": QUESTIONS}

class TextInput(BaseModel):
    text: str
   # 

@app.post("/text-input/{phone_number}/{question_id}")
async def handle_text_input(phone_number: str, question_id: int, text_input: TextInput):
    responses_data = load_responses()
    user_entry = next((u for u in responses_data["users"] if u.get("phone_number") == phone_number), None)

    if not user_entry:
        return {"error": "User not found"}

    user_entry["responses"][QUESTIONS[question_id]] = text_input.text
    save_responses(responses_data)

    next_question_id = question_id + 1
    if next_question_id < len(QUESTIONS):
        return {
            "message": "Response received",
            "next_question": QUESTIONS[next_question_id],
            "next_question_id": next_question_id,
        }
    else:
        return {
            "message": "All questions answered",
            "responses": user_entry["responses"],
        }

@app.post("/voice-input/{phone_number}/{question_id}")
async def handle_voice_input(phone_number: str, question_id: int, audio_file: UploadFile = File(...)):
    file_path = f"temp_audio_{phone_number}_{question_id}.wav"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    # Use faster-whisper's transcribe method (returns segments and info)
    segments, info = model.transcribe(file_path, beam_size=5)
    
    # Combine all segments into a single transcription
    transcribed_text = " ".join([segment.text for segment in segments]).strip()
    print(f"User '{phone_number}' | Q{question_id} | Transcribed: '{transcribed_text}'")

    os.remove(file_path)

    responses_data = load_responses()
    user_entry = next((u for u in responses_data["users"] if u.get("phone_number") == phone_number), None)

    # Create user if they don't exist (for guest users)
    if not user_entry:
        print(f"[Voice Input] Creating guest user: {phone_number}")
        user_entry = {
            "phone_number": phone_number,
            "responses": {}
        }
        responses_data["users"].append(user_entry)

    # Save the transcription (use question_id as key for interview questions)
    user_entry["responses"][f"Q{question_id}"] = transcribed_text
    save_responses(responses_data)

    next_question_id = question_id + 1
    if next_question_id < len(QUESTIONS):
        return {
            "message": "Response received",
            "next_question": QUESTIONS[next_question_id],
            "next_question_id": next_question_id,
            "transcribed_text": transcribed_text
        }
    else:
        return {
            "message": "All questions answered",
            "responses": user_entry["responses"],
            "transcribed_text": transcribed_text,
        }

# --- Simplified Interview Session Manager ---
class SimpleInterviewSession:
    """
    Simplified interview session using request/response pattern (like questionnaire)

    Workflow:
    1. Client calls /ai/extract-skills (gets skills)
    2. Client calls /ai/generate-questions (gets questions with TTS)
    3. Client calls /interview/start (creates session)
    4. For each question:
       - Client plays TTS question
       - Client records answer
       - Client posts to /interview/answer/{session_id}/{question_index}
       - Server transcribes, detects skills, returns progress
    5. Client calls /interview/complete (gets final report)

    No WebSocket, no timers, no complexity!
    """

    def __init__(self, session_id: str, skills: List[Dict], questions: List[str]):
        self.session_id = session_id
        self.skills = skills
        self.questions = questions

        # AI components
        self.ollama_client = OllamaClient(model="mistral:7b")
        self.skill_analyzer = SkillAnalyzer(self.ollama_client)
        self.skill_analyzer.skills = skills

        # Initialize skill status
        for skill_item in skills:
            skill_name = skill_item["skill"]
            self.skill_analyzer.skill_status[skill_name] = {
                "has": False,
                "detected_in": [],
                "category": skill_item.get("category", "General")
            }

        # Session state
        self.answers: List[Dict] = []  # {"question_index": 0, "transcript": "...", "detected_skills": [...]}
        self.current_question_index = 0
        self.start_time = datetime.now()
        self.completed = False

        logger.info(f"[Session {session_id}] Created interview session")
        logger.info(f"[Session {session_id}]   Skills: {len(skills)}")
        logger.info(f"[Session {session_id}]   Questions: {len(questions)}")

    def process_answer(self, question_index: int, audio_file_path: str) -> Dict:
        """
        Process answer for a question
        Returns: {"transcript", "detected_skills", "progress", "next_question"}
        """
        logger.info(f"[Session {self.session_id}] ==========================================")
        logger.info(f"[Session {self.session_id}] PROCESS_ANSWER METHOD")
        logger.info(f"[Session {self.session_id}] ==========================================")
        logger.info(f"[Session {self.session_id}] Processing answer for Q{question_index + 1}")
        logger.info(f"[Session {self.session_id}] Audio file: {audio_file_path}")

        # Check audio file exists and has content
        if not os.path.exists(audio_file_path):
            logger.error(f"[Session {self.session_id}] ❌ Audio file not found: {audio_file_path}")
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

        file_size = os.path.getsize(audio_file_path)
        logger.info(f"[Session {self.session_id}] Audio file size: {file_size} bytes")

        if file_size == 0:
            logger.error(f"[Session {self.session_id}] ❌ Audio file is empty")
            raise ValueError("Audio file is empty")

        try:
            # Transcribe with bilingual support (faster-whisper handles webm natively via ffmpeg)
            logger.info(f"[Session {self.session_id}] Step 1: Transcribing with faster-whisper (bilingual)...")
            logger.info(f"[Session {self.session_id}]   Audio format: {audio_file_path.split('.')[-1]}")
            start_time = time.time()

            segments, info = model.transcribe(
                audio_file_path,
                beam_size=5,
                task="transcribe",
                language=None  # Auto-detect English/Spanish
            )

            transcript = " ".join([s.text for s in segments]).strip()
            transcription_time = time.time() - start_time

            detected_language = info.language if hasattr(info, 'language') else "unknown"
            language_confidence = info.language_probability if hasattr(info, 'language_probability') else 0.0

            timestamp = datetime.now().strftime("%H:%M:%S")

            logger.info(f"[Session {self.session_id}] ✅ Transcription complete ({transcription_time:.2f}s)")
            logger.info(f"[Session {self.session_id}] [{timestamp}] Language: {detected_language.upper()} ({language_confidence:.0%})")
            logger.info(f"[Session {self.session_id}] [{timestamp}] Transcript: \"{transcript}\"")
            logger.info(f"[Session {self.session_id}] Transcript length: {len(transcript)} characters")

            if not transcript:
                logger.warning(f"[Session {self.session_id}] ⚠️ Transcription is empty!")

            # Clean transcription
            logger.info(f"[Session {self.session_id}] Step 2: Cleaning transcription with Mistral...")
            start_time = time.time()

            cleaned_transcript = self.ollama_client.cleanup_transcription(transcript)
            cleanup_time = time.time() - start_time

            logger.info(f"[Session {self.session_id}] ✅ Cleanup complete ({cleanup_time:.2f}s)")

            if cleaned_transcript != transcript:
                logger.info(f"[Session {self.session_id}] ✓ Transcription cleaned")
                logger.info(f"[Session {self.session_id}]   Original:  {transcript}")
                logger.info(f"[Session {self.session_id}]   Corrected: {cleaned_transcript}")
            else:
                logger.info(f"[Session {self.session_id}] No cleanup changes needed")

            # Detect skills
            logger.info(f"[Session {self.session_id}] Step 3: Analyzing for skills with Mistral...")
            start_time = time.time()

            detected_skills = self.skill_analyzer.detect_skills_in_text(
                transcript,
                timestamp,
                cleaned_text=cleaned_transcript
            )

            detection_time = time.time() - start_time
            logger.info(f"[Session {self.session_id}] ✅ Skill detection complete ({detection_time:.2f}s)")

            if detected_skills:
                logger.info(f"[Session {self.session_id}] ✅ Detected {len(detected_skills)} skill(s):")
                for skill in detected_skills:
                    logger.info(f"[Session {self.session_id}]    ✓ {skill}")
            else:
                logger.info(f"[Session {self.session_id}] No skills detected in this answer")

            # Calculate progress
            logger.info(f"[Session {self.session_id}] Step 4: Calculating progress...")
            total_skills = len(self.skills)
            detected_count = sum(
                1 for status in self.skill_analyzer.skill_status.values()
                if status["has"]
            )
            progress = (detected_count / total_skills * 100) if total_skills > 0 else 0

            logger.info(f"[Session {self.session_id}] 📊 Progress: {detected_count}/{total_skills} skills ({progress:.0%})")

            # Save answer
            logger.info(f"[Session {self.session_id}] Step 5: Saving answer data...")
            answer_data = {
                "question_index": question_index,
                "question": self.questions[question_index],
                "transcript": transcript,
                "cleaned_transcript": cleaned_transcript,
                "detected_skills": detected_skills,
                "language": detected_language,
                "language_confidence": language_confidence,
                "timestamp": timestamp
            }
            self.answers.append(answer_data)
            logger.info(f"[Session {self.session_id}] ✓ Answer saved (total answers: {len(self.answers)})")

            # Check if we have more questions
            next_question_index = question_index + 1
            has_next = next_question_index < len(self.questions)

            # Check if all skills detected
            all_skills_detected = (detected_count == total_skills)

            logger.info(f"[Session {self.session_id}] Step 6: Preparing response...")
            logger.info(f"[Session {self.session_id}]   Has next question: {has_next}")
            logger.info(f"[Session {self.session_id}]   Next question index: {next_question_index if has_next else None}")
            logger.info(f"[Session {self.session_id}]   All skills detected: {all_skills_detected}")

            response = {
                "transcript": cleaned_transcript,
                "detected_skills": detected_skills,
                "language": detected_language,
                "progress": {
                    "detected": detected_count,
                    "total": total_skills,
                    "percentage": progress
                },
                "has_next_question": has_next and not all_skills_detected,
                "next_question_index": next_question_index if has_next else None,
                "all_skills_detected": all_skills_detected,
                "message": "All skills detected! Interview complete." if all_skills_detected else (
                    "Next question ready" if has_next else "All questions answered"
                )
            }

            logger.info(f"[Session {self.session_id}] ✅ Response prepared")
            logger.info(f"[Session {self.session_id}] ==========================================")

            return response

        except Exception as e:
            logger.error(f"[Session {self.session_id}] ==========================================")
            logger.error(f"[Session {self.session_id}] ❌ ERROR IN PROCESS_ANSWER")
            logger.error(f"[Session {self.session_id}] ==========================================")
            logger.error(f"[Session {self.session_id}] Error type: {type(e).__name__}")
            logger.error(f"[Session {self.session_id}] Error message: {str(e)}")
            import traceback
            logger.error(f"[Session {self.session_id}] Traceback:")
            for line in traceback.format_exc().split('\n'):
                logger.error(f"[Session {self.session_id}]   {line}")
            logger.error(f"[Session {self.session_id}] ==========================================")
            raise

    def get_report(self) -> Dict:
        """Generate final report"""
        self.completed = True
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()

        report = self.skill_analyzer.get_report()

        logger.info(f"[Session {self.session_id}] " + "="*40)
        logger.info(f"[Session {self.session_id}] FINAL REPORT")
        logger.info(f"[Session {self.session_id}] " + "="*40)
        logger.info(f"[Session {self.session_id}] Duration: {int(duration//60)}m {int(duration%60)}s")
        logger.info(f"[Session {self.session_id}] Questions answered: {len(self.answers)}/{len(self.questions)}")
        logger.info(f"[Session {self.session_id}] Skills detected: {len(report['skills_has'])}/{report['total_skills']} ({report['coverage']:.0%})")

        return {
            "report": report,
            "answers": self.answers,
            "duration_seconds": int(duration),
            "questions_answered": len(self.answers),
            "session_id": self.session_id
        }

# Store active interview sessions (in-memory)
interview_sessions: Dict[str, SimpleInterviewSession] = {}


# --- REST-based Interview Endpoints (Simple pattern like questionnaire) ---

class InterviewStartRequest(BaseModel):
    skills: List[Dict[str, str]]
    questions: List[str]

@app.post("/interview/start")
async def start_interview(request: InterviewStartRequest):
    """
    Start a new interview session

    **Workflow:**
    1. Client calls /ai/extract-skills (gets skills)
    2. Client calls /ai/generate-questions (gets questions with TTS)
    3. Client calls THIS endpoint with skills + questions
    4. Server creates session and returns session_id

    **Returns session_id** for subsequent answer submissions
    """
    logger.info("="*60)
    logger.info("START INTERVIEW ENDPOINT")
    logger.info("="*60)
    logger.info("NEW INTERVIEW SESSION (REST)")

    # Generate unique session ID
    session_id = str(uuid.uuid4())

    logger.info(f"[Session {session_id}] Creating interview session...")
    logger.info(f"[Session {session_id}]   Skills: {len(request.skills)}")
    logger.info(f"[Session {session_id}]   Questions: {len(request.questions)}")
    logger.info(f"[Session {session_id}] Skills data:")
    for i, skill in enumerate(request.skills[:3], 1):
        logger.info(f"[Session {session_id}]   {i}. {skill}")
    if len(request.skills) > 3:
        logger.info(f"[Session {session_id}]   ... and {len(request.skills) - 3} more")

    logger.info(f"[Session {session_id}] Questions data:")
    for i, question in enumerate(request.questions[:3], 1):
        logger.info(f"[Session {session_id}]   {i}. {question}")
    if len(request.questions) > 3:
        logger.info(f"[Session {session_id}]   ... and {len(request.questions) - 3} more")

    try:
        # Create session
        logger.info(f"[Session {session_id}] Initializing SimpleInterviewSession...")
        session = SimpleInterviewSession(
            session_id=session_id,
            skills=request.skills,
            questions=request.questions
        )

        # Store session
        logger.info(f"[Session {session_id}] Storing session in memory...")
        interview_sessions[session_id] = session
        logger.info(f"[Session {session_id}] Total active sessions: {len(interview_sessions)}")

        logger.info(f"[Session {session_id}] ✅ Session created and ready")
        logger.info("="*60)

        return {
            "session_id": session_id,
            "skills": request.skills,
            "questions": request.questions,
            "total_questions": len(request.questions),
            "message": "Interview session created. Send answers to /interview/answer/{session_id}/{question_index}"
        }

    except Exception as e:
        logger.error("="*60)
        logger.error(f"[Session {session_id}] ❌ ERROR CREATING SESSION")
        logger.error("="*60)
        logger.error(f"[Session {session_id}] Error type: {type(e).__name__}")
        logger.error(f"[Session {session_id}] Error message: {str(e)}")
        import traceback
        logger.error(f"[Session {session_id}] Traceback:")
        for line in traceback.format_exc().split('\n'):
            logger.error(f"[Session {session_id}]   {line}")
        logger.error("="*60)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/interview/answer/{session_id}/{question_index}")
async def submit_interview_answer(
    session_id: str,
    question_index: int,
    audio_file: UploadFile = File(...)
):
    """
    Submit answer for a specific question

    **Pattern:** Same as /voice-input/{phone_number}/{question_id}

    1. Client records answer
    2. Client posts audio file
    3. Server transcribes (bilingual)
    4. Server detects skills
    5. Server returns: transcript, detected skills, progress, next question

    **Early completion:** If all skills detected, interview ends automatically
    """
    logger.info("="*60)
    logger.info(f"[Session {session_id}] SUBMIT ANSWER ENDPOINT")
    logger.info("="*60)
    logger.info(f"[Session {session_id}] Received answer for Q{question_index + 1}")
    logger.info(f"[Session {session_id}] Audio file info:")
    logger.info(f"[Session {session_id}]   Filename: {audio_file.filename}")
    logger.info(f"[Session {session_id}]   Content-Type: {audio_file.content_type}")
    logger.info(f"[Session {session_id}]   Size: {audio_file.size if hasattr(audio_file, 'size') else 'Unknown'}")

    # Check session exists
    if session_id not in interview_sessions:
        logger.error(f"[Session {session_id}] ❌ Session not found")
        logger.error(f"[Session {session_id}] Available sessions: {list(interview_sessions.keys())}")
        raise HTTPException(status_code=404, detail="Session not found")

    session = interview_sessions[session_id]
    logger.info(f"[Session {session_id}] ✓ Session found")
    logger.info(f"[Session {session_id}]   Total questions: {len(session.questions)}")
    logger.info(f"[Session {session_id}]   Answers submitted so far: {len(session.answers)}")

    # Check question index is valid
    if question_index < 0 or question_index >= len(session.questions):
        logger.error(f"[Session {session_id}] ❌ Invalid question index: {question_index}")
        logger.error(f"[Session {session_id}] Valid range: 0-{len(session.questions)-1}")
        raise HTTPException(status_code=400, detail=f"Invalid question index. Must be 0-{len(session.questions)-1}")

    logger.info(f"[Session {session_id}] ✓ Question index valid")
    logger.info(f"[Session {session_id}] Question: \"{session.questions[question_index]}\"")

    # Save audio file (use webm extension since that's what's being sent)
    temp_audio_path = f"temp_interview_{session_id}_q{question_index}.webm"
    logger.info(f"[Session {session_id}] Saving audio to: {temp_audio_path}")

    try:
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        # Check file was saved
        file_size = os.path.getsize(temp_audio_path)
        logger.info(f"[Session {session_id}] ✓ Audio file saved ({file_size} bytes)")

        # Process answer
        logger.info(f"[Session {session_id}] Calling session.process_answer()...")
        result = session.process_answer(question_index, temp_audio_path)

        logger.info(f"[Session {session_id}] ✅ Answer processed successfully")
        logger.info(f"[Session {session_id}] Result preview:")
        logger.info(f"[Session {session_id}]   Transcript: \"{result.get('transcript', 'N/A')[:100]}...\"")
        logger.info(f"[Session {session_id}]   Detected skills: {result.get('detected_skills', [])}")
        logger.info(f"[Session {session_id}]   Progress: {result.get('progress', {})}")
        logger.info(f"[Session {session_id}]   Has next: {result.get('has_next_question', False)}")
        logger.info(f"[Session {session_id}]   All detected: {result.get('all_skills_detected', False)}")
        logger.info("="*60)

        return result

    except Exception as e:
        logger.error("="*60)
        logger.error(f"[Session {session_id}] ❌ ERROR PROCESSING ANSWER")
        logger.error("="*60)
        logger.error(f"[Session {session_id}] Error type: {type(e).__name__}")
        logger.error(f"[Session {session_id}] Error message: {str(e)}")
        import traceback
        logger.error(f"[Session {session_id}] Traceback:")
        for line in traceback.format_exc().split('\n'):
            logger.error(f"[Session {session_id}]   {line}")
        logger.error("="*60)
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temp file
        if os.path.exists(temp_audio_path):
            logger.info(f"[Session {session_id}] Cleaning up temp file: {temp_audio_path}")
            os.remove(temp_audio_path)

@app.post("/interview/complete/{session_id}")
async def complete_interview(session_id: str):
    """
    Complete interview and get final report
    
    **Returns:**
    - Full skill assessment report
    - All answers and transcripts
    - Skills detected vs missing
    - Interview duration
    """
    logger.info(f"[Session {session_id}] Completing interview...")
    
    # Check session exists
    if session_id not in interview_sessions:
        logger.error(f"[Session {session_id}] Session not found")
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = interview_sessions[session_id]
    
    # Generate final report
    final_report = session.get_report()
    
    logger.info(f"[Session {session_id}] ✅ Interview completed")
    logger.info("="*60)
    
    # Clean up session
    del interview_sessions[session_id]
    
    return final_report

@app.get("/interview/session/{session_id}")
async def get_interview_session_info(session_id: str):
    """Get current session info (for debugging)"""
    if session_id not in interview_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = interview_sessions[session_id]

    return {
        "session_id": session_id,
        "skills": session.skills,
        "questions": session.questions,
        "answers_submitted": len(session.answers),
        "current_progress": {
            "detected": sum(1 for s in session.skill_analyzer.skill_status.values() if s["has"]),
            "total": len(session.skills)
        },
        "completed": session.completed
    }


