#!/bin/bash
export PYTHONPATH=$PYTHONPATH:/code

# Start the application
uvicorn app.main:app --host 0.0.0.0 --port 7860
