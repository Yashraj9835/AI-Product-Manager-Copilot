import io
import sys

import pandas as pd
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Make the merged AI analysis package available.
sys.path.insert(0, "backend/backend")

from analysis.batch_analyzer import analyze_feedback_batch


app = FastAPI(
    title="AI PM Copilot Analysis Service",
    description="FastAPI service for CSV feedback upload and AI analysis",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload a CSV dataset and return basic dataset information.
    """
    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        return {"error": f"Failed to read CSV: {str(e)}"}

    return {
        "message": "CSV uploaded successfully",
        "filename": file.filename,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": df.columns.tolist(),
    }


@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    """
    Upload a CSV and analyze the first 3 feedback records
    using Gemini for theme and pain-point extraction.
    """
    contents = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        return {"error": f"Failed to read CSV: {str(e)}"}

    if "feedback_text" not in df.columns:
        return {
            "error": "CSV must contain a 'feedback_text' column",
            "columns": df.columns.tolist(),
        }

    feedback = (
        df["feedback_text"]
        .dropna()
        .astype(str)
        .head(3)
        .tolist()
    )

    if not feedback:
        return {
            "error": "No feedback records found in 'feedback_text'"
        }

    try:
        results = analyze_feedback_batch(feedback)
    except Exception as e:
        return {
            "error": f"AI analysis failed: {str(e)}"
        }

    return {
        "message": "AI analysis completed",
        "filename": file.filename,
        "records_analyzed": len(feedback),
        "results": results,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )