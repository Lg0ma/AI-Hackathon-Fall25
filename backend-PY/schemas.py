# schemas.py
from pydantic import BaseModel, Field
from typing import Dict, List, Optional

class RawPayload(BaseModel):
    user_id: str
    responses: Dict[str, str]

class CleanProfile(BaseModel):
    user_id: str
    name: str = Field(..., description="Full legal name only")
    address: str = Field(..., description="Street + city/state if present; no phone")
    skills_summary: List[str] = Field(..., description="Bullet list of generalized skill points")
