import os
from dotenv import load_dotenv
import re

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


def extract_categories(prompt: str):
    # Regex to find text inside [Categories: ...]
    match = re.search(r"\[Categories:\s*(.*?)\]", prompt)
    if match:
        categories = match.group(1)
        # Remove the bracketed part from the main prompt
        clean_prompt = prompt.replace(match.group(0), "").strip()
        return categories, clean_prompt
    return None, prompt

@app.post("/api/generate")
async def generate_idea(request: IdeaRequest, db: Session = Depends(get_db)):
    # 1. Check Credits (Existing Logic)
    user = db.query(User).filter(User.id == 1).first()
    if user.idea_credits <= 0:
        raise HTTPException(status_code=403, detail="Insufficient credits")

    # 2. Extract Categories from the string sent by Next.js
    categories, clean_user_prompt = extract_categories(request.prompt)
    
    # 3. Build a specialized System Instruction
    system_context = "You are an expert startup consultant."
    if categories:
        system_context += f" The user is interested in these specific industries: {categories}. "
        system_context += "Ensure your business plan focuses on current trends and monetization strategies within these niches."

    # 4. AI Processing (Simulated logic using the context)
    processed_text = f"[{categories if categories else 'General'}] Analysis: {clean_user_prompt}"
    
    try:
        new_idea = Idea(
            prompt=clean_user_prompt, # Store the clean prompt in DB
            result=processed_text,
            user_id=user.id
        )
        user.idea_credits -= 1
        db.add(new_idea)
        db.commit()
        db.refresh(new_idea)
        
        return {
            "status": "success", 
            "result": new_idea.result, 
            "credits_remaining": user.idea_credits
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error")

@app.get("/api/history")
async def get_history(db: Session = Depends(get_db)):
    # Fetch all ideas, ordered by ID descending (newest first)
    ideas = db.query(Idea).order_by(Idea.id.desc()).all()
    return ideas        