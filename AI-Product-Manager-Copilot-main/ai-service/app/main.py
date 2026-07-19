from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="AI Product Manager Copilot API",
    version="1.0.0"
)

app.include_router(router)


@app.get("/")
def health():
    return {
        "status": "running",
        "service": "AI Product Manager Copilot"
    }