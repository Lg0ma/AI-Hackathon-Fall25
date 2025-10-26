from fastapi import APIRouter, HTTPException
from database import supabase

router = APIRouter()

@router.get("/inbox")
def get_inbox():
    try:
        response = supabase.table("inbox").select("*, job_listings(*, employer(name))").execute()
        return response.data
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
