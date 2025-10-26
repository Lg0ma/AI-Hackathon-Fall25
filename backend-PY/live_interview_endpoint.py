"""
Live Interview Endpoint - Runs skill_interview.py and streams output to frontend
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Optional
import asyncio
import subprocess
import logging
import json
import uuid
from datetime import datetime

from database import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live-interview", tags=["Live Interview"])

# Active interview processes
active_interviews: Dict[str, subprocess.Popen] = {}


@router.websocket("/ws/{job_id}")
async def live_interview_websocket(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint that runs skill_interview.py and streams all output to frontend

    Flow:
    1. Client connects with job_id
    2. Server fetches job description from database
    3. Server starts skill_interview.py as subprocess with job description
    4. Server streams all stdout/stderr to client in real-time
    5. Client displays output like a terminal

    Messages to client:
    {
      "type": "log",
      "data": {
        "line": "text from stdout/stderr",
        "timestamp": "2025-10-26T12:34:56",
        "level": "info|error"
      }
    }
    {
      "type": "status",
      "data": {"message": "Interview started", "status": "running|completed|error"}
    }
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    logger.info(f"[Session {session_id}] WebSocket connected for job {job_id}")

    try:
        # Send initial status
        await websocket.send_json({
            "type": "status",
            "data": {"message": "Connecting...", "status": "connecting"}
        })

        # Fetch job from database
        logger.info(f"[Session {session_id}] Fetching job {job_id}...")
        job_response = supabase.table('job_listings').select(
            "employer_id, title, description, expected_skills, "
            "years_of_experience_required, created_at, postal_code"
        ).eq('employer_id', job_id).execute()

        if not job_response.data or len(job_response.data) == 0:
            await websocket.send_json({
                "type": "error",
                "data": {"message": "Job not found"}
            })
            await websocket.close()
            return

        job = job_response.data[0]
        job_description = job['description']
        job_title = job['title']

        logger.info(f"[Session {session_id}] Loaded job: {job_title}")

        # Send job info
        await websocket.send_json({
            "type": "status",
            "data": {
                "message": f"Starting interview for: {job_title}",
                "status": "starting",
                "job_title": job_title
            }
        })

        # Write job description to temp file
        import tempfile
        import os

        temp_job_file = f"temp_job_{session_id}.txt"
        with open(temp_job_file, 'w', encoding='utf-8') as f:
            f.write(job_description)

        logger.info(f"[Session {session_id}] Starting skill_interview.py...")

        # Start skill_interview.py as subprocess
        process = subprocess.Popen(
            ['python', 'skill_interview.py', '--job-file', temp_job_file],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,  # Line buffered
            cwd='.'
        )

        active_interviews[session_id] = process

        # Send started status
        await websocket.send_json({
            "type": "status",
            "data": {"message": "Interview started", "status": "running"}
        })

        # Stream output line by line
        try:
            while True:
                line = process.stdout.readline()

                if not line:
                    # Process ended
                    break

                line = line.rstrip()

                if line:  # Skip empty lines
                    # Send log line to frontend
                    await websocket.send_json({
                        "type": "log",
                        "data": {
                            "line": line,
                            "timestamp": datetime.now().isoformat(),
                            "level": "error" if "ERROR" in line or "❌" in line else "info"
                        }
                    })

                # Check if process is still running
                if process.poll() is not None:
                    break

                # Allow other tasks to run
                await asyncio.sleep(0.01)

            # Process completed
            return_code = process.wait()

            logger.info(f"[Session {session_id}] Interview completed with code {return_code}")

            await websocket.send_json({
                "type": "status",
                "data": {
                    "message": "Interview completed",
                    "status": "completed",
                    "return_code": return_code
                }
            })

        except Exception as e:
            logger.error(f"[Session {session_id}] Error streaming output: {e}")
            await websocket.send_json({
                "type": "error",
                "data": {"message": str(e)}
            })

        finally:
            # Cleanup
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=5)

            if os.path.exists(temp_job_file):
                os.remove(temp_job_file)

    except WebSocketDisconnect:
        logger.info(f"[Session {session_id}] WebSocket disconnected")

    except Exception as e:
        logger.error(f"[Session {session_id}] WebSocket error: {e}")
        import traceback
        traceback.print_exc()

        try:
            await websocket.send_json({
                "type": "error",
                "data": {"message": str(e)}
            })
        except:
            pass

    finally:
        # Cleanup
        if session_id in active_interviews:
            process = active_interviews[session_id]
            if process.poll() is None:
                process.terminate()
            del active_interviews[session_id]

        logger.info(f"[Session {session_id}] WebSocket closed")


@router.post("/stop/{session_id}")
async def stop_interview(session_id: str):
    """Stop a running interview"""
    if session_id not in active_interviews:
        raise HTTPException(status_code=404, detail="Session not found")

    process = active_interviews[session_id]
    process.terminate()
    process.wait(timeout=5)

    del active_interviews[session_id]

    return {"message": "Interview stopped", "session_id": session_id}
