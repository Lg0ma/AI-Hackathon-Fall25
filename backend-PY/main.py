from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from database import supabase
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