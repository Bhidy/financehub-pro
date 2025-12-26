#!/bin/bash
pip install -r requirements-api.txt
uvicorn api:app --reload --host 0.0.0.0 --port 8000
