from fastapi import APIRouter, HTTPException, BackgroundTasks
from database import supabase
from datetime import datetime
from pydantic import BaseModel
import uuid
from inbox_matching import match_job_to_users


router = APIRouter()

@router.get("/profiles/{user_id}")
async def get_profile(user_id: str):
    try:
        res = supabase.table("profiles").select("id, first_name, last_name").eq("id", user_id).limit(1).execute()
        if res.error:
            raise HTTPException(status_code=400, detail=res.error.message)
        if not res.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    

class JobListing(BaseModel):
    employer_id: str
    title: str
    description: str
    expected_skills: str | None = None
    years_of_experience_required: int
    postal_code: str

@router.post("/postjob")
async def create_job(job: JobListing, background_tasks: BackgroundTasks):
    try:
        new_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()

        data = {
            "id": new_id,
            "employer_id": job.employer_id,
            "title": job.title,
            "description": job.description,
            "expected_skills": [job.expected_skills],
            "years_of_experience_required": job.years_of_experience_required,
            "postal_code": job.postal_code,
            "created_at": created_at,
        }

        response = supabase.table("job_listings").insert(data).execute()

        if response.data:
            # After successfully creating the job, trigger the background task
            background_tasks.add_task(
                match_job_to_users,
                job_id=new_id,
                job_description=job.description
            )
            return {"message": "Job created successfully and matching process started", "job_id": new_id}
        else:
            raise HTTPException(status_code=400, detail="Failed to insert job into Supabase")

    except Exception as e:
        print("Error inserting job:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/employer/{employer_id}/jobs")
async def get_employer_jobs(employer_id: str):
    try:
        # Fetch ALL jobs for this employer
        response = supabase.table("job_listings").select(
            "id, employer_id, title, description, expected_skills, "
            "years_of_experience_required, created_at, postal_code"
        ).eq("employer_id", employer_id).execute()

        # Return empty list if no jobs found (not 404)
        return response.data  # Returns all jobs, not just [0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/employer/{employer_id}")
async def get_employer(employer_id: str):
    try:
        # Fetch employer details by ID
        response = supabase.table("employer").select(
            "id, name, description, created_at"
        ).eq("id", employer_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Employer not found")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))