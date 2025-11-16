FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy XTTS service files
COPY src/tts/xtts-service.py /app/
COPY src/tts/xtts-client.py /app/
COPY requirements-xtts.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-xtts.txt

# Create directories
RUN mkdir -p /app/voice-profiles /app/models

# Set environment variables
ENV COQUI_TOS_AGREED=1
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run XTTS service
CMD ["python", "xtts-service.py"]
