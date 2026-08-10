from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import router

app = FastAPI(
    title="AI Product Manager Copilot",
    description="Restaurant Feedback Analysis System",
    version="1.0.0"
)

# -----------------------------
# CORS
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Routes
# -----------------------------

app.include_router(router)


@app.get("/")
def root():
    return {
        "project": "AI Product Manager Copilot",
        "message": "Backend Started Successfully"
    }