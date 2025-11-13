from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import supabase

router = APIRouter(prefix="/applications-router")

class InterviewResponse(BaseModel):
    user_id: str
    job_listing_id: str  # currently contains employer_id
    status: str
    applied_at: str
    score: int

@router.post('/submit-interview')
async def submit_interview(data: InterviewResponse):
    interview_row = data.model_dump()
    
    # Step 1: Lookup job_listing.id using employer_id
    employer_id = interview_row['job_listing_id']
    job_listing_response = supabase.table("job_listings") \
        .select("id") \
        .eq("employer_id", employer_id) \
        .limit(1) \
        .execute()
    
    # Check for errors properly
    if not job_listing_response:
        raise HTTPException(status_code=400, detail=str(job_listing_response["error"]))
    
    print("=========================================")
    print("job_listing_response: ", job_listing_response)
    job_id = job_listing_response.data[0]['id']
    # # Step 2: Replace employer_id with job_listing.id
    interview_row['job_listing_id'] = job_id

    # Step 3: Insert into applications
    response = supabase.table("applications").insert(interview_row).execute()
    
    if response.error:
        raise HTTPException(status_code=400, detail=str(response.error))

    if not response.data:
        raise HTTPException(status_code=400, detail="No data returned")
    
    return {"message": "Interview information submitted successfully", "data": response.get("data")}
from database import supabase

router = APIRouter()

@router.get("/applications")
async def get_applications(user_id: str): # Assuming user_id is passed as a query parameter
    """
    Fetches all job applications for a given user.
    Joins with job_listings to get job details.
    """
    try:
        # Fetch applications for the user, joining with job details
        response = supabase.table("applications").select(
            "id, user_id, job_listing_id, status, applied_at, score, job_listings(*)"
        ).eq("user_id", user_id).order("applied_at", desc=True).execute()

        if response.error:
            raise HTTPException(status_code=400, detail=response.error.message)

        # Return full applications with nested job_listings so the frontend can show status/score
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New: Applications by job (for employer to review applicants)
@router.get("/applications/by-job/{job_listing_id}")
async def get_applications_by_job(job_listing_id: str):
    """
    Returns all applications for a given job listing id, including applicant profile
    and score/status.
    """
    try:
        response = supabase.table("applications").select(
            "id, user_id, job_listing_id, status, applied_at, score, profiles(id, first_name, last_name)"
        ).eq("job_listing_id", job_listing_id).execute()

        if response.error:
            raise HTTPException(status_code=400, detail=response.error.message)

        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New: Schedule endpoints
from datetime import datetime as dt

class ScheduleRequest(BaseModel):
    application_user_id: str
    application_job_id: str   # job_listing_id
    interview_time: str       # ISO string
    interview_details: str    # free text with jitsi link, company, role

@router.post("/schedule")
async def create_schedule(req: ScheduleRequest):
    """
    Creates one schedule row. Consumers can query by user_id or job_id to show their meetings.
    """
    try:
        # Validate time
        _ = dt.fromisoformat(req.interview_time.replace("Z", "+00:00"))

        payload = {
            "application_user_id": req.application_user_id,
            "application_job_id": req.application_job_id,
            "interview_time": req.interview_time,
            "interview_details": req.interview_details,
        }
        result = supabase.table("schedule").insert(payload).execute()
        if result.error:
            raise HTTPException(status_code=400, detail=result.error.message)
        return {"ok": True, "schedule": result.data[0] if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/schedule")
async def get_schedule(user_id: str | None = None, job_listing_id: str | None = None):
    """
    Fetch schedule items by user or by job listing.
    """
    try:
        query = supabase.table("schedule").select("*")
        if user_id:
            query = query.eq("application_user_id", user_id)
        if job_listing_id:
            query = query.eq("application_job_id", job_listing_id)
        res = query.order("interview_time", desc=False).execute()
        if res.error:
            raise HTTPException(status_code=400, detail=res.error.message)
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
