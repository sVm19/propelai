# 1. Base Image
FROM python:3.11-slim

# 2. Set the working directory to the backend folder
# All commands will be run relative to this path (/app/backend)
WORKDIR /app/backend

# 3. Copy and Install Dependencies (efficient caching)
# Note: Source is relative to the root build context (./backend/requirements.txt)
# Destination is relative to WORKDIR (./requirements.txt)
COPY ./backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy the rest of the application files
# Copies everything from the project root (including your frontend) into /app
COPY . /app

# 5. Command to run the Uvicorn ASGI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]