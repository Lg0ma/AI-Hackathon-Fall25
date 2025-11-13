# user_job_matching.py
from database import supabase
from rating_agent import evaluate_worker
import logging

logger = logging.getLogger(__name__)

async def match_user_to_jobs(user_id: str):
    """
    Matches a user to all available jobs and populates their inbox if they are a good fit.
    """
    logger.info(f"Starting job matching process for user_id: {user_id}")

    try:
        # 1. Fetch the user's profile and resume text
        profile_response = supabase.table("profiles").select("resume_text").eq("id", user_id).single().execute()
        if not profile_response.data or not profile_response.data.get("resume_text"):
            logger.warning(f"No resume text found for user {user_id}.")
            return {"message": "No resume found for user."}

        candidate_info = profile_response.data["resume_text"]
        logger.info(f"Found resume for user {user_id}.")

        # 2. Fetch all job listings
        jobs_response = supabase.table("job_listings").select("id, description").execute()
        if not jobs_response.data:
            logger.warning("No job listings found to match against.")
            return {"message": "No jobs available to match."}

        jobs = jobs_response.data
        logger.info(f"Found {len(jobs)} jobs to evaluate against.")

        match_count = 0
        for job in jobs:
            job_id = job.get("id")
            job_description = job.get("description")

            if not job_id or not job_description:
                logger.warning(f"Skipping job with incomplete data: {job}")
                continue

            # 3. Evaluate user against the job description
            logger.info(f"Evaluating user {user_id} for job {job_id}...")
            evaluation = evaluate_worker(
                job_description=job_description,
                candidate_info=candidate_info
            )

            if not evaluation:
                logger.error(f"Evaluation failed for job {job_id}.")
                continue

            # 4. Check if the match is good enough
            is_good_match = evaluation.overall_score >= 70 or evaluation.recommendation == "YES"
            logger.info(f"Job {job_id} evaluation complete. Score: {evaluation.overall_score}, Recommendation: {evaluation.recommendation}. Good match: {is_good_match}")

            if is_good_match:
                # 5. Populate the inbox
                inbox_entry = {
                    "user_id": user_id,
                    "job_id": job_id,
                    "status": "new",
                    "match_score": evaluation.overall_score,
                    "match_reason": evaluation.reason,
                }
                
                try:
                    supabase.table("inbox").insert(inbox_entry).execute()
                    match_count += 1
                    logger.info(f"Successfully added job {job_id} to inbox for user {user_id}.")
                except Exception as e:
                    logger.warning(f"Could not insert into inbox for user {user_id} and job {job_id}. Maybe it already exists? Error: {e}")

        logger.info(f"Job matching process complete for user {user_id}. Found {match_count} matches.")
        return {"message": f"Found {match_count} new job matches!"}

    except Exception as e:
        logger.error(f"An unexpected error occurred during the job matching process for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return {"error": "An unexpected error occurred."}
