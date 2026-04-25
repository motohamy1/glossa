FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY apps/ml-service/requirements.txt .
# Install CPU version of PyTorch to save space and avoid network timeouts
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# Copy source code
COPY apps/ml-service /app

# Pre-download the model during build (optional, but speeds up first run)
# RUN python -c "from transformers import pipeline; pipeline('text2text-generation', model='google/flan-t5-base')"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
