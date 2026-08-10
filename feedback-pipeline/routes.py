from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import os
import shutil
from pathlib import Path
import traceback

from preprocessing.collect_data import merge_all
from preprocessing.validate import validate_dataset
from preprocessing.clean_data import clean_dataset
from preprocessing.normalize import main as normalize_dataset
from preprocessing.feature_engineering import main as feature_engineering

from analysis.batch_analyzer import analyze_feedback_batch
from analysis.feature_cluster import cluster_features
from analysis.trend_analysis import analyze_trends


router = APIRouter()


# ============================================================
# FOLDERS
# ============================================================

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

SOURCE_FOLDER = Path("dataset/source_data")
SOURCE_FOLDER.mkdir(parents=True, exist_ok=True)


# ============================================================
# CSV UPLOAD API
# ============================================================

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):

    print("========== UPLOAD API CALLED ==========")

    try:

        # ====================================================
        # SAVE UPLOADED FILE
        # ====================================================

        filepath = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        print("[OK] File saved:", filepath)


        # ====================================================
        # COPY TO SOURCE DATA
        # ====================================================

        destination = SOURCE_FOLDER / file.filename

        shutil.copy(
            filepath,
            destination
        )

        print("[OK] Copied to source_data")


        # ====================================================
        # READ UPLOADED CSV
        # ====================================================

        df = pd.read_csv(filepath)

        print("Uploaded Columns:")
        print(df.columns.tolist())

        print("Uploaded Rows:", len(df))


        # ====================================================
        # PREPROCESSING
        # ====================================================

        print("========== PREPROCESSING ==========")

        merge_all()
        print("[OK] merge_all")

        validate_dataset()
        print("[OK] validate_dataset")

        clean_dataset()
        print("[OK] clean_dataset")

        normalize_dataset()
        print("[OK] normalize_dataset")

        feature_engineering()
        print("[OK] feature_engineering")


        # ====================================================
        # LOAD PROCESSED DATA
        # ====================================================

        processed_path = Path(
            "dataset/processed/final_feedback_dataset.csv"
        )

        if not processed_path.exists():
            raise Exception(
                f"{processed_path} not found"
            )

        analysis_df = pd.read_csv(
            processed_path
        )

        print("Processed Columns:")
        print(analysis_df.columns.tolist())

        print(
            "Processed Rows:",
            len(analysis_df)
        )


        # ====================================================
        # CHECK FEEDBACK COLUMN
        # ====================================================

        if "feedback_text" not in analysis_df.columns:

            raise Exception(
                "'feedback_text' column missing. "
                f"Columns found: {analysis_df.columns.tolist()}"
            )


        # ====================================================
        # PREPARE FEEDBACK
        # ====================================================

        print("========== PREPARING FEEDBACK ==========")

        feedbacks = (
            analysis_df["feedback_text"]
            .fillna("")
            .astype(str)
            .tolist()
        )

        print(
            "Total feedbacks to analyze:",
            len(feedbacks)
        )


        # ====================================================
        # GROQ BATCH ANALYSIS
        # ====================================================

        print("========== GROQ BATCH ANALYSIS ==========")

        # Number of feedback records per API request
        batch_size = 10

        results = []


        # ----------------------------------------------------
        # PROCESS FEEDBACK IN BATCHES
        # ----------------------------------------------------

        for i in range(
            0,
            len(feedbacks),
            batch_size
        ):

            batch = feedbacks[
                i:i + batch_size
            ]

            batch_start = i + 1
            batch_end = i + len(batch)

            print(
                f"Processing batch "
                f"{batch_start} - {batch_end}"
            )


            # Send ONE request for this batch
            batch_result = analyze_feedback_batch(
                batch
            )


            print(
                f"Batch returned "
                f"{len(batch_result)} results"
            )


            # Add batch results to overall results
            results.extend(
                batch_result
            )


        # ====================================================
        # FINAL BATCH SUMMARY
        # ====================================================

        print(
            "======================================"
        )

        print(
            "TOTAL FEEDBACKS:",
            len(feedbacks)
        )

        print(
            "TOTAL AI RESULTS:",
            len(results)
        )

        print(
            "======================================"
        )


        # ====================================================
        # STORE THEME AND PAIN POINT RESULTS
        # ====================================================

        themes = []
        pain_points = []


        for item in results:

            themes.append(
                item.get(
                    "theme",
                    "Unknown"
                )
            )

            pain_points.append(
                item.get(
                    "pain_point",
                    "Unknown"
                )
            )


        # ====================================================
        # SAFETY CHECK
        # ====================================================

        if len(results) == len(analysis_df):

            analysis_df["theme"] = themes

            analysis_df["pain_point"] = pain_points

            print(
                "[OK] Result count matches feedback count"
            )

        else:

            print(
                "[WARN] Result count mismatch"
            )

            print(
                "Expected:",
                len(analysis_df)
            )

            print(
                "Received:",
                len(results)
            )

            # Keep columns but mark unavailable results
            analysis_df["theme"] = None

            analysis_df["pain_point"] = None


        # ====================================================
        # SAVE ANALYZED DATASET
        # ====================================================

        analysis_df.to_csv(
            processed_path,
            index=False
        )

        print(
            "[OK] Analyzed dataset saved"
        )

        print(
            "[OK] Theme Extraction"
        )

        print(
            "[OK] Pain Point Detection"
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
                "CSV uploaded successfully",

            "filename":
                file.filename,

            "rows":
                len(df),

            "processed_rows":
                len(results),

            "columns":
                df.columns.tolist(),

            "theme_extraction": [

                {
                    "feedback":
                        item.get(
                            "feedback",
                            ""
                        ),

                    "theme":
                        item.get(
                            "theme",
                            "Unknown"
                        ),

                    "pain_point":
                        item.get(
                            "pain_point",
                            "Unknown"
                        )
                }

                for item in results

            ],

            "trend_analysis":
                trend_result,

            "feature_clusters":
                feature_clusters
        }


    # ========================================================
    # ERROR HANDLING
    # ========================================================

    except Exception as e:

        print(
            "\n========== ERROR =========="
        )

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )