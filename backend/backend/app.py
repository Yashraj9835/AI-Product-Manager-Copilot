from fastapi import FastAPI
from routes import router

app = FastAPI(
    title="AI Product Manager Copilot",
    description="Restaurant Feedback Analysis System",
    version="1.0.0"
)

# Register routes from routes.py
app.include_router(router)

@app.get("/")
def root():
    return {
        "project": "AI Product Manager Copilot",
        "message": "Backend Started Successfully"
    }