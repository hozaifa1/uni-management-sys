#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Build Start"

# Upgrade pip to ensure latest wheel support
python3.12 -m pip install --upgrade pip

# Install dependencies
python3.12 -m pip install -r requirements.txt

# Run database migrations
echo "Running migrations..."
python3.12 manage.py migrate --noinput

# Create staticfiles_build directory if it doesn't exist
mkdir -p staticfiles_build/static

# Collect static files
# The target directory matches vercel.json 'distDir'
python3.12 manage.py collectstatic --noinput --clear

echo "Build End"
