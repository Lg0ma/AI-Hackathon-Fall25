from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

# Import routers
from routers import rating_router

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Hackathon API",
    description="Backend API for AI Hackathon Fall 2025",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers import rating_router, jobs_router

# Include routers
app.include_router(rating_router.router, prefix="/api/rating", tags=["Rating"])
app.include_router(jobs_router.router, prefix="/api", tags=["Jobs"])


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to AI Hackathon API",
        "status": "running",
        "version": "1.0.0"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("fastapi_routes:app", host="0.0.0.0", port=8000, reload=True)
