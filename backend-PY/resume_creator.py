# resume_creator.py
import os
import re
import json
import requests
from typing import Any, Dict, Optional
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://192.168.0.145:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "mistral:7b")
TIMEOUT_SECONDS = int(os.getenv("OLLAMA_TIMEOUT", "90"))

# -------------------
# Core LLM call
# -------------------
def _ollama_generate(prompt: str) -> Optional[str]:
    """POST to remote Ollama server (Mistral) and return the model's text."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}
    try:
        r = requests.post(url, json=payload, timeout=TIMEOUT_SECONDS)
        r.raise_for_status()
        data = r.json()
        return (data.get("response") or "").strip()
    except Exception as e:
        print(f"[resume_creator] Ollama request failed: {e}")
        return None


# -------------------
# Prompt construction
# -------------------
SYSTEM_DIRECTIVES = """You are an intelligent resume-building assistant for all professions.

Goal:
- Transform short, spoken or written answers into a cohesive, professional resume summary.
- Works for every field: technical, creative, medical, educational, trade, or managerial.

Rules for rewriting and structuring:
1. **Grammar & clarity:** Clean up spelling, grammar, and readability. Avoid filler or slang.
2. **Bullet points:** 
   - If the text mentions several items (skills, technologies, or experiences), list each as its own bullet.
   - Example: “Python, C++, JavaScript” → ["Python", "C++", "JavaScript"]
3. **Proficiency detection:**
   - If a skill or topic appears frequently or is strongly implied across multiple fields (skills + experience), label it as “Proficient in ___”.
   - Example: “built 5 React projects” and “React UI design” → “Proficient in React development”.
4. **Universal adaptability:**
   - Adjust tone and content to the profession (e.g., software → technical wording, nursing → compassionate, management → leadership focus).
5. **JSON output only:** Return strictly structured JSON matching the schema below.
6. **Phone field:** Treat `phone` as a simple identifier; do not modify or include commentary.
7. **Conciseness:** Keep the “summary” short (2–3 sentences) and “work_experience” factual, action-oriented, and in bullet style.
"""

FEW_SHOT = """
Example 1 (Tech)
----------------
Input (raw):
skills="Python, C++, JavaScript, React, backend APIs, database design"
years="about 3 years"
work="built multiple full-stack applications using React and FastAPI; implemented REST APIs; worked with databases and deployment automation"

Output:
{
  "phone": "1234567890",
  "headline": "Full-Stack Developer",
  "years_of_experience": 3,
  "skills": [
    "Python",
    "C++",
    "JavaScript",
    "React",
    "Backend API development",
    "Database design",
    "Proficient in React development"
  ],
  "summary": "Full-stack developer with 3 years of experience building web applications using React and FastAPI. Skilled in backend APIs, databases, and deployment automation.",
  "work_experience": [
    "Developed multiple full-stack applications using React and FastAPI",
    "Implemented REST APIs and optimized database performance",
    "Automated build and deployment processes"
  ]
}

Example 2 (Healthcare)
----------------------
Input (raw):
skills="patient care, charting, vital signs, medication, wound care"
years="5 years"
work="worked in hospital and home health; provided daily care, administered medications, collaborated with nurses, handled wound cleaning"

Output:
{
  "phone": "9876543210",
  "headline": "Registered Nurse",
  "years_of_experience": 5,
  "skills": [
    "Patient care",
    "Charting and documentation",
    "Vital sign monitoring",
    "Medication administration",
    "Wound care",
    "Proficient in patient care"
  ],
  "summary": "Registered nurse with 5 years of experience providing patient care and medication administration in both hospital and home health settings. Recognized for accurate documentation and compassionate service.",
  "work_experience": [
    "Delivered comprehensive care to hospital and home patients",
    "Collaborated with nursing staff and physicians",
    "Administered medications and performed wound management"
  ]
}
""".strip()


def build_prompt(phone: str, skills_text: str, years_text: str, work_text: str) -> str:
    SCHEMA = {
        "phone": "string (identifier only)",
        "headline": "string (2–7 words summarizing strongest expertise)",
        "years_of_experience": "number (total experience; 0 if unclear)",
        "skills": ["string", "..."],  # Each bullet or language separated
        "summary": "string (2–3 sentence professional summary)",
        "work_experience": ["string", "..."]
    }

    raw_payload = {
        "phone": phone,
        "responses": {
            "What are your skills?": skills_text,
            "How many years of experience do you have?": years_text,
            "What is your work experience?": work_text
        }
    }

    return f"""{SYSTEM_DIRECTIVES}

SCHEMA (return JSON matching this exactly):
{json.dumps(SCHEMA, indent=2)}

Few-shot examples (for reference and tone):
{FEW_SHOT}

RAW INPUT:
{json.dumps(raw_payload, ensure_ascii=False, indent=2)}

Return ONLY valid JSON according to the schema above:
"""


# -----------------------
# Public entry function
# -----------------------
def generate_resume_from_speech(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    payload = {
      "phone": "<string>",
      "responses": {
        "What are your skills?": "<string>",
        "How many years of experience do you have?": "<string>",
        "What is your work experience?": "<string>"
      }
    }
    """
    phone = payload.get("phone", "")
    responses = payload.get("responses") or {}
    skills_text = responses.get("What are your skills?", "")
    years_text = responses.get("How many years of experience do you have?", "")
    work_text = responses.get("What is your work experience?", "")

    prompt = build_prompt(phone=phone, skills_text=skills_text, years_text=years_text, work_text=work_text)
    raw = _ollama_generate(prompt)
    if not raw:
        return {"error": "Model did not respond"}

    try:
        out = json.loads(raw)
    except json.JSONDecodeError:
        try:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            out = json.loads(raw[start:end])
        except Exception:
            return {"error": "Malformed model output", "raw": raw}

    # Normalize and finalize data
    exp = out.get("years_of_experience")
    if isinstance(exp, str):
        m = re.search(r"(\d+(?:\.\d+)?)", exp)
        out["years_of_experience"] = float(m.group(1)) if m else 0
    elif not isinstance(exp, (int, float)):
        out["years_of_experience"] = 0

    # Strip spaces and ensure lists are clean
    out["skills"] = [s.strip() for s in (out.get("skills") or []) if isinstance(s, str) and s.strip()]
    out["work_experience"] = [s.strip() for s in (out.get("work_experience") or []) if isinstance(s, str) and s.strip()]
    out["headline"] = (out.get("headline") or "").strip()
    out["summary"] = (out.get("summary") or "").strip()
    out["phone"] = phone  # Keep as-is (identifier)

    return out
