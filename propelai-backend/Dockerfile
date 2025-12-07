# 1. Base Image
# Use a slim version of Python for a smaller image size
FROM python:3.9-slim-buster

# 2. Set Working Directory
# This is the directory inside the container where your application code will reside
WORKDIR /app

# 3. Copy and Install Dependencies
# Copy requirements.txt first to leverage Docker cache.
# If requirements.txt doesn't change, this layer won't be rebuilt.
COPY propelai-backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy Application Code
# Copy the main application file and the src directory
COPY propelai-backend/main.py .
COPY propelai-backend/src ./src

# 5. Expose Port
# FastAPI typically runs on port 8000
EXPOSE 8000

# 6. Command to Run the Application
# Use Uvicorn to run your FastAPI application.
# `main:app` refers to the `app` object in `main.py`.
# `--host 0.0.0.0` makes the application accessible from outside the container.
# `--port 8000` specifies the port to listen on.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]