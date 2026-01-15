from fastapi import FastAPI
import os

app = FastAPI()

@app.get("/health")
def health_check():
    return {"status": "healthy", "mode": "minimal", "port": os.environ.get("PORT")}

@app.get("/")
def root():
    return {"message": "Minimal Deployment working"}

if __name__ == "__main__":
    import uvicorn
    import sys
    
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting minimal app on port {port}...", file=sys.stderr)
    uvicorn.run("app.main_minimal:app", host="0.0.0.0", port=port, reload=False)
