import os

from dotenv import load_dotenv

load_dotenv()

import re
from typing import List, Optional

from src.database import get_db, create_database_tables, User, Idea

from fastapi import FastAPI, HTTPException, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

# Import core files from the src directory

from src.nlp_processor import NLPProcessor
from src.auth import get_current_user # Ensure this is imported



# --- Configuration & Initialization ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in the environment variables.")

app = FastAPI(
    title="PropelAI Backend API",
    on_startup=[create_database_tables]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class IdeaRequest(BaseModel):
    prompt: str
    tone: Optional[str] = None

# --- Helper Logic ---
def extract_categories(prompt: str):
    # Fixed Regex: r"\[Categories:\s*(.*?)\]" correctly finds [Categories: X, Y]
    match = re.search(r"\[Categories:\s*(.*?)\]", prompt)
    if match:
        categories = match.group(1)
        clean_prompt = prompt.replace(match.group(0), "").strip()
        return categories, clean_prompt
    return None, prompt

# --- API Routes ---

@app.get("/api/greeting")
async def get_greeting():
    return {"message": "Hello from PropelAI FastAPI Backend!"}

@app.post("/api/generate")
async def generate_idea(request: IdeaRequest, db: Session = Depends(get_db)):
    # 1. Credit Check - Using a hardcoded user ID 1 for now
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.idea_credits <= 0:
        raise HTTPException(status_code=403, detail="Insufficient credits")

    # 2. Extract Categories
    categories, clean_user_prompt = extract_categories(request.prompt)
    
    system_instruction = ""
    final_prompt_for_ai = ""

    # 3. Mode Selection
    if "BRAINSTORM_MODE" in request.prompt:
        system_instruction = (
            f"You are a Venture Capitalist. Generate 5 unique startup opportunities for: {categories or 'general'}. "
            "Format: NAME: [Name] | PROBLEM: [Problem] | SOLUTION: [Solution] ---"
        )
        final_prompt_for_ai = f"Target Industries: {categories}"
    else:
        system_instruction = "You are a startup consultant. Analyze this idea and provide a plan."
        if categories:
            system_instruction += f" Context: {categories}."
        final_prompt_for_ai = clean_user_prompt

    if request.tone:
        system_instruction += f" Use a {request.tone} tone."

    # 4. AI Call
    nlp_processor = NLPProcessor(GEMINI_API_KEY)
    try:
        ai_raw_response = await nlp_processor.generate_idea(system_instruction, final_prompt_for_ai)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI engine failed: {str(e)}")

    # 5. Process and Save
    saved_ideas = []
    if "BRAINSTORM_MODE" in request.prompt:
        raw_ideas = ai_raw_response.split("---")
        for raw_item in raw_ideas:
            if len(raw_item.strip()) < 10: continue
            new_idea = Idea(
                owner_id=user.id, # Fixed: matched with your Idea model 'owner_id'
                name="New Venture", # Placeholder
                problem=raw_item.strip(),
                solution="Detailed in analysis",
                result=raw_item.strip()
            )
            db.add(new_idea)
            saved_ideas.append(new_idea)
    else:
        new_idea = Idea(
            owner_id=user.id,
            name="Analysis",
            problem=clean_user_prompt,
            result=ai_raw_response
        )
        db.add(new_idea)
        saved_ideas.append(new_idea)

    user.idea_credits -= 1
    db.commit()
    
    return {
        "status": "success",
        "ideas": [{"id": i.id, "result": i.result} for i in saved_ideas],
        "credits_remaining": user.idea_credits
    }

@app.get("/api/history")
async def get_history(db: Session = Depends(get_db)):
    return db.query(Idea).order_by(Idea.id.desc()).all()

@app.patch("/api/ideas/{idea_id}/toggle-star")
async def toggle_star(idea_id: int, db: Session = Depends(get_db)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    idea.is_starred = not idea.is_starred
    db.commit()
    return {"status": "success", "is_starred": idea.is_starred}

@app.delete("/api/ideas/{idea_id}")
async def delete_idea(idea_id: int, db: Session = Depends(get_db)):
    idea = db.query(Idea).filter(Idea.id == idea_id).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    db.delete(idea)
    db.commit()
    return {"status": "success", "message": "Idea deleted"}