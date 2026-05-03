FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Shell form so $PORT expands; Railway also injects startCommand — use sh -c there if overriding CMD.
CMD ["sh", "-c", "exec gunicorn lung_cancer_api.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]