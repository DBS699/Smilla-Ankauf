#!/bin/bash

# Start backend in background
cd /app/backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001} &

# Build and serve frontend
cd /app/frontend
yarn install
yarn build

# Serve frontend with a simple server (or use backend to serve)
npx serve -s build -l ${FRONTEND_PORT:-3000}
