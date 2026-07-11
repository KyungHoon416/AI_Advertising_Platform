FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps for psycopg/bcrypt build if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install .

COPY . .

EXPOSE 8000

# Apply migrations, seed, then serve. Honors Cloud Run's $PORT (default 8000).
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed.seed && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
