# Resume AI Validation Testing

This document explains how to test the resume data validation and formatting functionality.

## Test Data

**File**: `test_resume_data.json`

Contains real-world problematic data to test validation:

### Issues in Test Data:
1. **Job Title Q2**: "Plumber" (simple)
2. **Job Title Q8**: "Regional Manager" (different from Q2)
3. **Email**: "Luis G31209 and percent gmail.com" (should be fixed to use @)
4. **Location Q5**: "El Paso, Texas." (extra period)
5. **Location Q7**: "of pastel texas" (needs formatting)
6. **Job 2**: All fields are "No" → **should be filtered out completely**
7. **Skills Q30**: Full sentence like "I know how to operate forklifts..." → **should be extracted as list**
8. **Skills Q31**: "I have a CDL class A license..." → **should extract: "CDL Class A, Forklift certified, OSHA 30-hour"**
9. **Skills Q32**: Long paragraph → **should extract: "problem solving, physical stamina, blueprint reading, inventory management, customer service, reliable attendance"**
10. **Accomplishments**: Full sentences with "I was able to..." → **should be cleaned**

---

## Testing Methods

### Method 1: API Endpoint (Requires Backend Running)

**Endpoint**: `POST /resume/test-validation`

**Usage**:
```bash
# Start the FastAPI server
cd backend-PY
uvicorn main:app --reload

# In another terminal, call the test endpoint
curl -X POST http://localhost:8000/resume/test-validation
```

**Response**:
```json
{
  "message": "Validation test completed successfully",
  "validation_report": {
    "contact_info": {
      "job_title_original": "Plumber",
      "job_title_cleaned": "Plumber",
      "email_original": "Luis G31209 and percent gmail.com",
      "email_cleaned": "Luis G31209 and percent gmail.com"
    },
    "work_experience": {
      "job1_title_original": "Regional Manager",
      "job1_title_cleaned": "Regional Manager",
      "job2_company_original": "No.",
      "job2_filtered_out": true,
      "total_jobs_in_resume": 1
    },
    "skills": {
      "technical_skills_original": "I know how to operate forklifts...",
      "technical_skills_cleaned": "forklifts, wire welder, take welder, drill, power saw..."
    }
  },
  "test_passed": true
}
```

---

### Method 2: Standalone Script (No Server Required)

**Script**: `test_resume_validation.py`

**Usage**:
```bash
cd backend-PY
python3 test_resume_validation.py
```

**Output**:
```
======================================================================
  RESUME DATA VALIDATION TEST
======================================================================

1. Initializing ResumeAI...
   ✓ ResumeAI initialized

2. Loading test data...
   ✓ Loaded test data from: test_resume_data.json

======================================================================
  ORIGINAL DATA (Before Validation)
======================================================================

Contact Information:
  • Job Title (Q2): Plumber
  • Email: Luis G31209 and percent gmail.com
  • Location: El Paso, Texas.

Work Experience:
  • Job 1 Company: Julio's construction firm
  • Job 1 Title (Q8): Regional Manager
  • Job 1 Location: of pastel texas
  • Job 2 Company: No.

Skills (first 100 chars):
  • Technical: I know how to operate forklifts, wire welder, take welder, drill, power saw...
  • Certifications: I have a CDL class A license. I have a focus certification...
  • Competencies: I am a very good problem solver. I also have a very good physical stamina...

======================================================================
  APPLYING VALIDATION
======================================================================

3. Validating and cleaning responses...
   ✓ Validation complete

4. Normalizing data structure...
   ✓ Normalization complete

======================================================================
  CLEANED DATA (After Validation)
======================================================================

Contact Information:
  • Job Title: Plumber
  • Email: Luis G31209 and percent gmail.com
  • Location: El Paso, Texas

Work Experience:
  • Total Jobs in Resume: 1

  Job 1:
    • Company: Julio's construction firm
    • Title: Regional Manager
    • Location: of pastel texas
    • Accomplishments: 3 items

Skills:
  • Technical Skills (11 items):
      - forklifts
      - wire welder
      - take welder
      - drill
      - power saw
      ... and 6 more

  • Certifications (3 items):
      - CDL class A license
      - focus certification
      - OSHA 30-hour card

  • Competencies (13 items):
      - very good problem solver
      - very good physical stamina
      - work for long hours on my feet
      - re-blue prints
      - manage inventory
      ... and 8 more

======================================================================
  VALIDATION REPORT
======================================================================

✓ SUCCESSFUL VALIDATIONS:
  ✓ Empty Job 2 (all 'No' responses) was correctly filtered out
  ✓ Skills extracted as comma-separated list (not sentences)
  ✓ Job title: Regional Manager
  ✓ Extracted 11 individual technical skills from sentence

======================================================================
  TEST SUMMARY
======================================================================
  ✓ Test 1: Empty job filtered
  ✓ Test 2: Skills are list
  ✓ Test 3: Skills extracted from sentences
  ✓ Test 4: Job title exists
  ✓ Test 5: Location formatted

======================================================================
  TESTS PASSED: 5/5
======================================================================

✓ ALL TESTS PASSED! Validation is working correctly.
```

---

## What the Tests Validate

### ✅ Empty Job Filtering
- **Test**: Job 2 has all "No" responses
- **Expected**: Job 2 should NOT appear in final resume
- **Validation**: `total_jobs_in_resume == 1`

### ✅ Skills Extraction
- **Test**: Q30 is a long sentence: "I know how to operate forklifts, wire welder..."
- **Expected**: Extract individual skills as comma-separated list
- **Result**: `["forklifts", "wire welder", "drill", "power saw", ...]`

### ✅ Job Title Formatting
- **Test**: Q8 says "Regional Manager" (clean already)
- **Expected**: Keep as-is if already clean
- **Result**: "Regional Manager"

### ✅ Location Formatting
- **Test**: Q5 has "El Paso, Texas." (extra period)
- **Expected**: Remove extra punctuation
- **Result**: "El Paso, Texas"

### ✅ Certifications Extraction
- **Test**: Q31 is "I have a CDL class A license. I have a focus certification..."
- **Expected**: Extract only certification names
- **Result**: `["CDL class A license", "focus certification", "OSHA 30-hour card"]`

---

## Integration with Frontend

To add a test button in your frontend:

```javascript
// Test validation button handler
async function testResumeValidation() {
  try {
    const response = await fetch('http://localhost:8000/resume/test-validation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    console.log('Validation Test Results:', data);

    if (data.test_passed) {
      alert('✓ All validation tests passed!');
    } else {
      alert('✗ Some validation tests failed. Check console.');
    }

    // Display validation report
    console.log('Before/After Comparison:', data.validation_report);
    console.log('Normalized Data:', data.normalized_data);

  } catch (error) {
    console.error('Test failed:', error);
    alert('Test endpoint error: ' + error.message);
  }
}
```

Add button to your HTML:
```html
<button onclick="testResumeValidation()">
  🧪 Test Resume Validation
</button>
```

---

## Expected Test Results

| Test | Original | Cleaned | Status |
|------|----------|---------|--------|
| Job 2 Filtering | Company: "No." | Not in resume | ✅ Pass |
| Skills Format | Sentence | Comma-separated list | ✅ Pass |
| Skills Count | 1 long sentence | 11 individual items | ✅ Pass |
| Certifications | Sentence | 3 items | ✅ Pass |
| Competencies | Long paragraph | 13 items | ✅ Pass |
| Location | "El Paso, Texas." | "El Paso, Texas" | ✅ Pass |
| Job Title | Any format | Clean title only | ✅ Pass |

---

## Troubleshooting

### Test Script Won't Run
```bash
# Make sure you're in the right directory
cd backend-PY

# Install dependencies
pip install ollama

# Run with verbose output
python3 -v test_resume_validation.py
```

### API Endpoint Returns 503
- Make sure the backend server is running
- Check that ResumeAI initialized properly in main.py
- Verify ollama is running if using AI features

### Tests Fail
- Check the validation_report in the response
- Compare "original" vs "cleaned" in detailed output
- Review console logs for specific validation errors

---

## Modifying Test Data

To test different scenarios, edit `test_resume_data.json`:

```json
{
  "interview_responses": {
    "work_experience_job2": {
      "Q15_company": "Valid Company Name",  // Change "No." to test multi-job
      "Q16_location": "Phoenix, AZ",
      // ... add valid data
    }
  }
}
```

Then run tests again to verify validation handles the new data correctly.
