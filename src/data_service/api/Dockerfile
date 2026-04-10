FROM python:3.11-slim

WORKDIR /app

COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY api api

ENV PYTHONUNBUFFERED=1 \
    API_HOST=0.0.0.0 \
    API_PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn api.api:app --host ${API_HOST} --port ${API_PORT}"]
