# llm_provider.py
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

# Base URL for your friend's running Ollama ser_ver
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL") 
MODEL_NAME = os.getenv("OLLAMA_MODEL")

def query_mistral(prompt: str):
    """
    Sends a text prompt to the remote Ollama server hosting Mistral,
    and returns the model's generated text.
    """
    url = f"{OLLAMA_BASE_URL}/api/generate"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip()

    except Exception as e:
        print(f"[Error] Failed to reach Ollama server: {e}")
        return None


def clean_resume(raw_json: dict) -> dict:
    """
    Sends structured resume data as a prompt and expects cleaned-up JSON-like output.
    """
    prompt = f"""
You are a resume-cleaning assistant. Given this JSON:

{json.dumps(raw_json, indent=2)}

Extract:
- name (full name only)
- phone (only digits or +country code)
- postal_code (ZIP or postal code only)
- skills_summary (3–7 short, generalized skill bullets)

Respond ONLY in JSON with keys: name, phone, postal_code, skills_summary.
    """

    result = query_mistral(prompt)
    if not result:
        return {"error": "Failed to get response from model"}

    # Attempt to parse JSON safely
    try:
        cleaned = json.loads(result)
        return cleaned
    except json.JSONDecodeError:
        # Model might output text before/after JSON; try to extract JSON substring
        try:
            start = result.find("{")
            end = result.rfind("}") + 1
            return json.loads(result[start:end])
        except Exception:
            return {"raw_output": result, "error": "Malformed JSON"}

