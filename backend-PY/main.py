from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import shutil
import os
import whisper
from fastapi.middleware.cors import CORSMiddleware
import json
import bcrypt

# --- FastAPI App Initialization ---
app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# --- Voice-based Q&A Logic ---
QUESTIONS = [
    "What is your full name?",
    "What is your phone number?",
    "What is your postal code?",
    "What are your skills?",
    "What is your previous work experience?"
]

@app.get("/questions")
async def get_questions():
    return {"questions": QUESTIONS}

class TextInput(BaseModel):
    text: str

@app.post("/text-input/{user_id}/{question_id}")
async def handle_text_input(user_id: str, question_id: int, text_input: TextInput):
    responses_data = load_responses()
    user_entry = next((u for u in responses_data["users"] if u["user_id"] == user_id), None)

    if not user_entry:
        user_entry = {"user_id": user_id, "responses": {}}
        responses_data["users"].append(user_entry)

    user_entry["responses"][QUESTIONS[question_id]] = text_input.text
    
    if question_id == 1: # Phone number question
        phone_number = "".join(filter(str.isdigit, text_input.text))
        existing_user = next((u for u in responses_data["users"] if u.get("phone_number") == phone_number), None)
        if existing_user:
            existing_user["responses"].update(user_entry["responses"])
            responses_data["users"].remove(user_entry)
            user_entry = existing_user
        else:
            user_entry["phone_number"] = phone_number

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
            "prompt_password": True
        }

@app.post("/voice-input/{user_id}/{question_id}")
async def handle_voice_input(user_id: str, question_id: int, audio_file: UploadFile = File(...)):
    file_path = f"temp_audio_{user_id}_{question_id}.wav"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    result = model.transcribe(file_path)
    transcribed_text = result["text"]
    print(f"User '{user_id}' | Q{question_id} | Transcribed: '{transcribed_text}'")

    os.remove(file_path)

    responses_data = load_responses()
    user_entry = next((u for u in responses_data["users"] if u["user_id"] == user_id), None)

    if not user_entry:
        user_entry = {"user_id": user_id, "responses": {}}
        responses_data["users"].append(user_entry)

    user_entry["responses"][QUESTIONS[question_id]] = transcribed_text
    
    if question_id == 1: # Phone number question
        phone_number = "".join(filter(str.isdigit, transcribed_text))
        existing_user = next((u for u in responses_data["users"] if u.get("phone_number") == phone_number), None)
        if existing_user:
            existing_user["responses"].update(user_entry["responses"])
            responses_data["users"].remove(user_entry)
            user_entry = existing_user
        else:
            user_entry["phone_number"] = phone_number

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
            "prompt_password": True
        }

class Password(BaseModel):
    password: str

@app.post("/create-password/{user_id}")
async def create_password(user_id: str, password: Password):
    responses_data = load_responses()
    user_entry = next((u for u in responses_data["users"] if u["user_id"] == user_id), None)

    if not user_entry:
        return {"error": "User not found"}

    hashed_password = bcrypt.hashpw(password.password.encode('utf-8'), bcrypt.gensalt())
    user_entry["password"] = hashed_password.decode('utf-8')
    save_responses(responses_data)

    return {"message": "Password created successfully"}
