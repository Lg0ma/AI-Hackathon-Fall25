"""
AI-Powered Blue Collar Skill Interview System
For Construction, Trades, and Blue Collar Job Interviews

Analyzes construction/trade job descriptions, extracts skills, and conducts
real-time voice interviews using Whisper transcription and Mistral AI (via Ollama)

DESIGNED FOR:
- Construction workers
- Trade workers (carpenters, electricians, plumbers, welders)
- General laborers
- Equipment operators
- Manufacturing workers
- Any hands-on, blue collar positions

SETUP:
1. Install dependencies:
   pip install faster-whisper sounddevice numpy requests

2. Install and run Ollama:
   - Download from https://ollama.ai
   - Run in terminal: ollama run mistral:7b
   - Keep it running while using this script

3. Customize the HARDCODED_JOB_DESCRIPTION below for your specific job

USAGE:
1. Run this script: python skill_interview.py
2. The system analyzes the job and extracts required skills (OSHA, tools, etc.)
3. You'll see interview questions
4. Press ENTER and start speaking about your experience
5. The interview runs for 5 minutes
6. Get a report showing which skills you demonstrated

HOW IT WORKS:
- Mistral extracts construction/trade skills from job description
- Whisper transcribes candidate's speech in real-time
- Mistral detects when candidate mentions having each skill
- Accounts for informal language ("I use power tools" = "Power Tool Operation")
- After 5 minutes, shows skills detected vs missing
"""

import json
import time
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import threading

# Import the existing transcriber
from RTtranscribe import StreamingTranscriber

# ============================================================================
# CONFIGURATION
# ============================================================================

# Hardcoded job description (edit this to test different jobs)
HARDCODED_JOB_DESCRIPTION = """
Construction Worker - General Laborer

We are seeking reliable construction workers to join our team for residential and commercial projects.

Requirements:
- 2+ years of experience in construction or related field
- Ability to operate hand tools and power tools safely
- Knowledge of basic carpentry and framing
- Experience with concrete work (pouring, finishing)
- Ability to read and interpret blueprints and building plans
- Valid driver's license and reliable transportation
- Ability to lift 50+ pounds regularly
- Strong attention to detail and safety protocols
- Good communication and teamwork skills
- Punctuality and reliability

Preferred Qualifications:
- OSHA 10 or OSHA 30 certification
- Forklift operation certification
- Experience with drywall installation and finishing
- Electrical or plumbing basics knowledge
- Welding experience
- First aid/CPR certified
- Bilingual (English/Spanish)
"""

# ============================================================================
# FEATURES ENABLED:
# - Automatic skill extraction from job description
# - AI-powered transcription cleanup (fixes Whisper errors)
# - Enhanced skill detection with context awareness
# - Real-time skill tracking during interview
# - Detailed assessment report
# ============================================================================


def extract_json_from_response(text: str) -> Optional[str]:
    """Extract JSON from various response formats (code blocks, plain text, etc.)"""
    import re

    if not text:
        return None

    # Remove common markdown artifacts
    text = text.strip()

    # Try to find JSON in code blocks first
    code_block_patterns = [
        r'```json\s*(\[.*?\])\s*```',
        r'```\s*(\[.*?\])\s*```',
        r'`(\[.*?])`'
    ]

    for pattern in code_block_patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1)

    # Try to find a complete JSON array by counting brackets
    # This handles cases where there's extra text after the array
    start = text.find('[')
    if start != -1:
        bracket_count = 0
        in_string = False
        escape_next = False

        for i in range(start, len(text)):
            char = text[i]

            # Handle string escapes
            if escape_next:
                escape_next = False
                continue

            if char == '\\':
                escape_next = True
                continue

            # Track if we're inside a string
            if char == '"':
                in_string = not in_string
                continue

            # Only count brackets outside of strings
            if not in_string:
                if char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1

                    # Found complete array
                    if bracket_count == 0:
                        return text[start:i+1]

    return None


class OllamaClient:
    """Client for interacting with Ollama API"""

    def __init__(self, base_url="http://localhost:11434", model="mistral:7b"):
        self.base_url = base_url
        self.model = model

    def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """Generate text using Ollama"""
        url = f"{self.base_url}/api/generate"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }

        if system:
            payload["system"] = system

        try:
            response = requests.post(url, json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            return result.get("response", "").strip()
        except requests.exceptions.RequestException as e:
            print(f"Error communicating with Ollama: {e}")
            return ""

    def check_connection(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            return response.status_code == 200
        except:
            return False

    def cleanup_transcription(self, text: str) -> str:
        """Clean up transcription errors using AI"""
        if not text or len(text.strip()) < 5:
            return text

        system_prompt = """You are a transcription correction assistant.
Your task is to fix any transcription errors in the text while preserving the original meaning.
Common issues to fix:
- Incorrect word recognition (homophones, similar sounding words)
- Missing punctuation
- Run-on sentences
- Capitalization errors
- Technical terms that may have been misheard

Return ONLY the corrected text without any explanation or commentary."""

        user_prompt = f"""Fix any transcription errors in this text:

"{text}"

Corrected text:"""

        try:
            cleaned = self.generate(user_prompt, system=system_prompt)
            return cleaned if cleaned else text
        except:
            # If cleanup fails, return original text
            return text


class SkillAnalyzer:
    """Analyzes job descriptions and detects skills in conversation"""

    def __init__(self, ollama_client: OllamaClient):
        self.client = ollama_client
        self.skills = []
        self.skill_status = {}  # skill_name -> {"has": bool, "detected_in": []}

    def analyze_job_description(self, job_description: str) -> List[Dict[str, str]]:
        """
        Extract skills from job description and add well-known skills
        Returns: List of {"skill": str, "category": str}
        """
        print("\n Analyzing job description...")

        system_prompt = """You are an expert job analyst and recruiter specializing in blue collar and construction jobs.

TASK:
1. Extract ALL skills explicitly mentioned in the job description
2. Add well-known industry-standard skills commonly required for this type of role
3. Include both technical hands-on skills and soft skills
4. Categorize each skill appropriately

CATEGORIES FOR BLUE COLLAR/CONSTRUCTION JOBS:
- Trade Skill (e.g., Carpentry, Welding, Plumbing, Electrical Work)
- Equipment Operation (e.g., Forklift, Excavator, Power Tools, Hand Tools)
- Safety & Certification (e.g., OSHA 10, OSHA 30, First Aid, CPR)
- Technical Skill (e.g., Blueprint Reading, Measuring, Concrete Finishing)
- Physical Ability (e.g., Heavy Lifting, Standing for Long Periods, Physical Stamina)
- Soft Skill (e.g., Communication, Teamwork, Reliability, Problem-solving)
- License/Credential (e.g., Driver's License, CDL, Trade License)
- Language (e.g., English, Spanish, Bilingual)

OUTPUT FORMAT:
Return ONLY a valid JSON array with NO additional text or explanation:
[
  {"skill": "Carpentry", "category": "Trade Skill"},
  {"skill": "Forklift Operation", "category": "Equipment Operation"},
  {"skill": "OSHA 10", "category": "Safety & Certification"},
  {"skill": "Blueprint Reading", "category": "Technical Skill"}
]

IMPORTANT:
- Use specific skill names (e.g., "Power Tool Operation" not just "tools")
- Extract 10-20 skills total
- Return ONLY the JSON array, no markdown, no code blocks, no explanation
- Do NOT add text before or after the array"""

        user_prompt = f"""Job Description:
{job_description}

Extract and list ALL required skills (both mentioned and commonly expected for this role)."""

        response = self.client.generate(user_prompt, system=system_prompt)

        # Debug: show raw response
        print(f"   [DEBUG] Raw response length: {len(response)} chars")

        # Try to extract JSON from response
        json_text = extract_json_from_response(response)

        if json_text:
            try:
                # Try to parse extracted JSON
                skills = json.loads(json_text)

                # Validate it's a list
                if not isinstance(skills, list):
                    print(" Warning: Response is not a list, using fallback...")
                    return self._fallback_skill_extraction(response)

                # Validate each item has required fields
                valid_skills = []
                for item in skills:
                    if isinstance(item, dict) and "skill" in item:
                        if "category" not in item:
                            item["category"] = "General"
                        valid_skills.append(item)

                if not valid_skills:
                    print(" Warning: No valid skills found, using fallback...")
                    return self._fallback_skill_extraction(response)

                self.skills = valid_skills

                # Initialize skill status
                for skill_item in valid_skills:
                    skill_name = skill_item["skill"]
                    self.skill_status[skill_name] = {
                        "has": False,
                        "detected_in": [],
                        "category": skill_item.get("category", "General")
                    }

                print(f"✅ Found {len(valid_skills)} skills")
                return valid_skills

            except json.JSONDecodeError as e:
                print(f" Warning: JSON parse error: {e}")
                print(f"   Extracted text: {json_text[:100]}...")
                return self._fallback_skill_extraction(response)
        else:
            print(" Warning: Could not extract JSON from response")
            print(f"   Response preview: {response[:200]}...")
            return self._fallback_skill_extraction(response)

    def _fallback_skill_extraction(self, text: str) -> List[Dict[str, str]]:
        """Fallback method to extract skills if JSON parsing fails"""
        import re

        print("   Using fallback extraction...")
        skills = []
        lines = text.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('[') or line.startswith('{') or line.startswith('}') or line.startswith(']'):
                continue

            # Try pattern: "skill: category" or "skill - category"
            if ':' in line or '-' in line:
                # Remove common prefixes like numbers, bullets, etc.
                cleaned_line = re.sub(r'^[\d\.\-\*\•\>\+]+\s*', '', line)

                # Split on : or -
                if ':' in cleaned_line:
                    parts = cleaned_line.split(':', 1)
                elif ' - ' in cleaned_line:
                    parts = cleaned_line.split(' - ', 1)
                else:
                    parts = [cleaned_line, "General"]

                if len(parts) >= 2:
                    skill = parts[0].strip(' -"\'()[]{}')
                    category = parts[1].strip(' -"\'()[]{}')

                    # Only add if skill name looks valid (not too long, not empty)
                    if skill and 2 <= len(skill) <= 50 and not skill.lower().startswith('note'):
                        skills.append({"skill": skill, "category": category})

            # Try pattern: just skill names in a list
            elif len(line) < 50 and not any(word in line.lower() for word in ['the', 'this', 'that', 'are', 'is', 'was', 'were']):
                # Remove list markers
                skill = re.sub(r'^[\d\.\-\*\•\>\+]+\s*', '', line).strip(' -"\'()[]{}')
                if skill and 2 <= len(skill) <= 50:
                    skills.append({"skill": skill, "category": "General"})

        # If still no skills found, use hardcoded construction skills as last resort
        if not skills:
            print("   WARNING: Could not extract any skills, using construction defaults...")
            skills = [
                {"skill": "Hand Tool Operation", "category": "Equipment Operation"},
                {"skill": "Power Tool Operation", "category": "Equipment Operation"},
                {"skill": "Basic Carpentry", "category": "Trade Skill"},
                {"skill": "Concrete Work", "category": "Trade Skill"},
                {"skill": "Blueprint Reading", "category": "Technical Skill"},
                {"skill": "Heavy Lifting (50+ lbs)", "category": "Physical Ability"},
                {"skill": "OSHA Safety Training", "category": "Safety & Certification"},
                {"skill": "Driver's License", "category": "License/Credential"},
                {"skill": "Teamwork", "category": "Soft Skill"},
                {"skill": "Communication", "category": "Soft Skill"},
                {"skill": "Reliability", "category": "Soft Skill"},
                {"skill": "Attention to Detail", "category": "Soft Skill"}
            ]

        self.skills = skills
        for skill_item in skills:
            skill_name = skill_item["skill"]
            self.skill_status[skill_name] = {
                "has": False,
                "detected_in": [],
                "category": skill_item.get("category", "General")
            }

        print(f"   Extracted {len(skills)} skills via fallback")
        return skills

    def generate_questions(self) -> List[str]:
        """Generate questions to ask about each skill"""
        print(" Generating interview questions...")

        # Format skills with categories for better question generation
        skills_formatted = "\n".join([
            f"- {s['skill']} ({s['category']})"
            for s in self.skills
        ])

        system_prompt = """You are an expert construction and blue collar job interviewer.

TASK: Create one natural, conversational question for each skill that:
1. Encourages the candidate to demonstrate their hands-on experience
2. Is simple and straightforward (not overly formal)
3. Feels natural in a conversation
4. Asks for real examples from past work

QUESTION TYPES:
- Trade skills: "Tell me about your experience with [skill]."
- Equipment: "Have you operated [skill] before? How long?"
- Safety/Certifications: "Do you have [skill]? When did you get it?"
- Physical abilities: "Are you comfortable with [skill]?"
- Soft skills: "How would you describe your [skill]?"
- Licenses: "Do you currently have a valid [skill]?"

Keep questions simple and direct - these are for blue collar workers, not corporate interviews.

OUTPUT: Return ONLY a valid JSON array with one question per skill.
NO markdown, NO code blocks, NO explanation - just the JSON array.
Do NOT add text before or after the array."""

        user_prompt = f"""Create interview questions for these skills:

{skills_formatted}

Return a JSON array of questions (one per skill) in the same order:
["question 1", "question 2", ...]"""

        response = self.client.generate(user_prompt, system=system_prompt)

        # Try to extract JSON from response
        json_text = extract_json_from_response(response)

        if json_text:
            try:
                questions = json.loads(json_text)

                # Validate it's a list
                if isinstance(questions, list) and all(isinstance(q, str) for q in questions):
                    print(f"✅ Generated {len(questions)} questions")
                    return questions
                else:
                    print(" Warning: Invalid question format, using generic questions")
            except json.JSONDecodeError as e:
                print(f" Warning: JSON parse error in questions: {e}")
        else:
            print(" Warning: Could not extract JSON from question response")

        # Fallback: generic questions
        print("   Creating generic questions...")
        return [f"Can you tell me about your experience with {s['skill']}?" for s in self.skills]

    def detect_skills_in_text(self, text: str, timestamp: str, cleaned_text: str = None) -> List[str]:
        """
        Analyze transcribed text to detect if candidate mentioned having any skills
        Returns list of detected skills
        """
        if not self.skills or not text:
            return []

        # Use cleaned text if provided, otherwise use original
        analysis_text = cleaned_text if cleaned_text else text

        # Create detailed skills list with categories for better detection
        skills_with_categories = [f"{s['skill']} ({s['category']})" for s in self.skills]
        skills_list = "\n- ".join(skills_with_categories)

        system_prompt = """You are an expert at analyzing blue collar and construction worker interviews.

Your task is to identify which skills from the provided list the candidate has demonstrated or claimed to possess.

DETECTION RULES FOR CONSTRUCTION/BLUE COLLAR:
1. Explicit claims: "I have", "I know how to", "I can", "I've done", "I'm certified in"
2. Experience mentions: "I worked with", "I operated", "I built", "I installed", "I've been doing"
3. Years/duration: "5 years of", "I've been a carpenter for"
4. Match skills flexibly:
   - "I use power tools" → "Power Tool Operation"
   - "I can drive a forklift" → "Forklift Operation"
   - "I have my OSHA card" → "OSHA 10" or "OSHA 30"
   - "I'm a carpenter" → "Carpentry"
   - "I can lift heavy stuff" → "Heavy Lifting"
   - "I read plans" or "blueprints" → "Blueprint Reading"
5. Licenses: "I have a driver's license", "I have a CDL", "I'm licensed"
6. Soft skills: "I'm reliable", "I show up on time", "I work well with others"

Be generous - construction workers may not use formal terminology.
Match based on meaning, not exact wording.

Return ONLY a valid JSON array of exact skill names from the list (just the skill, not the category).
If no skills detected, return: []
Do NOT add explanations or text outside the array."""

        user_prompt = f"""AVAILABLE SKILLS TO DETECT:
- {skills_list}

CANDIDATE'S STATEMENT:
"{analysis_text}"

Based on this statement, which skills from the list above does the candidate have?
Return JSON array with exact skill names only:"""

        response = self.client.generate(user_prompt, system=system_prompt)

        detected_skills = []

        # Try to extract JSON from response
        json_text = extract_json_from_response(response)

        if json_text:
            try:
                detected_skills = json.loads(json_text)

                # Validate it's a list
                if not isinstance(detected_skills, list):
                    detected_skills = []

            except json.JSONDecodeError:
                # Fallback to keyword matching
                detected_skills = []

        # If JSON parsing failed, use simple keyword matching
        if not detected_skills:
            text_lower = analysis_text.lower()
            for skill_item in self.skills:
                skill_name = skill_item["skill"]
                if skill_name.lower() in text_lower:
                    detected_skills.append(skill_name)

        # Update skill status for detected skills
        for skill_name in detected_skills:
            if skill_name in self.skill_status:
                if not self.skill_status[skill_name]["has"]:
                    self.skill_status[skill_name]["has"] = True
                    print(f"    ✓ Detected skill: {skill_name}")

                self.skill_status[skill_name]["detected_in"].append({
                    "timestamp": timestamp,
                    "text": text
                })

        return detected_skills

    def get_report(self) -> Dict:
        """Generate final report of skills"""
        skills_has = []
        skills_missing = []

        for skill_item in self.skills:
            skill_name = skill_item["skill"]
            category = skill_item["category"]
            status = self.skill_status[skill_name]

            skill_info = {
                "skill": skill_name,
                "category": category,
                "detected_count": len(status["detected_in"])
            }

            if status["has"]:
                skills_has.append(skill_info)
            else:
                skills_missing.append(skill_info)

        return {
            "total_skills": len(self.skills),
            "skills_has": skills_has,
            "skills_missing": skills_missing,
            "coverage": len(skills_has) / len(self.skills) * 100 if self.skills else 0
        }


class SkillInterviewTranscriber(StreamingTranscriber):
    """
    Enhanced transcriber that integrates skill detection
    Runs for 5 minutes and analyzes each chunk for skills
    """

    def __init__(self, skill_analyzer: SkillAnalyzer, duration_minutes=5, enable_cleanup=True, **kwargs):
        super().__init__(**kwargs)
        self.skill_analyzer = skill_analyzer
        self.duration_minutes = duration_minutes
        self.enable_cleanup = enable_cleanup  # Toggle for AI text cleanup
        self.start_time = None
        self.end_time = None

    def transcribe_chunk(self, audio_data):
        """Override to add skill detection with optional text cleanup"""
        text = super().transcribe_chunk(audio_data)

        if text:
            # Remove language emoji if present
            clean_text = text
            if text.startswith("🇺🇸") or text.startswith("🇪🇸") or text.startswith("🌐"):
                clean_text = text[2:].strip()

            # Get timestamp
            timestamp = datetime.now().strftime("%H:%M:%S")

            corrected_text = clean_text

            # Step 1: (Optional) Clean up transcription errors using AI
            if self.enable_cleanup:
                print("  🧹 Cleaning transcription...", end="", flush=True)
                corrected_text = self.skill_analyzer.client.cleanup_transcription(clean_text)

                if corrected_text != clean_text:
                    print(f" Fixed!")
                    print(f"     Original: {clean_text}")
                    print(f"     Corrected: {corrected_text}")
                else:
                    print(" No changes needed")

            # Step 2: Detect skills in the (cleaned) text
            print("  🔍 Analyzing for skills...", end="", flush=True)
            detected = self.skill_analyzer.detect_skills_in_text(
                clean_text,
                timestamp,
                cleaned_text=corrected_text if self.enable_cleanup else None
            )

            if detected:
                print(f" Found {len(detected)} skill(s)!")
            else:
                print(" No new skills detected")

        return text

    def start(self):
        """Start with timer"""
        self.start_time = datetime.now()
        self.end_time = self.start_time + timedelta(minutes=self.duration_minutes)

        print("\n" + "="*60)
        print("  SKILL INTERVIEW SESSION")
        print("="*60)
        print(f"Duration: {self.duration_minutes} minutes")
        print(f"Skills to detect: {len(self.skill_analyzer.skills)}")
        print(f"Start time: {self.start_time.strftime('%H:%M:%S')}")
        print(f"End time: {self.end_time.strftime('%H:%M:%S')}")
        print("\n Speak clearly and mention your skills/experience")
        print("⏱ Interview will automatically end after 5 minutes")
        print(" Press Ctrl+C to stop early\n")
        print("="*60 + "\n")

        # Start timer thread
        timer_thread = threading.Thread(target=self._timer_thread, daemon=True)
        timer_thread.start()

        # Start normal transcription
        self.is_recording = True

        # Start processing thread
        self.transcription_thread = threading.Thread(
            target=self.process_audio_stream,
            daemon=True
        )
        self.transcription_thread.start()

        # Start audio stream
        import sounddevice as sd
        with sd.InputStream(
            samplerate=self.sample_rate,
            channels=1,
            callback=self.audio_callback,
            blocksize=int(self.sample_rate * 0.1)
        ):
            try:
                while self.is_recording:
                    time.sleep(0.1)
            except KeyboardInterrupt:
                self.stop()

    def _timer_thread(self):
        """Monitor time and stop after duration"""
        while self.is_recording:
            now = datetime.now()
            if now >= self.end_time:
                print(f"\n\n Time's up! {self.duration_minutes} minutes completed")
                self.stop()
                break

            # Show remaining time every 30 seconds
            remaining = (self.end_time - now).total_seconds()
            if int(remaining) % 30 == 0 and remaining > 0:
                mins = int(remaining // 60)
                secs = int(remaining % 60)
                print(f"\n[Time remaining: {mins}m {secs}s]")

            time.sleep(1)

    def stop(self):
        """Stop and show final report"""
        print("\n\n" + "="*60)
        print(" Stopping interview...")

        self.is_recording = False

        if self.transcription_thread:
            self.transcription_thread.join(timeout=2)

        # Generate and display report
        self._show_report()

    def _show_report(self):
        """Display final skill assessment report"""
        report = self.skill_analyzer.get_report()

        print("\n" + "="*60)
        print("  SKILL ASSESSMENT REPORT")
        print("="*60)
        print(f"Total Skills Assessed: {report['total_skills']}")
        print(f"Skills Detected: {len(report['skills_has'])} ({report['coverage']:.1f}%)")
        print(f"Skills Missing: {len(report['skills_missing'])}")
        print("="*60)

        # Skills the candidate HAS
        if report['skills_has']:
            print("\n SKILLS DETECTED:")
            print("-" * 60)
            for skill_info in report['skills_has']:
                skill = skill_info['skill']
                category = skill_info['category']
                count = skill_info['detected_count']
                print(f"  [{category}] {skill} (mentioned {count}x)")

        # Skills MISSING
        if report['skills_missing']:
            print("\n SKILLS NOT DETECTED:")
            print("-" * 60)
            for skill_info in report['skills_missing']:
                skill = skill_info['skill']
                category = skill_info['category']
                print(f"  [{category}] {skill}")

        print("\n" + "="*60)
        print(" Interview Complete\n")


def main():
    """Main interview workflow"""

    # Step 1: Initialize Ollama client
    print("\n" + "="*60)
    print("  AI SKILL INTERVIEW SYSTEM")
    print("="*60)

    ollama = OllamaClient(model="mistral:7b")

    print("\n🔍 Checking Ollama connection...")
    if not ollama.check_connection():
        print("❌ ERROR: Cannot connect to Ollama at http://localhost:11434")
        print("\n" + "="*60)
        print("  SETUP REQUIRED")
        print("="*60)
        print("\nPlease complete these steps:")
        print("\n1. Install Ollama:")
        print("   Download from: https://ollama.ai")
        print("\n2. Start Ollama (in a separate terminal):")
        print("   Run: ollama serve")
        print("\n3. Pull the Mistral model:")
        print("   Run: ollama pull mistral:7b")
        print("\n4. Verify setup:")
        print("   Run: python check_ollama.py")
        print("\nThen try running this script again.")
        print("="*60)
        return

    print("✅ Ollama connected successfully!")

    # Step 2: Use hardcoded job description
    print("\n" + "="*60)
    print("STEP 1: JOB DESCRIPTION (HARDCODED)")
    print("="*60)

    job_description = HARDCODED_JOB_DESCRIPTION
    print("\nUsing hardcoded job description:")
    print("-" * 60)
    print(job_description)
    print("-" * 60)

    # Step 3: Analyze job description
    print("\n" + "="*60)
    print("STEP 2: SKILL ANALYSIS")
    print("="*60)

    analyzer = SkillAnalyzer(ollama)
    skills = analyzer.analyze_job_description(job_description)

    if not skills:
        print(" ERROR: Could not extract skills")
        return

    # Display skills
    print("\nSkills identified:")
    for i, skill_item in enumerate(skills, 1):
        print(f"  {i}. [{skill_item['category']}] {skill_item['skill']}")

    # Step 4: Generate questions
    print("\n" + "="*60)
    print("STEP 3: INTERVIEW QUESTION GENERATION")
    print("="*60)

    questions = analyzer.generate_questions()

    print(f"\n📋 Generated {len(questions)} interview questions")
    print("="*60)

    # Display all questions
    print("\nInterview Questions (These are what you should answer):")
    print("-" * 60)
    for i, q in enumerate(questions, 1):
        print(f"\n{i}. {q}")

    print("\n" + "-" * 60)
    print("\n💡 TIP: During the interview, answer these questions naturally")
    print("   The AI will detect when you mention having each skill")

    # Step 5: Start interview
    print("\n" + "="*60)
    print("STEP 4: LIVE INTERVIEW")
    print("="*60)

    input("\nPress ENTER to start the 5-minute interview session...")

    # Transcriber configuration
    CONFIG = {
        "model_name": "large-v3",  # Options: tiny, base, small, medium, large-v2, large-v3
                               # Smaller = faster, Larger = more accurate
        "sample_rate": 16000,
        "chunk_duration": 3,
        "silence_threshold": 0.01,
        "device": "cuda"  # "cuda" for GPU, "cpu" for CPU
    }

    # Interview configuration
    INTERVIEW_CONFIG = {
        "duration_minutes": 5,      # Interview length
        "enable_cleanup": True      # Use AI to fix transcription errors
                                    # Set to False for faster processing
    }

    # Create interview transcriber
    interview = SkillInterviewTranscriber(
        skill_analyzer=analyzer,
        **INTERVIEW_CONFIG,
        **CONFIG
    )

    try:
        interview.start()
    except Exception as e:
        print(f" Error: {e}")
        interview.stop()


if __name__ == "__main__":
    main()
