# PropelAI — Contextual Startup Idea Generator

PropelAI is a two-part project:
- A Chrome Extension (Manifest V3) that extracts the main text from the webpage you’re viewing and asks the backend to generate startup ideas.
- A FastAPI backend that summarizes the text, extracts keywords, calls the Gemini LLM for 3 structured ideas, and stores idea history in Postgres with simple credit gating.

## Repository Structure

```
PropelAi/
├── propelai-backend/           # FastAPI app, NLP, database models, Docker setup
│   ├── main.py                 # API entrypoint (FastAPI app)
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # Container image for FastAPI
│   ├── docker-compose.yml      # App + Postgres dev stack
│   ├── .env                    # Environment variables (DO NOT COMMIT)
│   └── src/
│       ├── nlp_processor.py    # Summarization, keywords, Gemini LLM call
│       └── database.py         # SQLAlchemy models, session, table creation
└── propelai-extension/         # Chrome Extension (MV3)
    ├── manifest.json           # Extension config
    ├── scripts/
    │   ├── content_script.js   # Extracts main content from pages
    │   └── service_worker.js   # Talks to backend API
    └── popup/
        ├── popup.html          # UI for generating ideas
        └── popup.js            # Popup event handlers and render logic
```

## Features

- Extracts meaningful content blocks from webpages and cleans them.
- Summarizes text and extracts keywords with Sumy and YAKE.
- Calls Gemini LLM to produce exactly 3 ideas in a strict JSON schema (Name, Problem, Solution).
- Persists generated ideas to Postgres and gates free-tier usage via credits.
- Dockerized for easy local development, with health check endpoint.

## Tech Stack

- Backend: FastAPI, Uvicorn, Pydantic, SQLAlchemy, Postgres
- NLP: BeautifulSoup, Sumy (LSA), YAKE
- LLM: Google Gemini (via REST API)
- Extension: Chrome Manifest V3 (content script + service worker + popup)

## Getting Started (Backend)

### Prerequisites
- Python 3.11+
- Docker (optional for quick setup)
- A Postgres database (local via Docker or hosted)
- A Gemini API key

### Environment Variables
Create propelai-backend/.env (do NOT commit) and set:

- GEMINI_API_KEY=your_gemini_api_key
- SECRET_KEY=your_fastapi_secret_key
- POSTGRES_SERVER=db
- POSTGRES_DB=propelai_db
- POSTGRES_USER=propelai_user
- POSTGRES_PASSWORD=very_secure_password
- DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>

Notes:
- The backend reads DATABASE_URL directly for SQLAlchemy.
- Tables are auto-created at startup via create_database_tables().

### Run with Docker Compose (recommended)

1. Open a terminal in propelai-backend.
2. Start the stack:
   - docker-compose up -d
3. Verify the API:
   - Visit http://localhost:8000/health -> {"status":"ok","service":"PropelAI"}

To stop: docker-compose down

### Run Locally without Docker

1. Open a terminal in propelai-backend.
2. Install dependencies:
   - pip install -r requirements.txt
3. Ensure .env is present with required variables.
4. Start the dev server:
   - python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
5. Health check: http://localhost:8000/health

### API Reference

- POST /generate
  - Request body:
    {
      "url": "https://example.com/article",
      "text_content": "<extracted page text>",
      "user_id": "unique_user_id"
    }
  - Returns: { status, message, ideas: [{ Name, Problem, Solution }] }
  - Errors:
    - 400: Text too short (<150 chars)
    - 403: Free-tier credits exhausted
    - 500: Processing or external API error

- GET /health
  - Returns a simple ok status.

## Getting Started (Chrome Extension)

### Load the Extension

1. In Chrome, go to chrome://extensions.
2. Toggle “Developer mode” on.
3. Click “Load unpacked” and select the propelai-extension folder.

### Configure Backend URL

- In propelai-extension/scripts/service_worker.js, set:
  - const BACKEND_API_URL = 'http://localhost:8000/generate';
- In manifest.json, for local development, update host_permissions to:
  - "http://localhost:8000/*"

### Use the Extension

- Navigate to a content-rich webpage (e.g., articles, blog posts).
- Click the PropelAI icon, then “Generate Ideas From This Page”.
- The popup shows status updates, and renders the three generated ideas on success.
- If page content is too short (<150 chars), you’ll see a validation error.

## Data Model

- User: subscription_tier (free/pro/team), idea_credits, is_active, ideas relationship.
- Idea: owner_id -> users.id, name, problem, solution, source_url, generated_at.
- Tables are created automatically on app startup.

## Deployment Notes

- Backend can be containerized (Dockerfile provided) and deployed to your preferred platform.
- Ensure environment variables are set securely on the platform.
- Update BACKEND_API_URL in the extension and host_permissions to your production domain.

## Security & Best Practices

- Do not commit secrets or .env to version control.
- Restrict CORS/host permissions to your own domain in production.
- Consider adding authentication and proper user management for Pro/Team tiers.

## Roadmap

- Phase 1: Core idea generation from webpage context (done).
- Phase 2: Improved extraction heuristics and UX.
- Phase 3: Subscription management, authentication, credit billing, and dashboards.

## License

TBD. Choose a license (e.g., MIT) that fits your needs and add a LICENSE file.