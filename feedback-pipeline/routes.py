from fastapi import APIRouter, UploadFile, File, HTTPException

import json
import shutil
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

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
# BASE DIRECTORIES
# ============================================================

# routes.py is inside:
#
# D:\AI-Product-Manager-Copilot\feedback-pipeline
#
# Therefore BASE_DIR points to feedback-pipeline.
BASE_DIR = Path(__file__).resolve().parent


UPLOAD_FOLDER = BASE_DIR / "uploads"

SOURCE_FOLDER = (
    BASE_DIR
    / "dataset"
    / "source_data"
)

PROCESSED_FOLDER = (
    BASE_DIR
    / "dataset"
    / "processed"
)

PRD_FOLDER = (
    BASE_DIR
    / "data"
    / "prds"
)


UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)

SOURCE_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)

PROCESSED_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)

PRD_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# REQUEST MODELS
# ============================================================


class CopilotRequest(BaseModel):
    question: str


class PRDRequest(BaseModel):
    question: str = ""
    feature: str = ""
    sections: list[str] | None = None
    num_stories: int = 3


# ============================================================
# HELPER FUNCTIONS
# ============================================================


def is_rate_limit_error(error: Exception) -> bool:
    """
    Detect Groq/API rate-limit errors.
    """

    error_text = str(error).lower()

    return (
        "429" in error_text
        or "rate limit" in error_text
        or "rate_limit" in error_text
        or "tokens per day" in error_text
        or "too many requests" in error_text
    )


def clean_llm_json(raw_response: str) -> str:
    """
    Remove common markdown wrappers around JSON.
    """

    cleaned = (
        raw_response
        .replace("```json", "")
        .replace("```JSON", "")
        .replace("```", "")
        .strip()
    )

    return cleaned


def get_counts(
    dataframe: pd.DataFrame,
    column: str,
) -> dict:
    """
    Return the top values for a dataframe column.

    Missing columns are safely ignored because the current
    processed dataset does not necessarily contain every
    AI-generated column.
    """

    if column not in dataframe.columns:
        return {}

    values = (
        dataframe[column]
        .fillna("Unknown")
        .astype(str)
        .str.strip()
    )

    values = values[
        values != ""
    ]

    if values.empty:
        return {}

    return (
        values
        .value_counts()
        .head(10)
        .to_dict()
    )


def save_prd(
    result: dict,
    topic: str,
) -> tuple[str, str]:
    """
    Save the generated PRD as a JSON file.

    Returns:
        prd_id
        saved_file
    """

    prd_id = (
        f"prd_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_"
        f"{uuid4().hex[:8]}"
    )

    created_at = (
        datetime.now(timezone.utc)
        .isoformat()
    )

    result["generation_metadata"]["prd_id"] = prd_id

    result["generation_metadata"]["created_at"] = created_at

    result["generation_metadata"]["storage"] = "data/prds"

    safe_topic = "".join(
        character
        if character.isalnum()
        else "_"
        for character in topic
    ).strip("_")

    if not safe_topic:
        safe_topic = "product_feature"

    safe_topic = safe_topic[:60]

    filename = (
        f"{prd_id}_{safe_topic}.json"
    )

    filepath = (
        PRD_FOLDER
        / filename
    )

    with open(
        filepath,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False,
        )

    return (
        prd_id,
        str(filepath),
    )


# ============================================================
# PRD GENERATION
# ============================================================


@router.post("/prd")
@router.post("/prd/generate")
async def generate_prd(
    req: PRDRequest,
):
    """
    Generate a context-aware Product Requirements Document.

    Flow:

        Feature
          ↓
        Processed feedback dataset
          ↓
        Related customer feedback
          ↓
        Themes / pain points / priorities
          ↓
        Rating + feedback signals
          ↓
        Segment information
          ↓
        Real customer quotes
          ↓
        Context-rich LLM prompt
          ↓
        Structured JSON PRD
          ↓
        JSON validation
          ↓
        Save PRD to data/prds
          ↓
        Return PRD
    """

    # ========================================================
    # 1. DETERMINE FEATURE
    # ========================================================

    topic = (
        (req.feature or "").strip()
        or (req.question or "").strip()
        or "New Product Feature"
    )

    # ========================================================
    # 2. LOAD PROCESSED DATASET
    # ========================================================

    processed_path = (
        PROCESSED_FOLDER
        / "final_feedback_dataset.csv"
    )

    if not processed_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Processed feedback dataset not found. "
                "Run the feedback pipeline first."
            ),
        )

    try:

        feedback_df = pd.read_csv(
            processed_path
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Could not read feedback dataset: {exc}"
            ),
        )

    # ========================================================
    # 3. VALIDATE DATASET
    # ========================================================

    if "feedback_text" not in feedback_df.columns:

        raise HTTPException(
            status_code=500,
            detail=(
                "feedback_text column is missing from "
                "the processed feedback dataset."
            ),
        )

    if feedback_df.empty:

        raise HTTPException(
            status_code=404,
            detail=(
                "Processed feedback dataset contains no rows."
            ),
        )

    # ========================================================
    # 4. FIND RELATED FEEDBACK
    # ========================================================

    topic_words = [
        word.lower()
        for word in topic.split()
        if len(word) > 2
    ]

    if topic_words:

        search_mask = (
            feedback_df["feedback_text"]
            .fillna("")
            .astype(str)
            .str.lower()
            .apply(
                lambda text: any(
                    word in text
                    for word in topic_words
                )
            )
        )

        related_df = feedback_df[
            search_mask
        ].copy()

    else:

        related_df = feedback_df.copy()

    # --------------------------------------------------------
    # FALLBACK
    # --------------------------------------------------------

    # If no exact keyword match exists, provide real
    # customer feedback rather than sending an empty context.

    if related_df.empty:

        related_df = feedback_df.copy()

    # Keep context reasonably small.

    related_df = related_df.head(50)

    # ========================================================
    # 5. DATASET ANALYTICS
    # ========================================================

    # The current processed dataset contains fields such as:
    #
    # sentiment_hint
    # feedback_priority
    # theme
    # pain_point
    #
    # Some AI-generated columns may not exist yet.
    # get_counts() safely handles missing columns.

    category_counts = get_counts(
        related_df,
        "category",
    )

    sentiment_counts = get_counts(
        related_df,
        "sentiment_hint",
    )

    priority_counts = get_counts(
        related_df,
        "feedback_priority",
    )

    theme_counts = get_counts(
        related_df,
        "theme",
    )

    pain_point_counts = get_counts(
        related_df,
        "pain_point",
    )

    # ========================================================
    # 6. RATING ANALYSIS
    # ========================================================

    rating_summary = {}

    if "rating" in related_df.columns:

        ratings = pd.to_numeric(
            related_df["rating"],
            errors="coerce",
        ).dropna()

        if not ratings.empty:

            rating_summary = {
                "average_rating": round(
                    float(ratings.mean()),
                    2,
                ),
                "minimum_rating": float(
                    ratings.min()
                ),
                "maximum_rating": float(
                    ratings.max()
                ),
                "rating_count": int(
                    ratings.count()
                ),
            }

    # ========================================================
    # 7. FEEDBACK SIGNALS
    # ========================================================

    feedback_signals = {}

    signal_columns = [
        "contains_complaint",
        "contains_praise",
        "contains_request",
        "contains_bug",
        "contains_delivery_issue",
        "contains_service_issue",
        "contains_food_issue",
    ]

    for column in signal_columns:

        if column not in related_df.columns:
            continue

        values = (
            related_df[column]
            .fillna(False)
            .astype(str)
            .str.lower()
            .str.strip()
        )

        feedback_signals[column] = int(
            values.isin(
                [
                    "true",
                    "1",
                    "yes",
                ]
            ).sum()
        )

    # ========================================================
    # 8. SEGMENT BREAKDOWN
    # ========================================================

    segment_breakdown = {}

    segment_columns = [
        "platform",
        "source",
        "language",
        "city",
        "visit_type",
    ]

    for column in segment_columns:

        if column in related_df.columns:

            segment_breakdown[column] = get_counts(
                related_df,
                column,
            )

    # ========================================================
    # 9. REAL CUSTOMER QUOTES
    # ========================================================

    customer_quotes = (
        related_df["feedback_text"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    customer_quotes = (
        customer_quotes[
            customer_quotes != ""
        ]
        .head(5)
        .tolist()
    )

    # ========================================================
    # 10. BUILD REAL PRODUCT CONTEXT
    # ========================================================

    context = f"""
FEATURE / TOPIC:
{topic}

RELATED FEEDBACK COUNT:
{len(related_df)}

TOTAL DATASET FEEDBACK COUNT:
{len(feedback_df)}

CATEGORY BREAKDOWN:
{json.dumps(category_counts, indent=2)}

SENTIMENT BREAKDOWN:
{json.dumps(sentiment_counts, indent=2)}

PRIORITY BREAKDOWN:
{json.dumps(priority_counts, indent=2)}

TOP THEMES:
{json.dumps(theme_counts, indent=2)}

TOP PAIN POINTS:
{json.dumps(pain_point_counts, indent=2)}

RATING SUMMARY:
{json.dumps(rating_summary, indent=2)}

FEEDBACK SIGNALS:
{json.dumps(feedback_signals, indent=2)}

SEGMENT BREAKDOWN:
{json.dumps(segment_breakdown, indent=2)}

REAL CUSTOMER QUOTES:
{json.dumps(customer_quotes, indent=2)}
"""

    # ========================================================
    # 11. REQUESTED PRD SECTIONS
    # ========================================================

    requested_sections = (
        req.sections
        if req.sections
        else [
            "problem_statement",
            "target_users",
            "goals",
            "requirements",
            "user_stories",
            "acceptance_criteria",
            "success_metrics",
            "risks",
        ]
    )

    story_count = max(
        req.num_stories,
        1,
    )

    # ========================================================
    # 12. BUILD CONTEXT-RICH PROMPT
    # ========================================================

    prompt = f"""
You are an expert Product Manager.

Create a structured Product Requirements Document (PRD)
for this feature:

{topic}

IMPORTANT RULES:

1. Use the provided customer feedback as evidence.
2. Do not invent customer quotes.
3. Do not invent statistics.
4. Use real numbers from the provided context when useful.
5. Use the actual themes and pain points.
6. Use rating information when available.
7. Consider the feedback signals.
8. Consider platform, source, language, city,
   and visit-type information when relevant.
9. If evidence is unavailable, say that evidence is
   unavailable instead of inventing it.
10. Return ONLY valid JSON.
11. Do NOT return markdown.
12. Do NOT use ```json.
13. Do NOT include explanations outside JSON.

REAL PRODUCT CONTEXT:

{context}

REQUESTED PRD SECTIONS:

{json.dumps(requested_sections, indent=2)}

Return exactly this JSON structure:

{{
  "title": "PRD: {topic}",

  "problem_statement":
    "Problem supported by customer evidence.",

  "target_users": [
    "Target user"
  ],

  "goals": [
    "Product goal"
  ],

  "requirements": [
    "Functional requirement"
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
    "Measurable success metric"
  ],

  "risks": [
    "Potential risk"
  ]
}}

Generate exactly {story_count} user stories.
"""

    # ========================================================
    # 13. CALL LLM
    # ========================================================

    try:

        raw_response = ask_llm(
            prompt
        )

        cleaned = clean_llm_json(
            raw_response
        )

        result = json.loads(
            cleaned
        )

    except Exception as first_error:

        # ----------------------------------------------------
        # RATE LIMIT
        # ----------------------------------------------------

        if is_rate_limit_error(
            first_error
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Groq API rate limit reached. "
                    "Please wait until the Groq token limit "
                    "resets before generating the PRD."
                ),
            )

        print(
            "[WARN] First PRD generation attempt failed:"
        )

        print(
            first_error
        )

        # ----------------------------------------------------
        # RETRY ONCE ONLY FOR NON-RATE-LIMIT ERRORS
        # ----------------------------------------------------

        retry_prompt = prompt + """

RETRY INSTRUCTION:

The previous response could not be parsed.

Return ONLY one valid JSON object.

The JSON MUST contain:

title
problem_statement
target_users
goals
requirements
user_stories
acceptance_criteria
success_metrics
risks

Do not include markdown.
Do not include explanations.
"""

        try:

            raw_response = ask_llm(
                retry_prompt
            )

            cleaned = clean_llm_json(
                raw_response
            )

            result = json.loads(
                cleaned
            )

        except Exception as second_error:

            if is_rate_limit_error(
                second_error
            ):

                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Groq API rate limit reached. "
                        "Please wait until the Groq token limit "
                        "resets before generating the PRD."
                    ),
                )

            print(
                "[ERROR] PRD generation failed after retry:"
            )

            print(
                second_error
            )

            raise HTTPException(
                status_code=500,
                detail=(
                    "PRD generation failed because the "
                    "LLM returned an invalid response."
                ),
            )

    # ========================================================
    # 14. VALIDATE JSON OBJECT
    # ========================================================

    if not isinstance(
        result,
        dict,
    ):

        raise HTTPException(
            status_code=500,
            detail=(
                "Generated PRD is not a valid JSON object."
            ),
        )

    # ========================================================
    # 15. VALIDATE REQUIRED PRD SECTIONS
    # ========================================================

    required_keys = [
        "title",
        "problem_statement",
        "target_users",
        "goals",
        "requirements",
        "user_stories",
        "acceptance_criteria",
        "success_metrics",
        "risks",
    ]

    missing_sections = [
        key
        for key in required_keys
        if key not in result
    ]

    if missing_sections:

        raise HTTPException(
            status_code=500,
            detail={
                "message": (
                    "Generated PRD is incomplete."
                ),
                "missing_sections": (
                    missing_sections
                ),
            },
        )

    # ========================================================
    # 16. VALIDATE USER STORIES
    # ========================================================

    valid_stories = []

    for story in result.get(
        "user_stories",
        [],
    ):

        if (
            isinstance(story, dict)
            and story.get("story")
        ):

            valid_stories.append(
                story
            )

    if not valid_stories:

        raise HTTPException(
            status_code=500,
            detail=(
                "Generated PRD contains no valid "
                "user stories."
            ),
        )

    result[
        "user_stories"
    ] = valid_stories

    # ========================================================
    # 17. VALIDATE ACCEPTANCE CRITERIA
    # ========================================================

    valid_criteria = []

    for item in result.get(
        "acceptance_criteria",
        [],
    ):

        if not isinstance(
            item,
            dict,
        ):
            continue

        criteria = item.get(
            "criteria"
        )

        if (
            isinstance(
                criteria,
                list,
            )
            and criteria
        ):

            valid_criteria.append(
                {
                    "criteria": criteria
                }
            )

    if not valid_criteria:

        raise HTTPException(
            status_code=500,
            detail=(
                "Generated PRD contains no valid "
                "acceptance criteria."
            ),
        )

    result[
        "acceptance_criteria"
    ] = valid_criteria

    # ========================================================
    # 18. GENERATION METADATA
    # ========================================================

    result[
        "generation_metadata"
    ] = {
        "feature": topic,

        "related_feedback_count":
            len(related_df),

        "total_feedback_count":
            len(feedback_df),

        "context_sources": [
            "customer_feedback",
            "sentiment_hint",
            "feedback_priority",
            "theme",
            "pain_point",
            "rating",
            "feedback_signals",
            "segment_breakdown",
        ],

        "model_context":
            "Groq",

        "status":
            "draft",
    }

    # ========================================================
    # 19. SAVE PRD
    # ========================================================

    try:

        prd_id, saved_file = save_prd(
            result,
            topic,
        )

    except Exception as exc:

        print(
            "[ERROR] Could not save generated PRD:"
        )

        print(
            exc
        )

        raise HTTPException(
            status_code=500,
            detail=(
                f"PRD generated successfully but "
                f"could not be saved: {exc}"
            ),
        )

    result[
        "generation_metadata"
    ][
        "saved_file"
    ] = saved_file

    # ========================================================
    # 20. LOG RESULT
    # ========================================================

    print(
        "[OK] Context-aware PRD generated"
    )

    print(
        "[OK] Feature:",
        topic,
    )

    print(
        "[OK] Related feedback:",
        len(related_df),
    )

    print(
        "[OK] PRD ID:",
        prd_id,
    )

    print(
        "[OK] PRD saved:",
        saved_file,
    )

    return result


# ============================================================
# COPILOT
# ============================================================


@router.post("/copilot")
async def copilot_chat(
    req: CopilotRequest,
):
    """
    Copilot conversational endpoint using Groq LLM.
    """

    if (
        not req.question
        or not req.question.strip()
    ):

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

        answer = ask_llm(
            prompt
        )

        return {
            "intent": "analyze",
            "answer": answer,
        }

    except Exception as exc:

        if is_rate_limit_error(
            exc
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Groq API rate limit reached. "
                    "Please wait until the limit resets."
                ),
            )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
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

    Flow:

        CSV upload
            ↓
        preprocessing
            ↓
        identify uploaded records
            ↓
        Groq batch analysis
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
        # 1. VALIDATE FILE
        # ====================================================

        if not file.filename:

            raise HTTPException(
                status_code=400,
                detail="No filename provided.",
            )

        if not file.filename.lower().endswith(
            ".csv"
        ):

            raise HTTPException(
                status_code=400,
                detail="Only CSV files are supported.",
            )

        # ====================================================
        # 2. SAFE FILE NAME
        # ====================================================

        safe_filename = Path(
            file.filename
        ).name

        filepath = (
            UPLOAD_FOLDER
            / safe_filename
        )

        # ====================================================
        # 3. SAVE UPLOADED FILE
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
        # 4. READ UPLOADED CSV
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
                detail=(
                    "Uploaded CSV contains no rows."
                ),
            )

        # ====================================================
        # 5. IDENTIFY UPLOADED RECORDS
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
        # 6. COPY TO SOURCE DATA
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
        # 7. PREPROCESSING
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
        # 8. LOAD PROCESSED DATASET
        # ====================================================

        processed_path = (
            PROCESSED_FOLDER
            / "final_feedback_dataset.csv"
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
        # 9. CHECK FEEDBACK COLUMN
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
        # 10. FILTER UPLOADED RECORDS
        # ====================================================

        print(
            "========== FILTERING UPLOADED RECORDS =========="
        )

        analysis_df = pd.DataFrame()

        # ----------------------------------------------------
        # FIRST: MATCH BY FEEDBACK ID
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
        # SECOND: MATCH BY FEEDBACK TEXT
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
        # 11. PREPARE FEEDBACK
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
        # 12. GROQ BATCH ANALYSIS
        # ====================================================

        print(
            "========== GROQ BATCH ANALYSIS =========="
        )

        batch_size = 5

        batch_delay_seconds = 3

        results = []

        # ====================================================
        # 13. PROCESS BATCHES
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

            try:

                batch_result = analyze_batch(
                    batch
                )

            except Exception as exc:

                if is_rate_limit_error(
                    exc
                ):

                    raise HTTPException(
                        status_code=429,
                        detail=(
                            "Groq API rate limit reached "
                            "during feedback analysis. "
                            "Please wait until the limit resets."
                        ),
                    )

                raise

            # ------------------------------------------------
            # VERIFY RESULT COUNT
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

            results.extend(
                batch_result
            )

            # ------------------------------------------------
            # DELAY
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
        # 14. FINAL RESULT COUNT
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

        if len(results) != len(
            analysis_df
        ):

            raise Exception(
                "Final AI result count does not "
                "match uploaded processed rows. "
                f"Expected {len(analysis_df)}, "
                f"received {len(results)}."
            )

        # ====================================================
        # 15. STORE AI RESULTS
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
        # 16. WRITE AI COLUMNS
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
        # 17. SAVE UPLOAD-SPECIFIC ANALYSIS
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
        # 18. TREND ANALYSIS
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
        # 19. FEATURE CLUSTERING
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
        # 20. API RESPONSE
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
            # THEME EXTRACTION
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

        if is_rate_limit_error(
            exc
        ):

            raise HTTPException(
                status_code=429,
                detail=(
                    "Groq API rate limit reached. "
                    "Please wait until the limit resets."
                ),
            )

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )