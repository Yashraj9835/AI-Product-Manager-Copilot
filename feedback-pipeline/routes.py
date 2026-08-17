from fastapi import APIRouter, UploadFile, File, HTTPException

import json
import os
import shutil
import time
import traceback
from pathlib import Path

import pandas as pd
from pydantic import BaseModel

from preprocessing.collect_data import merge_all
from preprocessing.validate import validate_dataset
from preprocessing.clean_data import clean_dataset
from preprocessing.normalize import main as normalize_dataset
from preprocessing.feature_engineering import main as feature_engineering

from analysis.batch_analyzer import analyze_batch
from analysis.feature_cluster import cluster_features
from analysis.trend_analysis import analyze_trends
from analysis.llm_client import ask_llm


router = APIRouter()


# ============================================================
# REQUEST MODELS
# ============================================================

class CopilotRequest(BaseModel):
    question: str


class PRDRequest(BaseModel):
    question: str = ""
    feature: str = ""


# ============================================================
# PRD GENERATION
# ============================================================

@router.post("/prd")
async def generate_prd(req: PRDRequest):
    """
    Generate a Product Requirements Document (PRD)
    using the Groq LLM.
    """

    topic = (
        req.question
        or req.feature
        or "New Product Feature"
    )

    prompt = f"""
You are an expert Product Manager.

Generate a structured Product Requirements Document (PRD)
for this feature or topic:

{topic}

Return ONLY valid JSON.
Do NOT use markdown code fences.

Required JSON structure:

{{
  "title": "PRD: {topic}",
  "problem_statement": "Detailed problem statement...",
  "target_users": [
    "Target user 1",
    "Target user 2"
  ],
  "goals": [
    "Goal 1",
    "Goal 2"
  ],
  "requirements": [
    "Requirement 1",
    "Requirement 2"
  ],
  "user_stories": [
    {{
      "story": "As a user, I want X so that Y"
    }}
  ],
  "acceptance_criteria": [
    {{
      "criteria": [
        "Given X, when Y, then Z"
      ]
    }}
  ],
  "success_metrics": [
    "Metric 1",
    "Metric 2"
  ],
  "risks": [
    "Risk 1",
    "Risk 2"
  ]
}}
"""

    try:
        raw_response = ask_llm(prompt)

        cleaned = (
            raw_response
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        return json.loads(cleaned)

    except Exception:
        return {
            "title": f"PRD: {topic}",
            "problem_statement": (
                f"Define requirements for {topic}"
            ),
            "target_users": [
                "General Users",
                "Product Administrators",
            ],
            "goals": [
                "Improve user satisfaction",
                "Streamline product workflow",
            ],
            "requirements": [
                "Requirement 1: System stability",
                "Requirement 2: User interface clarity",
            ],
            "user_stories": [
                {
                    "story": (
                        f"As a user, I want to use {topic} "
                        "easily so that my tasks are completed fast"
                    )
                }
            ],
            "acceptance_criteria": [
                {
                    "criteria": [
                        "Given the user accesses the feature, "
                        "when input is provided, then valid "
                        "output is displayed"
                    ]
                }
            ],
            "success_metrics": [
                "User adoption rate > 80%",
                "Customer satisfaction score > 4.5/5",
            ],
            "risks": [
                "Potential integration delays",
                "User onboarding overhead",
            ],
        }


# ============================================================
# COPILOT
# ============================================================

@router.post("/copilot")
async def copilot_chat(req: CopilotRequest):
    """
    Copilot conversational endpoint using Groq LLM.
    """

    if not req.question or not req.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty",
        )

    prompt = f"""
You are an expert AI Product Manager Copilot
assisting a product manager.

Answer the user's question clearly,
concisely, and accurately.

User Question:

{req.question}
"""

    try:
        answer = ask_llm(prompt)

        return {
            "intent": "analyze",
            "answer": answer,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# ============================================================
# FOLDERS
# ============================================================

UPLOAD_FOLDER = Path("uploads")

UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)

SOURCE_FOLDER = Path(
    "dataset/source_data"
)

SOURCE_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)

PROCESSED_FOLDER = Path(
    "dataset/processed"
)

PROCESSED_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# CSV UPLOAD API
# ============================================================

@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
):
    """
    Complete feedback-analysis pipeline.

    IMPORTANT:
    The preprocessing pipeline may rebuild the combined
    historical dataset, but AI analysis is performed ONLY
    on records belonging to the CSV uploaded in this request.

    Flow:

        CSV upload
            ↓
        preprocessing
            ↓
        identify uploaded records
            ↓
        Groq batch analysis ONLY for uploaded records
            ↓
        category / sentiment / priority
            ↓
        theme / pain point / recommendation
            ↓
        trend analysis
            ↓
        feature clustering
            ↓
        upload-specific analyzed CSV
            ↓
        API response
    """

    print(
        "========== UPLOAD API CALLED =========="
    )

    try:

        # ====================================================
        # VALIDATE FILE
        # ====================================================

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No filename provided.",
            )

        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=400,
                detail="Only CSV files are supported.",
            )


        # ====================================================
        # SAFE FILE NAME
        # ====================================================

        safe_filename = Path(
            file.filename
        ).name

        filepath = (
            UPLOAD_FOLDER
            / safe_filename
        )


        # ====================================================
        # SAVE UPLOADED FILE
        # ====================================================

        with open(
            filepath,
            "wb",
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer,
            )

        print(
            "[OK] File saved:",
            filepath,
        )


        # ====================================================
        # READ UPLOADED CSV
        # ====================================================

        df = pd.read_csv(
            filepath
        )

        print(
            "Uploaded Columns:"
        )

        print(
            df.columns.tolist()
        )

        print(
            "Uploaded Rows:",
            len(df),
        )


        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="Uploaded CSV contains no rows.",
            )


        # ====================================================
        # IDENTIFY UPLOADED RECORDS
        # ====================================================

        uploaded_feedback_ids = set()

        if "feedback_id" in df.columns:

            uploaded_feedback_ids = set(
                df["feedback_id"]
                .dropna()
                .astype(str)
                .str.strip()
                .tolist()
            )

        uploaded_feedback_texts = set()

        if "feedback_text" in df.columns:

            uploaded_feedback_texts = set(
                df["feedback_text"]
                .fillna("")
                .astype(str)
                .str.strip()
                .tolist()
            )


        print(
            "Uploaded feedback IDs:",
            len(uploaded_feedback_ids),
        )

        print(
            "Uploaded feedback texts:",
            len(uploaded_feedback_texts),
        )


        # ====================================================
        # COPY TO SOURCE DATA
        # ====================================================

        destination = (
            SOURCE_FOLDER
            / safe_filename
        )

        shutil.copy(
            filepath,
            destination,
        )

        print(
            "[OK] Copied to source_data"
        )


        # ====================================================
        # PREPROCESSING
        # ====================================================

        print(
            "========== PREPROCESSING =========="
        )

        merge_all()

        print(
            "[OK] merge_all"
        )

        validate_dataset()

        print(
            "[OK] validate_dataset"
        )

        clean_dataset()

        print(
            "[OK] clean_dataset"
        )

        normalize_dataset()

        print(
            "[OK] normalize_dataset"
        )

        feature_engineering()

        print(
            "[OK] feature_engineering"
        )


        # ====================================================
        # LOAD FULL PROCESSED DATASET
        # ====================================================

        processed_path = Path(
            "dataset/processed/"
            "final_feedback_dataset.csv"
        )

        if not processed_path.exists():

            raise Exception(
                f"{processed_path} not found"
            )

        full_processed_df = pd.read_csv(
            processed_path
        )

        print(
            "Full processed rows:",
            len(full_processed_df),
        )


        # ====================================================
        # CHECK FEEDBACK COLUMN
        # ====================================================

        if (
            "feedback_text"
            not in full_processed_df.columns
        ):

            raise Exception(
                "'feedback_text' column missing. "
                f"Columns found: "
                f"{full_processed_df.columns.tolist()}"
            )


        # ====================================================
        # FILTER ONLY UPLOADED RECORDS
        # ====================================================

        print(
            "========== FILTERING UPLOADED RECORDS =========="
        )


        analysis_df = pd.DataFrame()


        # ----------------------------------------------------
        # FIRST TRY: feedback_id
        # ----------------------------------------------------

        if (
            uploaded_feedback_ids
            and "feedback_id"
            in full_processed_df.columns
        ):

            processed_ids = (
                full_processed_df[
                    "feedback_id"
                ]
                .fillna("")
                .astype(str)
                .str.strip()
            )

            analysis_df = full_processed_df[
                processed_ids.isin(
                    uploaded_feedback_ids
                )
            ].copy()


        # ----------------------------------------------------
        # SECOND TRY: feedback_text
        # ----------------------------------------------------

        if analysis_df.empty:

            processed_texts = (
                full_processed_df[
                    "feedback_text"
                ]
                .fillna("")
                .astype(str)
                .str.strip()
            )

            analysis_df = full_processed_df[
                processed_texts.isin(
                    uploaded_feedback_texts
                )
            ].copy()


        # ----------------------------------------------------
        # VERIFY FILTER RESULT
        # ----------------------------------------------------

        print(
            "Uploaded rows:",
            len(df),
        )

        print(
            "Matched processed rows:",
            len(analysis_df),
        )


        if analysis_df.empty:

            raise Exception(
                "Could not match uploaded records "
                "to the processed dataset."
            )


        # ====================================================
        # PREPARE FEEDBACK
        # ====================================================

        print(
            "========== PREPARING FEEDBACK =========="
        )

        feedbacks = (
            analysis_df[
                "feedback_text"
            ]
            .fillna("")
            .astype(str)
            .tolist()
        )

        print(
            "Total feedbacks to analyze:",
            len(feedbacks),
        )


        # ====================================================
        # GROQ BATCH ANALYSIS
        # ====================================================

        print(
            "========== GROQ BATCH ANALYSIS =========="
        )

        # Small batch to control token usage.
        batch_size = 5

        # Delay between requests.
        batch_delay_seconds = 3

        results = []


        # ====================================================
        # PROCESS ONLY UPLOADED RECORDS
        # ====================================================

        for i in range(
            0,
            len(feedbacks),
            batch_size,
        ):

            batch = feedbacks[
                i:i + batch_size
            ]

            batch_start = i + 1

            batch_end = (
                i + len(batch)
            )

            print(
                f"Processing uploaded batch "
                f"{batch_start} - {batch_end}"
            )


            # ------------------------------------------------
            # CALL BATCH ANALYZER
            # ------------------------------------------------

            batch_result = analyze_batch(
                batch
            )


            # ------------------------------------------------
            # VERIFY BATCH RESULT COUNT
            # ------------------------------------------------

            if len(batch_result) != len(batch):

                raise Exception(
                    "AI batch result count mismatch. "
                    f"Expected {len(batch)}, "
                    f"received {len(batch_result)}."
                )


            print(
                f"Batch returned "
                f"{len(batch_result)} results"
            )


            # ------------------------------------------------
            # ADD RESULTS
            # ------------------------------------------------

            results.extend(
                batch_result
            )


            # ------------------------------------------------
            # RATE LIMIT DELAY
            # ------------------------------------------------

            if (
                i + batch_size
                < len(feedbacks)
            ):

                print(
                    f"Waiting "
                    f"{batch_delay_seconds} seconds "
                    "before next Groq request..."
                )

                time.sleep(
                    batch_delay_seconds
                )


        # ====================================================
        # FINAL RESULT COUNT
        # ====================================================

        print(
            "======================================"
        )

        print(
            "UPLOADED FEEDBACKS:",
            len(feedbacks),
        )

        print(
            "AI RESULTS:",
            len(results),
        )

        print(
            "======================================"
        )


        if len(results) != len(analysis_df):

            raise Exception(
                "Final AI result count does not "
                "match uploaded processed rows. "
                f"Expected {len(analysis_df)}, "
                f"received {len(results)}."
            )


        # ====================================================
        # STORE AI RESULTS
        # ====================================================

        categories = []

        sentiments = []

        priorities = []

        themes = []

        pain_points = []

        recommendations = []


        for item in results:

            categories.append(
                item.get(
                    "category",
                    "General Delivery Feedback",
                )
            )

            sentiments.append(
                item.get(
                    "sentiment",
                    "Neutral",
                )
            )

            priorities.append(
                item.get(
                    "priority",
                    "Low",
                )
            )

            themes.append(
                item.get(
                    "theme",
                    "None",
                )
            )

            pain_points.append(
                item.get(
                    "pain_point",
                    "None",
                )
            )

            recommendations.append(
                item.get(
                    "ai_recommendation",
                    "None",
                )
            )


        # ====================================================
        # WRITE AI COLUMNS
        # ====================================================

        analysis_df[
            "category"
        ] = categories

        analysis_df[
            "sentiment"
        ] = sentiments

        analysis_df[
            "priority"
        ] = priorities

        analysis_df[
            "theme"
        ] = themes

        analysis_df[
            "pain_point"
        ] = pain_points

        analysis_df[
            "ai_recommendation"
        ] = recommendations


        print(
            "[OK] Category Classification"
        )

        print(
            "[OK] Sentiment Analysis"
        )

        print(
            "[OK] Priority Detection"
        )

        print(
            "[OK] Theme Extraction"
        )

        print(
            "[OK] Pain Point Detection"
        )

        print(
            "[OK] AI Recommendations"
        )


        # ====================================================
        # SAVE UPLOAD-SPECIFIC ANALYSIS
        # ====================================================

        upload_stem = Path(
            safe_filename
        ).stem

        analyzed_path = (
            PROCESSED_FOLDER
            / f"{upload_stem}_analyzed.csv"
        )

        analysis_df.to_csv(
            analyzed_path,
            index=False,
        )

        print(
            "[OK] Upload-specific analyzed dataset saved:",
            analyzed_path,
        )


        # ====================================================
        # TREND ANALYSIS
        # ====================================================

        print(
            "========== TREND ANALYSIS =========="
        )

        trend_result = analyze_trends(
            themes
        )

        print(
            "[OK] Trend Analysis"
        )


        # ====================================================
        # FEATURE CLUSTERING
        # ====================================================

        print(
            "========== FEATURE CLUSTERING =========="
        )

        feature_clusters = cluster_features(
            pain_points
        )

        print(
            "[OK] Feature Clustering"
        )


        # ====================================================
        # API RESPONSE
        # ====================================================

        return {

            "message":
                "CSV uploaded and analyzed successfully",

            "filename":
                safe_filename,

            "rows":
                len(df),

            "matched_processed_rows":
                len(analysis_df),

            "processed_rows":
                len(results),

            "columns":
                df.columns.tolist(),

            "analyzed_file":
                str(analyzed_path),


            # ------------------------------------------------
            # AI ANALYSIS
            # ------------------------------------------------

            "ai_analysis": [

                {
                    "feedback":
                        item.get(
                            "feedback",
                            "",
                        ),

                    "category":
                        item.get(
                            "category",
                            "General Delivery Feedback",
                        ),

                    "sentiment":
                        item.get(
                            "sentiment",
                            "Neutral",
                        ),

                    "priority":
                        item.get(
                            "priority",
                            "Low",
                        ),

                    "theme":
                        item.get(
                            "theme",
                            "None",
                        ),

                    "pain_point":
                        item.get(
                            "pain_point",
                            "None",
                        ),

                    "ai_recommendation":
                        item.get(
                            "ai_recommendation",
                            "None",
                        ),
                }

                for item in results
            ],


            # ------------------------------------------------
            # BACKWARD-COMPATIBLE THEME EXTRACTION
            # ------------------------------------------------

            "theme_extraction": [

                {
                    "feedback":
                        item.get(
                            "feedback",
                            "",
                        ),

                    "theme":
                        item.get(
                            "theme",
                            "None",
                        ),

                    "pain_point":
                        item.get(
                            "pain_point",
                            "None",
                        ),
                }

                for item in results
            ],


            # ------------------------------------------------
            # TREND ANALYSIS
            # ------------------------------------------------

            "trend_analysis":
                trend_result,


            # ------------------------------------------------
            # FEATURE CLUSTERS
            # ------------------------------------------------

            "feature_clusters":
                feature_clusters,
        }


    # ========================================================
    # ERROR HANDLING
    # ========================================================

    except HTTPException:
        raise

    except Exception as exc:

        print(
            "\n========== ERROR =========="
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )