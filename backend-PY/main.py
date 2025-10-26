from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import shutil
import os
from faster_whisper import WhisperModel
from fastapi.middleware.cors import CORSMiddleware
import json
import bcrypt
import asyncio
from typing import List, Dict

# Import AI routes and classes
from ai_routes import router as ai_router
from skill_interview import OllamaClient, SkillAnalyzer

from routers.jobs_router import router as jobs_router

# --- FastAPI App Initialization ---
app = FastAPI()

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
app.include_router(jobs_router, prefix="/api", tags=["jobs"])
app.include_router(ai_router)
print("[OK] AI routes registered at /ai")

# --- AI Model Loading ---
print("Loading faster-whisper 'large-v3' model on CUDA...")
model = WhisperModel("large-v3", device="cuda", compute_type="float16")
print("✅ Model loaded successfully on CUDA.")

# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_json(self, client_id: str, data: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(data)

manager = ConnectionManager()

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
    full_name: str
    phone_number: str
    postal_code: str
    password: str

@app.post("/create-account")
async def create_account(account: Account):
    responses_data = load_responses()
    
    phone_number = "".join(filter(str.isdigit, account.phone_number))
    
    existing_user = next((u for u in responses_data["users"] if u.get("phone_number") == phone_number), None)
    if existing_user:
        return {"error": "User with this phone number already exists"}

    hashed_password = bcrypt.hashpw(account.password.encode('utf-8'), bcrypt.gensalt())
    
    new_user = {
        "full_name": account.full_name,
        "phone_number": phone_number,
        "postal_code": account.postal_code,
        "password": hashed_password.decode('utf-8'),
        "responses": {}
    }
    
    responses_data["users"].append(new_user)
    save_responses(responses_data)
    
    return {"message": "Account created successfully", "phone_number": phone_number}

# --- Voice-based Q&A Logic ---
QUESTIONS = [
    "What are your skills?",
    "What is your previous work experience?"
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

# --- Real-time Interview WebSocket Endpoint ---
@app.websocket("/ws/interview/{job_id}")
async def websocket_interview(websocket: WebSocket, job_id: str):
    client_id = f"{job_id}_{websocket.client.host}:{websocket.client.port}"
    await manager.connect(websocket, client_id)
    print(f"[WebSocket] Client connected: {client_id}")

    # Initialize SkillAnalyzer for this session
    ollama_client = OllamaClient(model="mistral:7b")
    skill_analyzer = SkillAnalyzer(ollama_client)

    # To store the full transcript for analysis
    full_transcript = []
    temp_audio_path = f"temp_audio_{client_id}.webm"

    try:
        while True:
            audio_data = await websocket.receive_bytes()
            
            # Append audio data to a temporary file
            with open(temp_audio_path, "ab") as f:
                f.write(audio_data)

            # Transcribe the audio file
            segments, _ = model.transcribe(temp_audio_path, beam_size=5)
            transcript = " ".join([s.text for s in segments]).strip()

            if transcript and (not full_transcript or transcript != full_transcript[-1]):
                full_transcript.append(transcript)
                print(f"[WebSocket] Transcript: {transcript}")
                await manager.send_json(client_id, {"type": "transcript", "data": transcript})

                # Analyze for skills
                detected_skills = skill_analyzer.detect_skills_in_text(transcript, "realtime")
                if detected_skills:
                    await manager.send_json(client_id, {"type": "skill_detected", "data": detected_skills})

    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected: {client_id}")
    except Exception as e:
        print(f"[WebSocket] Error for client {client_id}: {e}")
    finally:
        manager.disconnect(client_id)
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        print(f"[WebSocket] Cleaned up resources for client: {client_id}")