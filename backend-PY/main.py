from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import shutil
import os
import whisper
from fastapi.middleware.cors import CORSMiddleware
import json
import bcrypt

# Import AI routes
from ai_routes import router as ai_router

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

# --- Include AI Routes ---
app.include_router(ai_router)
print("AI routes registered at /ai")

# --- AI Model Loading ---
print("Loading Whisper 'base' model...")
model = whisper.load_model("base")
print("Model loaded successfully.")

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

    result = model.transcribe(file_path)
    transcribed_text = result["text"]
    print(f"User '{phone_number}' | Q{question_id} | Transcribed: '{transcribed_text}'")

    os.remove(file_path)

    responses_data = load_responses()
    user_entry = next((u for u in responses_data["users"] if u.get("phone_number") == phone_number), None)

    if not user_entry:
        return {"error": "User not found"}

    user_entry["responses"][QUESTIONS[question_id]] = transcribed_text
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