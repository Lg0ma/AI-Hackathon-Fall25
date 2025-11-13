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
