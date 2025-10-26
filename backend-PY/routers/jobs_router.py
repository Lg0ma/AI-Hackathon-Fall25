from fastapi import APIRouter, HTTPException
from database import supabase

router = APIRouter()

@router.get("/jobs")
async def get_jobs():
    try:
        # Debug: Check what tables are available
        print("Testing Supabase connection...")
        
        # Try a simpler query first
        test_response = supabase.table("job_listings").select("*").limit(1).execute()
        print("Test query result:", test_response.data)
        
        # Your original query with more debugging
        response = supabase.table("job_listings").select(
            "employer_id, title, description, expected_skills, "
            "years_of_experience_required, created_at, postal_code"
        ).execute()
        
        print("Full response:", response)
        print("Response data:", response.data)
        print("Response status code:", getattr(response, 'status_code', 'N/A'))
        
        return response.data
    except Exception as e:
        print("Error details:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{employer_id}")
async def get_job_details(employer_id: str):
    try:
        # Fetch job details by employer_id
        response = supabase.table("job_listings").select(
            "employer_id, title, description, expected_skills, "
            "years_of_experience_required, created_at, postal_code"
        ).eq("employer_id", employer_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))