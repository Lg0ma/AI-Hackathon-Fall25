from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import supabase
from user_job_matching import match_user_to_jobs

router = APIRouter()

@router.get("/inbox")
def get_inbox():
    try:
        response = supabase.table("inbox").select("*, job_listings(*, employer(name))").execute()
        return response.data
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

class MatchRequest(BaseModel):
    user_id: str

@router.post("/inbox/match-jobs")
async def trigger_match_jobs(request: MatchRequest):
    # TODO: Replace this with a dependency that gets the user from the session
    user_id = request.user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required.")
        
    try:
        result = await match_user_to_jobs(user_id)
        return result
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
