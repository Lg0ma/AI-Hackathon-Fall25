from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import shutil
import os

app = FastAPI()

# In-memory storage for user accounts and voice responses
users_db = []
voice_responses_db = {}

# --- Account Creation ---
class User(BaseModel):
    username: str
    email: str
    password: str

@app.post("/create-account")
async def create_account(user: User):
    users_db.append(user)
    return {"message": "Account created successfully"}


# --- Voice-based Information Filling ---

# Define the questions the robot will ask
QUESTIONS = [
    "What is your full name?",
    "What is your phone number?",
    "What is your address?",
    "What are your skills?",
    "What is your previous work experience?"
]

@app.post("/voice-input/{user_id}/{question_id}")
async def handle_voice_input(user_id: str, question_id: int, audio_file: UploadFile = File(...)):
    # --- 1. Save the audio file ---
    file_path = f"temp_audio_{user_id}_{question_id}.wav"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    # --- 2. Transcribe the audio using Whisper (placeholder) ---
    # In a real implementation, you would call the Whisper API here
    # For now, we'll just use the filename as a placeholder for the transcribed text
    transcribed_text = f"(transcribed text for {file_path})"

    # --- 3. Clean up the audio file ---
    os.remove(file_path)

    # --- 4. Save the response ---
    if user_id not in voice_responses_db:
        voice_responses_db[user_id] = {}
    voice_responses_db[user_id][QUESTIONS[question_id]] = transcribed_text

    # --- 5. Determine the next question ---
    next_question_id = question_id + 1
    if next_question_id < len(QUESTIONS):
        return {
            "message": "Response received",
            "next_question": QUESTIONS[next_question_id],
            "next_question_id": next_question_id
        }
    else:
        return {
            "message": "All questions answered",
            "responses": voice_responses_db[user_id]
        }

@app.get("/questions")
async def get_questions():
    return {"questions": QUESTIONS}
