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


UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


SOURCE_FOLDER = Path("dataset/source_data")
SOURCE_FOLDER.mkdir(parents=True, exist_ok=True)


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):

    print("========== UPLOAD API CALLED ==========")

    try:

        # ----------------------------
        # SAVE UPLOADED FILE
        # ----------------------------

        filepath = os.path.join(
            UPLOAD_FOLDER,
            file.filename
        )

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

        print("✅ File saved:", filepath)


        destination = SOURCE_FOLDER / file.filename

        shutil.copy(
            filepath,
            destination
        )

        print("✅ Copied to source_data")


        df = pd.read_csv(filepath)


        print("Uploaded Columns:")
        print(df.columns.tolist())


        # ----------------------------
        # PREPROCESSING
        # ----------------------------

        print("========== PREPROCESSING ==========")


        merge_all()
        print("✅ merge_all")


        validate_dataset()
        print("✅ validate_dataset")


        clean_dataset()
        print("✅ clean_dataset")


        normalize_dataset()
        print("✅ normalize_dataset")


        feature_engineering()
        print("✅ feature_engineering")



        # ----------------------------
        # LOAD PROCESSED DATA
        # ----------------------------


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
        print(
            analysis_df.columns.tolist()
        )



        if "feedback_text" not in analysis_df.columns:

            raise Exception(
                f"'feedback_text' column missing. "
                f"Columns found: {analysis_df.columns.tolist()}"
            )



        # ----------------------------
        # BATCH GEMINI ANALYSIS
        # ----------------------------


        print("========== GEMINI BATCH ANALYSIS ==========")


        feedbacks = (
            analysis_df["feedback_text"]
            .fillna("")
            .astype(str)
            .tolist()
        )


        batch_size = 20


        results = []


        for i in range(
            0,
            len(feedbacks),
            batch_size
        ):


            batch = feedbacks[
                i:i + batch_size
            ]


            print(
                f"Processing batch {i} - {i + len(batch)}"
            )


            batch_result = analyze_feedback_batch(
                batch
            )


            results.extend(
                batch_result
            )



        print(
            "Total AI Results:",
            len(results)
        )



        # ----------------------------
        # STORE RESULTS
        # ----------------------------


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



        # Safety check
        if len(themes) == len(analysis_df):

            analysis_df["theme"] = themes

            analysis_df["pain_point"] = pain_points


        else:

            print(
                "⚠ Result count mismatch"
            )

            analysis_df["theme"] = None

            analysis_df["pain_point"] = None



        analysis_df.to_csv(
            processed_path,
            index=False
        )


        print("✅ Theme Extraction")
        print("✅ Pain Point Detection")



        # ----------------------------
        # TREND ANALYSIS
        # ----------------------------


        trend_result = analyze_trends(
            themes
        )

        print(
            "✅ Trend Analysis"
        )



        # ----------------------------
        # FEATURE CLUSTERING
        # ----------------------------


        feature_clusters = cluster_features(
            pain_points
        )


        print(
            "✅ Feature Clustering"
        )



        # ----------------------------
        # RESPONSE
        # ----------------------------


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

            "trend_analysis":
                trend_result,

            "feature_clusters":
                feature_clusters
        }



    except Exception as e:

        print(
            "\n========== ERROR =========="
        )

        traceback.print_exc()


        raise HTTPException(
            status_code=500,
            detail=str(e)
        )