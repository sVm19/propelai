from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from passlib.context import CryptContext
import os

# --- 1. Database Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise Exception("DATABASE_URL is not set. Cannot connect to database.")

# --- SUPABASE FIX START ---
# Cloud DBs like Supabase require extra pooling settings to stay stable.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Automatically reconnects if the cloud drops the connection
    pool_size=10,        # Number of permanent connections to keep open
    max_overflow=20,     # Temporary extra connections during high traffic
    pool_recycle=3600    # Refresh connections every hour
)
# --- SUPABASE FIX END ---

Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- 2. Database Models ---
# (Your User and Idea classes remain exactly the same as you provided)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    subscription_tier = Column(String, default="free")
    idea_credits = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    ideas = relationship("Idea", back_populates="owner")

class Idea(Base):
    __tablename__ = "ideas"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, index=True, nullable=True)
    problem = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    source_url = Column(String, nullable=True)
    result = Column(Text)
    is_starred = Column(Boolean, default=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="ideas")

# --- 3. Database Utility ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_database_tables():
    # This will now create tables in the Supabase Cloud dashboard
    Base.metadata.create_all(bind=engine)
    print("Supabase tables synced/created successfully.")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)