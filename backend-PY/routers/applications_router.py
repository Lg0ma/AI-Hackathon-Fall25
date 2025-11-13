from fastapi import APIRouter, HTTPException
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
            "*, job_listings(*)"
        ).eq("user_id", user_id).execute()

        if response.error:
            raise HTTPException(status_code=400, detail=response.error.message)

        # The result will be a list of application objects, each containing a job_listings object.
        # We can extract just the job details for the frontend.
        applied_jobs = [app.get("job_listings") for app in response.data if app.get("job_listings")]

        return applied_jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
