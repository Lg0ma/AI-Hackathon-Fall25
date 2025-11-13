# AI Systems - Complete Technical Documentation
**Project**: AI-Hackathon-Fall25 - Blue Collar Job Matching Platform
**Generated**: 2025-01-13

---

## Table of Contents
1. [System Overview](#system-overview)
2. [AI Model Stack](#ai-model-stack)
3. [System 1: Resume Generation AI](#system-1-resume-generation-ai)
4. [System 2: Skill Interview AI](#system-2-skill-interview-ai)
5. [System 3: Candidate Rating AI](#system-3-candidate-rating-ai)
6. [System 4: Audio Transcription System](#system-4-audio-transcription-system)
7. [System 5: Interview Grading AI](#system-5-interview-grading-ai)
8. [System 6: Job Matching System](#system-6-job-matching-system)
9. [Data Flow Architecture](#data-flow-architecture)
10. [Prompt Engineering Strategies](#prompt-engineering-strategies)
11. [Error Handling & Validation](#error-handling--validation)

---

## System Overview

This platform uses **6 interconnected AI systems** to automate blue-collar job matching, resume building, and candidate assessment. The architecture is designed specifically for construction, trade, and manufacturing workers who may have limited computer skills.

### Core Technologies
- **Whisper (faster-whisper)**: Speech-to-text transcription
- **Mistral 7B (via Ollama)**: Multi-purpose LLM for analysis, validation, enhancement
- **qwen2.5-coder 7B (via Ollama)**: Code/LaTeX generation for resumes
- **LangChain**: LLM orchestration with structured outputs
- **FastAPI**: REST API backend
- **Supabase (PostgreSQL)**: Database and authentication

### Key Features
✅ **Voice-first interface** - No typing required
✅ **Bilingual support** - English/Spanish auto-detection
✅ **Real-time feedback** - Live skill detection during interviews
✅ **Intelligent validation** - Fixes transcription errors automatically
✅ **PDF resume generation** - Professional LaTeX-based resumes
✅ **AI-powered matching** - Automatic job-to-candidate recommendations

---

## AI Model Stack

### Model 1: faster-whisper (Large-v3)
**Purpose**: Audio transcription
**Configuration**:
```python
WhisperModel("base", device="cpu", compute_type="int8")
```
**Features**:
- Bilingual (English/Spanish auto-detect)
- 16kHz optimization
- Beam size: 5
- Language confidence scoring
- Streaming support (3-second chunks)

**Usage Locations**:
- `main.py` - Global Whisper model
- `interview_room.py` - Interview transcription
- `resume_router.py` - Resume question transcription
- `RTtranscribe.py` - Real-time streaming

### Model 2: Mistral 7B (via Ollama)
**Purpose**: Multi-purpose LLM
**Configuration**:
```python
OllamaClient(model="mistral:7b", base_url="http://localhost:11434")
```
**Use Cases**:
1. Skill extraction from job descriptions
2. Interview question generation
3. Skill detection in conversational text
4. Transcription cleanup (error correction)
5. Keyword analysis for grading
6. Response validation

**API Endpoint**: `http://localhost:11434/api/generate`

### Model 3: qwen2.5-coder 7B (via Ollama)
**Purpose**: Resume accomplishment enhancement
**Configuration**:
```python
ResumeAI(model_name="qwen2.5-coder:7b")
```
**Use Case**: Enhances job accomplishment bullet points to be more professional

### Model 4: Mistral 7B (via LangChain)
**Purpose**: Structured candidate evaluation
**Configuration**:
```python
from langchain_ollama import ChatOllama
ChatOllama(model="mistral:7b", temperature=0)
```
**Output**: Structured Pydantic objects with validation

---

## System 1: Resume Generation AI

### Overview
**File**: `resumeAI.py` (885 lines)
**Purpose**: Generate professional blue-collar resumes from voice interview responses
**Models**: qwen2.5-coder:7b (enhancement), Python (structure)
**Output**: LaTeX → PDF resume

### Architecture

#### Phase 1: Data Validation & Cleaning
```python
def validate_and_clean_all_responses(self, interview_data):
    """
    Cleans all interview responses before processing
    Fixes common transcription errors
    """
```

**Cleaning Operations**:
1. **Email Fixes**:
   - `"and percent"` → `@`
   - `"dot com"` → `.com`
   - Example: `"Luis G31209 and percent gmail.com"` → `"Luis G31209@gmail.com"`

2. **Location Fixes**:
   - `"of pastel texas"` → `"El Paso, Texas"`
   - `"el pastel"` → `"El Paso"`
   - Standardizes format: `"City, State"`

3. **Skills Extraction**:
   ```python
   def _extract_skills_from_text(self, text):
       # Removes: "I know how to", "I can", "I have experience with"
       # Splits by: periods, commas, "and"
       # Filters: sentences (>6 words), filler phrases
       # Returns: ["skill1", "skill2", ...]
   ```
   - Input: `"I know how to operate forklifts, wire welder, and drill"`
   - Output: `["operate forklifts", "wire welder", "drill"]`

4. **Job Title Extraction**:
   ```python
   def _extract_job_title(self, text):
       # Patterns: "I am a X", "I work as X at Y"
       # Removes: company names, articles, filler words
       # Max length: 4 words
   ```
   - Input: `"I work as a Regional Manager at ABC Corp"`
   - Output: `"Regional Manager"`

5. **Validation Logic**:
   ```python
   def is_valid_response(self, response):
       # Strip punctuation: "No." → "no"
       # Invalid: ['no', 'none', 'n/a', 'na', 'nothing', 'nil', 'null']
       # Returns: True/False
   ```

#### Phase 2: Data Normalization
```python
def normalize_interview_data(self, raw_data):
    """
    Converts interview responses to structured resume data
    Filters out invalid jobs (Job 2 with "No" responses)
    """
```

**Job Filtering Logic**:
```python
if self.is_valid_response(company):
    # Only add job if company name is valid
    normalized['work_experience'].append({...})
```

**Result**: If Job 2 has `company: "No."`, it's filtered out completely.

#### Phase 3: AI Enhancement (Optional)
```python
def enhance_accomplishments_with_ai(self, accomplishments):
    """
    Uses qwen2.5-coder:7b to enhance bullet points
    Falls back to original if AI unavailable
    """
```

**AI Prompt**:
```
Enhance these job accomplishments to be more professional and impactful.

Original accomplishments:
- Operated the sawmill chopping wood with axes

Instructions:
- Make more professional and detailed
- Emphasize technical skills and quantifiable results
- Use strong action verbs
- Keep truthful to original
- Return ONLY bullet points, one per line
```

**Example Enhancement**:
- Before: `"Operated the sawmill chopping wood with axes"`
- After: `"Operated industrial sawmill equipment and manual cutting tools to process timber, ensuring quality standards and safety protocols"`

#### Phase 4: LaTeX Template Filling
```python
def fill_template_programmatically(self, resume_data, template_content, enhance=True):
    """
    Fills LaTeX template with validated data
    Python handles structure, AI enhances content
    """
```

**Template Operations**:
1. Replace placeholders: `[Your Full Name]` → Actual name
2. Escape LaTeX characters: `&`, `%`, `$`, `#`, `_`, `{`, `}`, `~`, `^`, `\`
3. Build work experience section dynamically
4. Build skills section with proper LaTeX structure
5. Remove education section if no data
6. Add certifications if available

#### Phase 5: PDF Compilation
```python
def compile_latex_to_pdf(self, tex_file_path):
    """
    Compiles LaTeX to PDF using pdflatex
    Runs twice for proper formatting
    Cleans up auxiliary files (.aux, .log, .out)
    """
```

**Process**:
```bash
pdflatex -interaction=nonstopmode -halt-on-error resume.tex  # First pass
pdflatex -interaction=nonstopmode -halt-on-error resume.tex  # Second pass
rm resume.aux resume.log resume.out  # Cleanup
```

### API Endpoint: POST /resume/generate

**Request**:
```json
{
  "interview_responses": {
    "contact_information": {
      "Q1_full_name": "Luis Gomez",
      "Q2_job_title": "Plumber",
      "Q3_phone_number": "915-227-2188",
      "Q4_email": "Luis G31209 and percent gmail.com",
      "Q5_location": "El Paso, Texas."
    },
    "work_experience_job1": {...},
    "work_experience_job2": {"Q15_company": "No."}, // Filtered out
    "skills": {
      "Q30_technical_skills": "I know how to operate forklifts, wire welder...",
      "Q31_certifications_licenses": "I have a CDL class A license...",
      "Q32_core_competencies": "I am a very good problem solver..."
    }
  }
}
```

**Processing Steps**:
1. `validate_and_clean_all_responses()` - Fix errors
2. `normalize_interview_data()` - Structure data
3. `fill_template_programmatically()` - Generate LaTeX
4. `compile_latex_to_pdf()` - Create PDF
5. Return PDF file

**Response**: PDF file download

### Test Endpoint: POST /resume/test-validation

**Purpose**: Validate that cleaning logic works correctly

**Returns**:
```json
{
  "validation_report": {
    "contact_info": {
      "email_original": "Luis G31209 and percent gmail.com",
      "email_cleaned": "Luis G31209@gmail.com"
    },
    "work_experience": {
      "job2_filtered_out": true,
      "total_jobs_in_resume": 1
    },
    "skills": {
      "technical_skills_original": "I know how to operate...",
      "technical_skills_cleaned": "operate forklifts, wire welder, ..."
    }
  },
  "test_passed": true
}
```

---

## System 2: Skill Interview AI

### Overview
**File**: `skill_interview.py` (1250+ lines)
**Purpose**: Extract skills from job descriptions and conduct AI-powered skill interviews
**Models**: Whisper (transcription) + Mistral 7B (analysis)
**Duration**: 5-minute timed interview

### Architecture Components

#### Component 1: OllamaClient
```python
class OllamaClient:
    """Wrapper for Ollama API"""

    def generate(self, prompt, system=None):
        # POST to http://localhost:11434/api/generate
        # timeout: 120 seconds

    def cleanup_transcription(self, text):
        # Fixes Whisper errors using AI

    def check_connection(self):
        # Verifies Ollama is running
```

**Transcription Cleanup**:
```python
system_prompt = """You are a transcription correction assistant.
Fix:
- Incorrect word recognition (homophones)
- Missing punctuation
- Capitalization errors
- Technical term spelling

Return ONLY the corrected text."""
```

#### Component 2: SkillAnalyzer
```python
class SkillAnalyzer:
    """Extracts and detects skills"""

    def analyze_job_description(self, job_description):
        # Extracts 10-20 skills from job posting
        # Categorizes into 8 categories

    def detect_skills_in_text(self, text, timestamp):
        # Detects when candidate mentions skills
        # Flexible matching (synonyms, related terms)

    def get_report(self):
        # Generates final assessment
```

**Skill Categories**:
1. Trade Skills (carpentry, welding, plumbing)
2. Equipment Operation (forklift, crane, power tools)
3. Safety & Compliance (OSHA, fall protection, PPE)
4. Technical Skills (blueprint reading, measurements)
5. Physical Capabilities (lifting, standing, heights)
6. Soft Skills (teamwork, communication, reliability)
7. Certifications (CDL, licenses, training)
8. Experience (years in trade, specific projects)

#### Phase 1: Skill Extraction

**AI Prompt**:
```
You are an expert at analyzing construction and trade job descriptions.

Extract REQUIRED SKILLS as a JSON array of objects:
[
  {
    "skill": "OSHA 10-hour Certification",
    "category": "Safety & Compliance"
  },
  {
    "skill": "Power Tool Operation",
    "category": "Equipment Operation"
  }
]

Job Description:
{job_description}

Categories: Trade Skills, Equipment Operation, Safety & Compliance,
Technical Skills, Physical Capabilities, Soft Skills, Certifications, Experience

Return ONLY valid JSON array. Extract 10-20 skills minimum.
```

**Output Example**:
```json
[
  {"skill": "Commercial Painting", "category": "Trade Skills"},
  {"skill": "Ladder & Scaffolding Work", "category": "Physical Capabilities"},
  {"skill": "Surface Preparation", "category": "Technical Skills"},
  {"skill": "Interior & Exterior Painting", "category": "Trade Skills"},
  {"skill": "Weather Condition Adaptability", "category": "Physical Capabilities"}
]
```

#### Phase 2: Question Generation

**AI Prompt**:
```
Generate {max_questions} interview questions to assess these skills:
{skills_list}

Requirements:
1. Open-ended questions
2. Encourage candidates to discuss specific experience
3. Use conversational language
4. Focus on real work scenarios
5. Allow detection of multiple skills per answer

Return ONLY the questions, one per line.
```

**Example Questions**:
```
1. Tell me about your experience with commercial painting projects. What types of buildings have you worked on?
2. Describe a typical day when you're preparing surfaces for painting. What tools and techniques do you use?
3. Have you worked on scaffolding or ladders? Walk me through your safety procedures.
4. Tell me about a challenging painting project you completed. What made it difficult?
```

#### Phase 3: Real-Time Interview

**Workflow**:
```python
class SkillInterviewTranscriber:
    def start_interview(self):
        # 5-minute timer starts
        # Displays questions one at a time
        # Records audio continuously

    def process_audio_chunk(self, audio_chunk):
        # Whisper transcribes
        # Mistral cleans up transcription
        # SkillAnalyzer detects skills
        # Updates progress in real-time
```

**Skill Detection Logic**:
```python
def detect_skills_in_text(self, text, timestamp):
    """
    AI-powered flexible skill detection
    """
    system_prompt = """You are analyzing a job candidate's response.

    Detect which skills they mentioned from this list:
    {skill_list}

    Rules:
    - Match informal language ("I paint houses" → "Commercial Painting")
    - Synonyms count ("blueprints" = "blueprint reading")
    - Implied skills count (mentions OSHA → "Safety Awareness")

    Return ONLY skill names detected, comma-separated.
    If none detected: return "NONE"
    """
```

**Example Detection**:
- Text: `"I've been painting commercial buildings for 3 years, mostly interiors. I always follow OSHA guidelines."`
- Detected: `["Commercial Painting", "Interior Painting", "OSHA Compliance", "Safety Awareness"]`

#### Phase 4: Report Generation

**Output**:
```python
{
    "skills_has": [
        {
            "skill": "Commercial Painting",
            "category": "Trade Skills",
            "detected_in": ["00:45", "02:13", "04:20"]
        }
    ],
    "skills_missing": [
        {
            "skill": "Scaffolding Work",
            "category": "Physical Capabilities"
        }
    ],
    "coverage": 0.75,  # 75% of skills detected
    "total_skills": 12,
    "interview_duration": 300  # seconds
}
```

### API Endpoints

#### POST /ai/extract-skills
**Request**:
```json
{
  "job_description": "Commercial Painter needed. Must have 3+ years experience..."
}
```

**Response**:
```json
{
  "skills": [
    {"skill": "Commercial Painting", "category": "Trade Skills"},
    {"skill": "OSHA Compliance", "category": "Safety & Compliance"}
  ],
  "count": 12
}
```

#### POST /ai/generate-questions
**Request**:
```json
{
  "skills": [
    {"skill": "Commercial Painting", "category": "Trade Skills"},
    {"skill": "Power Tool Operation", "category": "Equipment Operation"}
  ],
  "max_questions": 8
}
```

**Response**:
```json
{
  "questions": [
    "Tell me about your experience with commercial painting...",
    "What power tools are you most comfortable using?..."
  ]
}
```

#### POST /ai/detect-skills
**Request**:
```json
{
  "text": "I've painted office buildings for 3 years...",
  "skills": ["Commercial Painting", "Residential Painting"],
  "timestamp": "00:45"
}
```

**Response**:
```json
{
  "detected_skills": ["Commercial Painting"],
  "confidence": 0.9
}
```

---

## System 3: Candidate Rating AI

### Overview
**File**: `rating_agent.py` (80 lines)
**Purpose**: Structured candidate evaluation against job requirements
**Model**: Mistral 7B via LangChain
**Output**: Pydantic-validated evaluation object

### Architecture

#### Pydantic Output Schema
```python
class WorkerEvaluation(BaseModel):
    has_done_this_work_before: bool
    months_experience: int
    skill_level: Literal["Beginner", "Intermediate", "Expert"]
    equipment_used: List[str]
    equipment_match_score: int  # 0-10
    can_do_physical_work: bool
    ready_to_work: bool
    overall_score: int  # 0-100
    recommendation: Literal["YES", "MAYBE", "NO"]
    reason: str
```

#### Evaluation Prompt

```python
system_prompt = """You are an expert construction/trade hiring manager.

Evaluate this candidate against the job requirements.

JOB DESCRIPTION:
{job_description}

CANDIDATE INFO:
{candidate_info}

Provide structured evaluation:
1. Has done this work before? (true/false)
2. Months of experience (0 if none)
3. Skill level (Beginner/Intermediate/Expert)
4. Equipment they've used (list)
5. Equipment match score (0-10, how well their equipment matches job needs)
6. Can do physical work required? (true/false)
7. Ready to work immediately? (true/false)
8. Overall score (0-100)
9. Recommendation (YES, MAYBE, NO)
10. Reason for recommendation (2-3 sentences)

BE FAIR BUT HONEST. Blue collar workers often downplay skills.
If they mention similar work, count it.
"""
```

#### Evaluation Logic

**LangChain Integration**:
```python
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate

llm = ChatOllama(model="mistral:7b", temperature=0)
structured_llm = llm.with_structured_output(WorkerEvaluation)

result = structured_llm.invoke(prompt)
```

**Structured Output Benefits**:
- Type validation (Pydantic)
- Guaranteed fields
- Consistent format
- No JSON parsing errors

#### Scoring Criteria

1. **Experience Matching** (30 points)
   - Has done exact work: 30
   - Has done similar work: 20
   - Has related experience: 10
   - No experience: 0

2. **Equipment Match** (20 points)
   - equipment_match_score * 2

3. **Physical Capability** (20 points)
   - Can do physical work: 20
   - Cannot: 0

4. **Skill Level** (20 points)
   - Expert: 20
   - Intermediate: 15
   - Beginner: 10

5. **Work Readiness** (10 points)
   - Ready to work: 10
   - Not ready: 0

**Final Recommendation**:
- Score ≥ 70 AND ready_to_work: `YES`
- Score 40-69: `MAYBE`
- Score < 40: `NO`

### API Endpoint: POST /ai/evaluate-candidate

**Request**:
```json
{
  "job_description": "Commercial Painter needed. 3+ years experience...",
  "candidate_info": "Luis Gomez. 5 years painting residential and commercial buildings. Knows how to use spray guns, rollers, brushes. OSHA certified."
}
```

**Response**:
```json
{
  "has_done_this_work_before": true,
  "months_experience": 60,
  "skill_level": "Intermediate",
  "equipment_used": ["spray guns", "rollers", "brushes"],
  "equipment_match_score": 9,
  "can_do_physical_work": true,
  "ready_to_work": true,
  "overall_score": 85,
  "recommendation": "YES",
  "reason": "Candidate has 5 years of relevant painting experience with commercial projects. Equipment skills match job requirements. OSHA certification demonstrates safety awareness."
}
```

---

## System 4: Audio Transcription System

### Overview
**File**: `main.py`, `RTtranscribe.py`
**Purpose**: Convert voice to text with bilingual support
**Model**: faster-whisper (large-v3)
**Languages**: English, Spanish (auto-detect)

### Global Whisper Model (main.py)

```python
# Initialize once, use everywhere
model = WhisperModel("base", device="cpu", compute_type="int8")

# Configuration optimized for CPU inference
# - Model: base (74M parameters, good balance)
# - Device: CPU (no GPU required)
# - Compute: int8 (quantized for speed)
```

### Transcription Process

#### Standard Transcription
```python
segments, info = model.transcribe(
    audio_file_path,
    beam_size=5,              # Quality vs speed tradeoff
    task="transcribe",        # Not translate
    language=None             # Auto-detect
)

transcript = " ".join([s.text for s in segments]).strip()
detected_language = info.language  # 'en' or 'es'
confidence = info.language_probability  # 0.0-1.0
```

#### Streaming Transcription (RTtranscribe.py)

```python
class StreamingTranscriber:
    def __init__(self, model_size="base", device="cpu"):
        self.model = WhisperModel(model_size, device=device)
        self.sample_rate = 16000
        self.chunk_duration = 3  # 3-second chunks

    def transcribe_stream(self, audio_stream):
        """Process audio in real-time"""
        for chunk in audio_stream:
            # Buffer 3 seconds of audio
            # Transcribe when buffer full
            # Detect silence (pause detection)
            # Return transcript + language
```

**Streaming Benefits**:
- Real-time feedback during interviews
- Pause detection (automatic question breaks)
- Lower latency than batch processing

### Audio Format Handling

**FFmpeg Integration**:
```python
def convert_to_wav(input_path, output_path):
    """Convert any audio format to 16kHz mono WAV"""
    command = [
        'ffmpeg',
        '-i', input_path,
        '-ar', '16000',  # 16kHz (Whisper optimal)
        '-ac', '1',      # Mono
        '-y',            # Overwrite
        output_path
    ]
    subprocess.run(command, timeout=30)
```

**Supported Formats**:
- WebM (browser recording)
- WAV (standard audio)
- MP3, M4A, FLAC (via FFmpeg)

### Language Detection

```python
# Auto-detect with confidence
info = model.transcribe(audio_file)[1]

if info.language == 'es' and info.language_probability > 0.7:
    # High confidence Spanish
    use_spanish_interface()
elif info.language == 'en':
    # English
    use_english_interface()
else:
    # Low confidence, ask user
    prompt_language_selection()
```

### Transcription Cleanup (AI-powered)

**Mistral Integration**:
```python
def cleanup_transcription(text):
    """Fix Whisper errors using Mistral"""

    system_prompt = """Fix transcription errors:
    - Homophones (there/their/they're)
    - Missing punctuation
    - Capitalization
    - Technical terms

    Return ONLY corrected text."""

    corrected = ollama_client.generate(text, system=system_prompt)
    return corrected
```

**Example**:
- Original: `"i work at the construction sight for tree years"`
- Cleaned: `"I work at the construction site for three years."`

### API Endpoint: POST /resume/transcribe

**Request**: Multipart form with audio file

**Response**:
```json
{
  "transcript": "I am a welder with 5 years of experience",
  "language": "en",
  "confidence": 0.95
}
```

---

## System 5: Interview Grading AI

### Overview
**File**: `interview_room.py` (570 lines)
**Purpose**: Grade interview answers using keyword detection
**Model**: Mistral 7B (analysis)
**Method**: Flexible keyword matching with AI assistance

### Architecture

#### Grading Parameters
```python
PASS_THRESHOLD = 0.40  # 40% keywords must be detected
```

#### Keyword Detection Logic

**Step 1: Extract Expected Keywords**
```python
expected_keywords = [
    "concrete", "rebar", "foundation",
    "power tools", "measurements", "safety"
]
```

**Step 2: Transcribe Answer**
```python
segments, info = whisper_model.transcribe(audio_file)
transcript = " ".join([s.text for s in segments])
```

**Step 3: AI Cleanup**
```python
cleaned_transcript = ollama_client.cleanup_transcription(transcript)
```

**Step 4: Flexible Keyword Analysis**

**AI Prompt**:
```python
system_prompt = """You are grading an interview answer.

EXPECTED KEYWORDS:
{keyword_list}

CANDIDATE'S ANSWER:
{transcript}

Analyze which keywords were mentioned. Be flexible:
- Synonyms count ("cement" = "concrete")
- Related terms count ("I frame houses" includes "carpentry")
- Implied skills count ("I use power tools" includes "power tool operation")

Return JSON:
{
    "detected": ["keyword1", "keyword2"],
    "missing": ["keyword3"],
    "detection_rate": 0.67,
    "explanation": "Candidate mentioned..."
}
"""
```

**Step 5: Pass/Fail Decision**
```python
if detection_rate >= PASS_THRESHOLD:
    result = "PASS"
    feedback = "Great job! You demonstrated understanding of..."
else:
    result = "FAIL"
    feedback = "You covered some topics, but please also mention..."
```

### Grading Example

**Question**: "Tell me about your experience with concrete work."

**Expected Keywords**: `["concrete", "rebar", "forms", "finishing", "curing"]`

**Candidate Answer**:
```
"I've poured foundations for residential buildings. I know how to set up
formwork and place steel reinforcement before the pour. After pouring,
I make sure the surface is smooth and it cures properly."
```

**AI Analysis**:
```json
{
  "detected": ["concrete", "forms", "rebar", "finishing", "curing"],
  "missing": [],
  "detection_rate": 1.0,
  "explanation": "Candidate mentioned all key aspects: formwork (forms), steel reinforcement (rebar), pouring (concrete), surface finishing (finishing), and proper curing (curing)."
}
```

**Result**: `PASS` (100% keywords detected)

### Flexible Matching Examples

1. **Synonym Matching**:
   - Expected: `"power tools"`
   - Said: `"drills and saws"`
   - AI: ✅ MATCH (power tools include drills and saws)

2. **Implied Skills**:
   - Expected: `"safety protocols"`
   - Said: `"I always wear my PPE and follow OSHA rules"`
   - AI: ✅ MATCH (demonstrates safety awareness)

3. **Related Terms**:
   - Expected: `"blueprint reading"`
   - Said: `"I can read construction plans"`
   - AI: ✅ MATCH (synonymous terms)

### API Endpoint: POST /interview-room/transcribe-and-analyze

**Request**:
```json
{
  "audio_file": "<binary>",
  "question": "Tell me about your concrete work experience",
  "expected_keywords": ["concrete", "rebar", "forms", "finishing", "curing"]
}
```

**Response**:
```json
{
  "transcript": "I've poured foundations...",
  "is_correct": true,
  "feedback": "Great job! You demonstrated understanding of concrete work including formwork, reinforcement, and curing.",
  "detected_keywords": ["concrete", "rebar", "forms", "finishing", "curing"],
  "missing_keywords": [],
  "detection_rate": 1.0
}
```

---

## System 6: Job Matching System

### Overview
**File**: `inbox_matching.py` (120 lines)
**Purpose**: Automatically match jobs to qualified candidates
**Trigger**: Background task when new job is posted
**Model**: Rating Agent (Mistral 7B via LangChain)

### Matching Architecture

#### Trigger Point
```python
# In jobs_router.py
@router.post("/postjob")
async def create_job(job: JobCreate):
    # 1. Insert job to database
    job_data = supabase.table("job_listings").insert({...})

    # 2. Trigger background matching
    asyncio.create_task(
        inbox_matching.match_job_to_users(job_id, job_description)
    )

    return {"message": "Job created, matching in progress"}
```

#### Matching Process

**Step 1: Fetch All Candidates**
```python
async def match_job_to_users(job_id, job_description):
    # Get all users with resume text
    response = supabase.table("profiles")\
        .select("id, full_name, resume_text")\
        .not_.is_("resume_text", None)\
        .execute()

    users = response.data
```

**Step 2: Evaluate Each Candidate**
```python
for user in users:
    candidate_info = f"""
    Name: {user['full_name']}
    Resume: {user['resume_text']}
    """

    # Use Rating Agent
    evaluation = rating_agent.evaluate_worker(
        job_description=job_description,
        candidate_info=candidate_info
    )
```

**Step 3: Apply Matching Criteria**
```python
# Match if:
# - Overall score >= 70 OR
# - Recommendation is "YES"

if evaluation.overall_score >= 70 or evaluation.recommendation == "YES":
    # Add to user's inbox
    supabase.table("inbox").insert({
        "user_id": user['id'],
        "job_id": job_id,
        "status": "new",
        "match_score": evaluation.overall_score,
        "match_reason": evaluation.reason
    }).execute()
```

**Step 4: User Sees Matches**
```python
# User's inbox endpoint
@router.get("/inbox")
async def get_inbox(user_id: str):
    matches = supabase.table("inbox")\
        .select("*, job_listings(*), employer(*)")\
        .eq("user_id", user_id)\
        .eq("status", "new")\
        .order("match_score", desc=True)\
        .execute()

    return matches.data
```

### Matching Criteria Examples

#### Scenario 1: Perfect Match
```python
Job: "Commercial Painter, 3+ years experience, OSHA certified"
Candidate: "5 years painting commercial buildings, OSHA 30-hour card"

Evaluation:
{
  "overall_score": 95,
  "recommendation": "YES",
  "reason": "Candidate exceeds experience requirements and has required OSHA certification."
}

Result: ✅ Added to inbox with score 95
```

#### Scenario 2: Marginal Match
```python
Job: "Experienced Welder, TIG/MIG welding, 5+ years"
Candidate: "2 years welding, MIG only, learning TIG"

Evaluation:
{
  "overall_score": 60,
  "recommendation": "MAYBE",
  "reason": "Candidate has relevant welding experience but less than required years and limited to MIG."
}

Result: ❌ Not added (score < 70 and not "YES")
```

#### Scenario 3: Experience Overcomes Gaps
```python
Job: "Electrician, Journeyman license required"
Candidate: "15 years electrical work, no formal license but extensive commercial projects"

Evaluation:
{
  "overall_score": 75,
  "recommendation": "YES",
  "reason": "Extensive practical experience compensates for lack of formal license. Candidate should pursue licensing."
}

Result: ✅ Added to inbox (recommendation "YES" overrides threshold)
```

### Inbox Display (Frontend)

**User's Inbox Page**:
```typescript
// Displays matched jobs sorted by score
[
  {
    job_id: "123",
    job_title: "Commercial Painter",
    company: "ABC Construction",
    match_score: 95,
    match_reason: "Candidate exceeds experience requirements...",
    status: "new"
  },
  {
    job_id: "124",
    job_title: "Residential Painter",
    company: "XYZ Painting",
    match_score: 80,
    match_reason: "Strong painting background with residential projects...",
    status: "new"
  }
]
```

**Actions**:
- **View Details** → Shows full job description
- **Apply** → Updates status to "applied"
- **Dismiss** → Updates status to "dismissed"

---

## Data Flow Architecture

### Complete User Journey

#### Journey 1: New User → Resume → Job Match

```
1. User Registration
   Frontend: CreateAccount.tsx
   ↓
   POST /create-account
   ↓
   Supabase Auth: Create user
   ↓
   profiles table: Insert profile
   ↓
   User logged in

2. Resume Building
   Frontend: ResumePage.tsx → ResumeQuestionRoom.tsx
   ↓
   For each question:
     - Record audio → POST /resume/transcribe
       → Whisper: Transcribe
       → Return transcript
     ↓
     - Validate response → POST /resume/validate-response
       → Mistral: Extract/format answer
       → Return validated answer
   ↓
   All questions answered
   ↓
   POST /resume/generate
   ↓
   ResumeAI:
     1. validate_and_clean_all_responses()
     2. normalize_interview_data()
     3. fill_template_programmatically()
     4. enhance_accomplishments_with_ai() [Ollama]
     5. compile_latex_to_pdf()
   ↓
   PDF resume generated
   ↓
   resume_text stored in profiles table

3. Employer Posts Job
   Frontend: CreateJobPosting.tsx
   ↓
   POST /api/postjob
   ↓
   job_listings table: Insert job
   ↓
   Background Task: match_job_to_users()
   ↓
   For each user:
     - rating_agent.evaluate_worker()
       → Mistral + LangChain
       → Structured evaluation
     - If score >= 70 OR recommendation == "YES":
       → inbox table: Insert match
   ↓
   Matching complete

4. User Views Matches
   Frontend: Inbox.tsx
   ↓
   GET /inbox?user_id={id}
   ↓
   inbox table: Fetch matches (sorted by score)
   ↓
   Display matched jobs with scores
   ↓
   User clicks "Apply"
   ↓
   POST /api/applications
   ↓
   applications table: Insert application
   ↓
   inbox table: Update status to "applied"
```

#### Journey 2: Skill Interview

```
1. User Starts Interview
   Frontend: AIInterviewRoomPage.tsx
   ↓
   Input: Job description
   ↓
   POST /ai/extract-skills
   ↓
   Mistral: Extract 10-20 skills
   ↓
   Skills list returned
   ↓
   POST /ai/generate-questions
   ↓
   Mistral: Generate 8 questions
   ↓
   Questions returned
   ↓
   POST /interview/start
   ↓
   SimpleInterviewSession created
   ↓
   session_id returned

2. Answer Questions (x8)
   For each question:
     Frontend: Record audio
     ↓
     POST /interview/answer/{session_id}/{q_index}
     ↓
     Process:
       1. Save audio temporarily
       2. Whisper: Transcribe
       3. Mistral: Cleanup transcription
       4. SkillAnalyzer: Detect skills
       5. Update skill_status
       6. Calculate progress
     ↓
     Return:
       - transcript
       - detected_skills
       - progress (X/Y skills detected)
       - has_next_question
     ↓
     Frontend: Display progress bar
     ↓
     Next question (if not complete)

3. Complete Interview
   POST /interview/complete/{session_id}
   ↓
   Generate final report:
     - skills_has (with timestamps)
     - skills_missing
     - coverage percentage
     - duration
   ↓
   Frontend: Display report
```

---

## Prompt Engineering Strategies

### Strategy 1: Few-Shot Learning (Resume AI)

**Problem**: LLM needs to understand blue-collar resume format

**Solution**: Provide examples in prompt
```python
FEW_SHOT = """
Example 1 (Tech)
Input: skills="Python, C++, JavaScript"
Output: {
  "skills": ["Python", "C++", "JavaScript"],
  "summary": "Full-stack developer with 3 years of experience..."
}

Example 2 (Healthcare)
Input: skills="patient care, charting, vital signs"
Output: {
  "skills": ["Patient care", "Charting", "Vital signs"],
  "summary": "Registered nurse with 5 years of experience..."
}
"""
```

### Strategy 2: System Prompts (Skill Analysis)

**Problem**: Need consistent categorization

**Solution**: Define role and categories upfront
```python
system_prompt = """You are an expert at analyzing construction job descriptions.

CATEGORIES:
1. Trade Skills - Specific craft skills
2. Equipment Operation - Machinery and tools
3. Safety & Compliance - OSHA, PPE, protocols
...

Extract skills into these categories ONLY.
"""
```

### Strategy 3: Structured Output (Rating Agent)

**Problem**: Need guaranteed JSON format

**Solution**: Use LangChain with Pydantic
```python
class WorkerEvaluation(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    recommendation: Literal["YES", "MAYBE", "NO"]
    ...

structured_llm = llm.with_structured_output(WorkerEvaluation)
```

**Benefits**:
- Type validation
- No JSON parsing errors
- Guaranteed fields
- Default values

### Strategy 4: Chain of Thought (Skill Detection)

**Problem**: Need to explain reasoning

**Solution**: Ask for explanation
```python
prompt = """
Detect skills mentioned in the text.

Think step by step:
1. What did the candidate say?
2. Which skills does that demonstrate?
3. Are there any implied skills?

Return:
- detected: [list]
- explanation: [reasoning]
"""
```

### Strategy 5: Temperature Control

**Analysis Tasks** (temperature=0):
```python
# Deterministic, consistent
llm = ChatOllama(model="mistral:7b", temperature=0)
```

**Creative Tasks** (temperature=0.7):
```python
# More variety in accomplishment enhancements
llm.generate(prompt, temperature=0.7)
```

---

## Error Handling & Validation

### Layer 1: Input Validation (Pydantic)

```python
class ResumeSpeechInput(BaseModel):
    phone: str
    responses: dict

@app.post("/generate_resume")
async def generate_resume(data: ResumeSpeechInput):
    # Pydantic validates automatically
    # Raises 422 if invalid
```

### Layer 2: AI Response Validation

```python
def extract_json_from_response(text):
    """Handle various AI response formats"""
    # Try: Code blocks
    if '```json' in text:
        match = re.search(r'```json\s*(\[.*?\])\s*```', text)
    # Try: Bracket counting
    # Try: Direct parse
    # Fallback: Return None
```

### Layer 3: Business Logic Validation

```python
def is_valid_response(self, response):
    """Validate response before processing"""
    if not response:
        return False
    response = response.strip().rstrip('.').lower()
    invalid = ['no', 'none', 'n/a', 'na', 'nothing']
    return response not in invalid
```

### Layer 4: Model Availability Checks

```python
if not OLLAMA_AVAILABLE:
    print("Warning: Ollama not available")
    print("AI features disabled, using fallbacks")
    return original_data  # Graceful degradation
```

### Layer 5: Retry Logic

```python
def ollama_generate_with_retry(prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            return ollama.generate(prompt, timeout=120)
        except TimeoutError:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                raise
```

### Error Response Examples

**Validation Error (422)**:
```json
{
  "detail": [
    {
      "loc": ["body", "phone"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**AI Error (500)**:
```json
{
  "error": "Ollama not responding",
  "fallback_used": true,
  "message": "Using original text without AI enhancement"
}
```

---

## Performance Optimizations

### 1. Model Caching
```python
# Load once, reuse everywhere
model = WhisperModel("base")  # Singleton pattern
```

### 2. Lazy Loading
```python
try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    # Validation still works without Ollama
```

### 3. Background Tasks
```python
# Don't block API response
asyncio.create_task(match_job_to_users(job_id))
return {"message": "Job created"}
```

### 4. Streaming Transcription
```python
# Real-time feedback vs waiting for full audio
for chunk in audio_stream:
    transcript = whisper.transcribe(chunk)
    yield transcript
```

### 5. Quantization
```python
# int8 quantization for faster CPU inference
WhisperModel("base", compute_type="int8")
```

---

## Summary: AI Systems Overview

| System | Model | Purpose | Input | Output |
|--------|-------|---------|-------|--------|
| **Resume AI** | qwen2.5-coder:7b | Generate professional resumes | Voice responses (JSON) | PDF resume |
| **Skill Interview** | Mistral 7B | Extract & detect skills | Job description + Audio | Skills report |
| **Rating Agent** | Mistral 7B (LangChain) | Evaluate candidates | Job desc + Resume | Structured score |
| **Transcription** | Whisper (faster-whisper) | Speech to text | Audio file | Text + language |
| **Interview Grading** | Mistral 7B | Keyword-based grading | Audio + Keywords | Pass/Fail + Feedback |
| **Job Matching** | Rating Agent | Auto-match candidates | New job posting | Inbox entries |

**Total Lines of AI Code**: ~3,500 lines
**API Endpoints**: 25+ endpoints
**AI Models Used**: 3 (Whisper, Mistral, qwen2.5-coder)
**Languages Supported**: English, Spanish

---

## Future Enhancements

1. **Multi-model Ensemble**: Use different models for different tasks
2. **Fine-tuning**: Train custom models on blue-collar job data
3. **Vector Search**: Semantic job-candidate matching (embeddings)
4. **Real-time Feedback**: Live coaching during interviews
5. **Video Analysis**: Assess body language and presentation
6. **Bias Detection**: Ensure fair evaluation across demographics
7. **Skill Taxonomy**: Standardized skill ontology for better matching
8. **Multilingual**: Expand beyond English/Spanish

---

**Documentation Complete**
For questions or updates, see: `/home/user/AI-Hackathon-Fall25/`
