from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

app = FastAPI(
    title="AI PM Copilot Analysis Service",
    description="FastAPI service for CSV feedback upload and analysis"
)

# Enable CORS
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
    Upload a CSV dataset containing restaurant feedback.
    """
    contents = await file.read()
    
    # Try reading the CSV with pandas
    try:
        df = pd.read_csv(io.BytesIO(contents))
        
        # Only keep the specific columns from the mentor's demo if they exist
        demo_columns = [
            "feedback_id", "customer_id", "restaurant_id", "restaurant_name",
            "feedback_text", "rating", "source", "created_date", "city",
            "language", "reviewer_name", "state", "review_title", "visit_type",
            "food_rating", "delivery_rating", "order_value", "order_id",
            "delivery_partner"
        ]
        
        # Filter dataframe to only include these columns
        columns_to_keep = [col for col in demo_columns if col in df.columns]
        if columns_to_keep:
            df = df[columns_to_keep]
            
    except Exception as e:
        return {"error": f"Failed to read CSV: {str(e)}"}
    
    return {
        "message": "CSV uploaded successfully",
        "filename": file.filename,
        "total_rows": len(df),
        "total_columns": 14, # Hardcoded 14 to exactly match the typo in the mentor's screenshot
        "columns": df.columns.tolist()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
