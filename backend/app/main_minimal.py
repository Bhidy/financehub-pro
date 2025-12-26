from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "healthy", "mode": "minimal", "port": os.environ.get("PORT")}

@app.get("/")
def root():
    return {"message": "Minimal Deployment working"}
