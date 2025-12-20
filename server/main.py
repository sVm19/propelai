import os
from dotenv import load_dotenv

load_dotenv()

import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from appwrite.id import ID
from appwrite.query import Query

# Import core files from the src directory
from src.nlp_processor import NLPProcessor
# Import Appwrite Service
from src.appwrite_service import init_appwrite, get_db_client, DATABASE_ID, USERS_COLLECTION_ID, IDEAS_COLLECTION_ID

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is not set in the environment variables.")

app = FastAPI(
    title="PropelAI Backend API",
    on_startup=[init_appwrite] # Run Schema Migration on startup
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

databases = get_db_client()

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
    return {"message": "Hello from PropelAI (Appwrite Edition)!"}

@app.post("/api/generate")
async def generate_idea(request: IdeaRequest):
    # 1. Credit Check - Hardcoded User for MVP (Replace with proper Auth later)
    # We need to find the user. For MVP, we'll try to find the FIRST user created.
    try:
        user_list = databases.list_documents(DATABASE_ID, USERS_COLLECTION_ID, queries=[])
        if user_list['total'] == 0:
             # Create a dummy user if none exists for testing
             user = databases.create_document(DATABASE_ID, USERS_COLLECTION_ID, ID.unique(), {
                 "email": "test@example.com",
                 "full_name": "Test User", 
                 "hashed_password": "dummy_hash",
                 "idea_credits": 5,
                 "is_active": True
             })
        else:
             user = user_list['documents'][0]
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")

    if user['idea_credits'] <= 0:
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
    
    # Decrement Credits
    databases.update_document(DATABASE_ID, USERS_COLLECTION_ID, user['$id'], {
        "idea_credits": user['idea_credits'] - 1
    })

    if "BRAINSTORM_MODE" in request.prompt:
        raw_ideas = ai_raw_response.split("---")
        for raw_item in raw_ideas:
            if len(raw_item.strip()) < 10: continue
            
            new_idea_data = {
                "owner_id": user['$id'],
                "name": "New Venture",
                "problem": raw_item.strip()[:255], # Truncate for safety
                "result": raw_item.strip(),
                "created_at": datetime.utcnow().isoformat()
            }
            
            new_idea = databases.create_document(DATABASE_ID, IDEAS_COLLECTION_ID, ID.unique(), new_idea_data)
            saved_ideas.append(new_idea)
    else:
        new_idea_data = {
            "owner_id": user['$id'],
            "name": "Analysis",
            "problem": clean_user_prompt[:255],
            "result": ai_raw_response,
            "created_at": datetime.utcnow().isoformat()
        }
        new_idea = databases.create_document(DATABASE_ID, IDEAS_COLLECTION_ID, ID.unique(), new_idea_data)
        saved_ideas.append(new_idea)

    return {
        "status": "success",
        "ideas": [{"id": i['$id'], "result": i['result']} for i in saved_ideas],
        "credits_remaining": user['idea_credits'] - 1
    }

@app.get("/api/history")
async def get_history():
    # Fetch all ideas
    result = databases.list_documents(
        DATABASE_ID, 
        IDEAS_COLLECTION_ID, 
        queries=[Query.order_desc("$createdAt")] # Appwrite uses $createdAt or custom attribute
    )
    
    # Map Appwrite documents to frontend expected format
    return [
        {
            "id": doc['$id'],
            "result": doc['result'],
            "is_starred": doc.get('is_starred', False)
        } for doc in result['documents']
    ]

@app.patch("/api/ideas/{idea_id}/toggle-star")
async def toggle_star(idea_id: str):
    try:
        idea = databases.get_document(DATABASE_ID, IDEAS_COLLECTION_ID, idea_id)
        new_status = not idea.get('is_starred', False)
        
        databases.update_document(DATABASE_ID, IDEAS_COLLECTION_ID, idea_id, {
            "is_starred": new_status
        })
        return {"status": "success", "is_starred": new_status}
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")

@app.delete("/api/ideas/{idea_id}")
async def delete_idea(idea_id: str):
    try:
        databases.delete_document(DATABASE_ID, IDEAS_COLLECTION_ID, idea_id)
        return {"status": "success", "message": "Idea deleted"}
    except Exception:
        raise HTTPException(status_code=404, detail="Idea not found")