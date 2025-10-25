from pydantic import BaseModel, Field
from typing import List, Optional

class EvalForm(BaseModel):
    # Experience with specific tasks
    has_done_this_work_before: bool = Field(..., description="Has candidate done this type of work before?")
    months_experience: int = Field(..., description="Total months doing this kind of work")
    skill_level: str = Field(..., description="Beginner/Learning, Some Experience, Experienced, or Expert")

    # Equipment/machinery experience
    equipment_used: List[str] = Field(..., description="List of equipment/machines they've actually used")
    equipment_match_score: int = Field(..., description="Score 1-10 for equipment experience match")

    # Practical abilities
    can_do_physical_work: bool = Field(..., description="Can handle physical demands mentioned?")
    has_transportation: bool = Field(..., description="Has reliable way to get to work?")
    can_work_schedule: bool = Field(..., description="Can work the required hours/days?")

    # Work history
    time_at_last_job_months: Optional[int] = Field(None, description="How long at their last job?")
    work_history_score: int = Field(..., description="Score 1-10 for job stability/reliability")

    # Overall fit
    overall_score: int = Field(..., description="Overall score 1-100")
    ready_to_work: bool = Field(..., description="Can start immediately/soon?")

    what_they_can_do: List[str] = Field(..., description="Specific things they know how to do")
    what_they_cant_do: List[str] = Field(default_factory=list, description="Required skills they don't have")
    recommendation: str = Field(..., description="YES - hire them, MAYBE - need to talk to them, or NO - not a fit")
    reason: str = Field(..., description="Simple explanation of recommendation")