# Use a battle-tested base image optimized for Uvicorn and Gunicorn
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11

# Stage 2: Set up the working directory inside the container
WORKDIR /app

# Stage 3: Install dependencies
# Copy the requirements file first to take advantage of Docker layer caching
COPY requirements.txt /app/

# Install the dependencies
# Note: This image may already contain many dependencies, but installing them
# ensures everything from your requirements.txt is included.
RUN pip install --no-cache-dir -r requirements.txt

# Stage 4: Copy the rest of the application code
# Copy main.py and the src directory
COPY ./main.py /app/main.py
COPY ./src /app/src

# Gunicorn/Uvicorn automatically looks for the 'app' object in 'main.py'
# The base image already has the final CMD command configured for production!