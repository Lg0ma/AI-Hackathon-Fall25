# inbox_matching.py
from database import supabase
from rating_agent import evaluate_worker
import logging

logger = logging.getLogger(__name__)

async def match_job_to_users(job_id: str, job_description: str):
    """
    Matches a new job to all users and populates their inboxes if they are a good fit.
    """
    logger.info(f"Starting inbox matching process for job_id: {job_id}")

    try:
        # 1. Fetch all user profiles
        profiles_response = supabase.table("profiles").select("id, full_name, resume_text").execute()
        if not profiles_response.data:
            logger.warning("No user profiles found to match against.")
            return

        users = profiles_response.data
        logger.info(f"Found {len(users)} user profiles to evaluate.")

        match_count = 0
        for user in users:
            user_id = user.get("id")
            candidate_info = user.get("resume_text")

            if not user_id or not candidate_info:
                logger.warning(f"Skipping user with incomplete profile: {user}")
                continue

            # 2. Evaluate user against the job description
            logger.info(f"Evaluating user {user_id} for job {job_id}...")
            evaluation = evaluate_worker(
                job_description=job_description,
                candidate_info=candidate_info
            )

            if not evaluation:
                logger.error(f"Evaluation failed for user {user_id}.")
                continue

            # 3. Check if the match is good enough
            # We'll consider a score of 70 or higher, or a "YES" recommendation
            is_good_match = evaluation.overall_score >= 70 or evaluation.recommendation == "YES"
            logger.info(f"User {user_id} evaluation complete. Score: {evaluation.overall_score}, Recommendation: {evaluation.recommendation}. Good match: {is_good_match}")

            if is_good_match:
                # 4. Populate the inbox
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
                    # This can happen if the entry already exists (e.g., unique constraint)
                    logger.warning(f"Could not insert into inbox for user {user_id} and job {job_id}. Maybe it already exists? Error: {e}")

        logger.info(f"Inbox matching process complete for job {job_id}. Found {match_count} matches.")

    except Exception as e:
        logger.error(f"An unexpected error occurred during the inbox matching process for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
