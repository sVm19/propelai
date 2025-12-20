import os
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.id import ID
from appwrite.exception import AppwriteException

# Initialize Appwrite Client
client = Client()
client.set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
client.set_key(os.getenv("APPWRITE_API_KEY"))

databases = Databases(client)

DATABASE_ID = "PropelAI_DB"
USERS_COLLECTION_ID = "Users"
IDEAS_COLLECTION_ID = "Ideas"

def init_appwrite():
    """
    Initializes the Appwrite Database and Collections if they don't exist.
    Functions as a schema migration tool.
    """
    try:
        databases.get(DATABASE_ID)
        print(f"Database '{DATABASE_ID}' exists.")
    except AppwriteException:
        print(f"Database '{DATABASE_ID}' not found. Creating...")
        databases.create(DATABASE_ID, "PropelAI Database")

    # Create Users Collection
    try:
        databases.get_collection(DATABASE_ID, USERS_COLLECTION_ID)
        print(f"Collection '{USERS_COLLECTION_ID}' exists.")
    except AppwriteException:
        print(f"Collection '{USERS_COLLECTION_ID}' not found. Creating...")
        databases.create_collection(DATABASE_ID, USERS_COLLECTION_ID, "Users")
        # Attributes
        databases.create_string_attribute(DATABASE_ID, USERS_COLLECTION_ID, "email", 255, True)
        databases.create_string_attribute(DATABASE_ID, USERS_COLLECTION_ID, "full_name", 255, True)
        databases.create_string_attribute(DATABASE_ID, USERS_COLLECTION_ID, "hashed_password", 255, True)
        databases.create_string_attribute(DATABASE_ID, USERS_COLLECTION_ID, "subscription_tier", 50, False, "free")
        databases.create_integer_attribute(DATABASE_ID, USERS_COLLECTION_ID, "idea_credits", True, 5)
        databases.create_boolean_attribute(DATABASE_ID, USERS_COLLECTION_ID, "is_active", True, True)
        # Indexes
        print("Waiting for attribute creation to create indexes...")
        # Note: Index creation might fail if attributes aren't ready immediately, skipping for MVP.

    # Create Ideas Collection
    try:
        databases.get_collection(DATABASE_ID, IDEAS_COLLECTION_ID)
        print(f"Collection '{IDEAS_COLLECTION_ID}' exists.")
    except AppwriteException:
        print(f"Collection '{IDEAS_COLLECTION_ID}' not found. Creating...")
        databases.create_collection(DATABASE_ID, IDEAS_COLLECTION_ID, "Ideas")
        # Attributes
        databases.create_string_attribute(DATABASE_ID, IDEAS_COLLECTION_ID, "owner_id", 255, True)
        databases.create_string_attribute(DATABASE_ID, IDEAS_COLLECTION_ID, "name", 255, True)
        databases.create_string_attribute(DATABASE_ID, IDEAS_COLLECTION_ID, "problem", 5000, True)
        databases.create_string_attribute(DATABASE_ID, IDEAS_COLLECTION_ID, "result", 5000, True)
        databases.create_boolean_attribute(DATABASE_ID, IDEAS_COLLECTION_ID, "is_starred", False, False)
        databases.create_datetime_attribute(DATABASE_ID, IDEAS_COLLECTION_ID, "created_at", False)

def get_db_client():
    return databases
