from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import os
from typing import List

# Import core files from the src directory
from src.nlp_processor import NLPProcessor
from src.database import get_db, create_database_tables, User, Idea
from src.database import StartupIdea as DBStartupIdea # Avoid naming conflict with Pydantic model

# Load environment variables from .env file
load_dotenv()

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

# --- Pydantic Schemas for API ---

class IdeaRequest(BaseModel):
    """Schema for the data expected from the browser extension."""
    url: str
    text_content: str
    user_id: str # Required for database lookup and monetization

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

# --- API Endpoint with Monetization Logic ---

@app.post("/generate", response_model=IdeaResponse)
async def generate_ideas(
    request: IdeaRequest, 
    db: Session = Depends(get_db) # Inject the database session
):
    """
    Primary endpoint: Checks subscription, generates ideas, deducts credits, and saves history.
    """
    if not request.text_content or len(request.text_content) < 150:
        raise HTTPException(
            status_code=400, 
            detail="Content too short (min 150 chars) or empty for effective analysis."
        )

    # 1. Monetization: User Lookup and Credit Check
    # This is a placeholder for actual user authentication/lookup, assuming the extension sends a unique ID
    db_user = db.query(User).filter(User.user_id == request.user_id).first()

    if not db_user:
        # If user doesn't exist, create a new free tier user
        db_user = User(user_id=request.user_id, subscription_tier="free", idea_credits=3)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
    if db_user.subscription_tier == "free" and db_user.idea_credits <= 0:
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
    
    if db_user.subscription_tier == "free":
        # Deduct a credit only for free users
        db_user.idea_credits -= 1
        
    for idea_data in validated_ideas:
        # Save each generated idea to the database for history
        db_idea = Idea(
            owner_id=db_user.id,
            name=idea_data.Name,
            problem=idea_data.Problem,
            solution=idea_data.Solution,
            source_url=request.url
        )
        db.add(db_idea)
    
    db.commit()

    return IdeaResponse(
        message=f"Success! {db_user.idea_credits} credits remaining.",
        ideas=validated_ideas
    )

# --- Health Check Endpoint ---
@app.get("/health")
def health_check():
    """Simple endpoint to confirm the API is running."""
    return {"status": "ok", "service": "PropelAI"}