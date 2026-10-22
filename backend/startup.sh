#!/bin/sh
set -e

# Hugging Face Spaces routes external traffic to port 7860
export PORT=7860

echo "==> Running prisma migrate deploy..."
npx prisma migrate deploy || true

echo "==> Starting server on port $PORT..."
exec node dist/main.js