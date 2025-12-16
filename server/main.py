import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session
from pydantic import BaseModel
from src.database import get_db, Idea

from typing import List
router = APIRouter()
@router.get("/api/greeting")
async def get_greeting():
    return {"message": "Hello from PropelAI FastAPI Backend!"}

# Import core files from the src directory
from src.nlp_processor import NLPProcessor
from src.database import get_db, create_database_tables, User, Idea
from src.auth import UserSignup, UserLogin, Token, signup_user, login_user, get_current_user

# --- Configuration & Initialization ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is not set in the environment variables. "
        "Please update your .env file."
    )

# --- FastAPI Setup ---
app = FastAPI(
    title="PropelAI Backend API",
    description="Contextual Idea Generator API for Browser Extension",
    version="1.0.0",
    # Event listener to create tables on startup
    on_startup=[create_database_tables]
)

# Add CORS middleware for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas for API ---

class IdeaRequest(BaseModel):
    prompt: str

@app.post("/api/generate")
async def generate_idea(request: IdeaRequest):
    # This is where you will later call your NLP/AI logic
    processed_text = f"AI Analysis of: {request.prompt}"
    
    return {
        "status": "success",
        "result": processed_text,
        "credits_remaining": 9
    }

class IdeaRequest(BaseModel):
    """Schema for the data expected from the browser extension."""
    url: str
    text_content: str

class StartupIdea(BaseModel):
    """Schema for a single structured idea returned by the LLM."""
    Name: str
    Problem: str
    Solution: str

class IdeaResponse(BaseModel):
    """Schema for the final API response."""
    status: str = "success"
    message: str
    ideas: List[StartupIdea]

# --- Authentication Endpoints ---

@app.post("/auth/signup", response_model=Token)
async def signup(signup_data: UserSignup, db: Session = Depends(get_db)):
    """
    Register a new user account.
    """
    return signup_user(signup_data, db)

@app.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate and login a user.
    """
    return login_user(login_data, db)

@app.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current user information.
    """
    return {
        "user_id": current_user.user_id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "subscription_tier": current_user.subscription_tier,
        "idea_credits": current_user.idea_credits,
        "is_verified": current_user.is_verified
    }

# --- API Endpoint with Monetization Logic ---

@app.post("/generate", response_model=IdeaResponse)
async def generate_ideas(
    request: IdeaRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Primary endpoint: Checks subscription, generates ideas, deducts credits, and saves history.
    Requires authentication.
    """
    if not request.text_content or len(request.text_content) < 150:
        raise HTTPException(
            status_code=400, 
            detail="Content too short (min 150 chars) or empty for effective analysis."
        )

    # 1. Monetization: Credit Check
    if current_user.subscription_tier == "free" and current_user.idea_credits <= 0:
        raise HTTPException(
            status_code=403, 
            detail="Credit limit reached. Upgrade to Pro for unlimited ideas."
        )

    # 2. Idea Generation (Phase 1 Logic)
    try:
        processor = NLPProcessor(raw_text=request.text_content)
        raw_idea_list = processor.call_llm()
        
        # Validate and structure the ideas
        validated_ideas = [StartupIdea(**idea) for idea in raw_idea_list]
        
    except Exception as e:
        print(f"Internal Processing Error: {e}")
        raise HTTPException(
            status_code=500, 
            detail="An unexpected error occurred during idea generation."
        )
    
    # 3. Monetization: Credit Deduction and History Saving
    
    if current_user.subscription_tier == "free":
        # Deduct a credit only for free users
        current_user.idea_credits -= 1
        
    for idea_data in validated_ideas:
        # Save each generated idea to the database for history
        db_idea = Idea(
            owner_id=current_user.id,
            name=idea_data.Name,
            problem=idea_data.Problem,
            solution=idea_data.Solution,
            source_url=request.url
        )
        db.add(db_idea)
    
    db.commit()

    return IdeaResponse(
        message=f"Success! {current_user.idea_credits} credits remaining.",
        ideas=validated_ideas
    )

# --- Health Check Endpoint ---
@app.get("/health")
def health_check():
    """Simple endpoint to confirm the API is running."""
    return {"status": "ok", "service": "PropelAI"}

@app.post("/api/generate")
async def generate_idea(request: IdeaRequest, db: Session = Depends(get_db)):
    # 1. AI Logic (Simplified for now)
    processed_text = f"AI Analysis of: {request.prompt}"
    
    try:
        # 2. Create the Database Object
        new_idea = Idea(
            prompt=request.prompt,
            result=processed_text,
            user_id=1 # Temporary: later this will be the logged-in user's ID
        )
        
        # 3. Save to PostgreSQL
        db.add(new_idea)
        db.commit()
        db.refresh(new_idea) # Get the generated ID back from the DB
        
        return {
            "status": "success",
            "id": new_idea.id,
            "result": new_idea.result
        }
    except Exception as e:
        db.rollback() # Undo changes if something goes wrong
        print(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Could not save idea to database")

@app.get("/api/history")
async def get_history(db: Session = Depends(get_db)):
    # Fetch all ideas, ordered by ID descending (newest first)
    ideas = db.query(Idea).order_by(Idea.id.desc()).all()
    return ideas        