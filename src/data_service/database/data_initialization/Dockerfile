FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/database/data_initialization

# Install only what this loader needs
COPY database/data_initialization/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

# Keep the expected repo-style paths so useful_functions can be imported
COPY database/data_initialization/main.py /app/database/data_initialization/main.py

ENTRYPOINT ["python", "/app/database/data_initialization/main.py"]
