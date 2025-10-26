from fastapi import APIRouter, HTTPException
from database import supabase

router = APIRouter()

@router.get("/jobs")
async def get_jobs():
    try:
        # Fetch all job postings with correct column names
        response = supabase.table("job_listings").select(
            "employer_id, title, description, expected_skills, "
            "years_of_experience_required, created_at, postal_code"
        ).execute()
    
        print(response.data)
        return response.data
    except Exception as e:
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