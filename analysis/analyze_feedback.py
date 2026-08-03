"""
analyze_feedback.py
----------------------------------
Main Analysis Script

Reads:
    dataset/processed/cleaned_feedback.csv

Generates:
    dataset/processed/analyzed_feedback.csv
"""

import pandas as pd

from config import INPUT_CSV, OUTPUT_CSV
from utils import preprocess_dataframe
from category import CategoryClassifier
from sentiment import SentimentClassifier
from priority import PriorityClassifier


def main():

    print("=" * 60)
    print("Restaurant Feedback Analysis")
    print("=" * 60)

    # ----------------------------------------
    # Load Dataset
    # ----------------------------------------

    try:
        df = pd.read_csv(INPUT_CSV)
    except FileNotFoundError:
        print(f"\nERROR: Cannot find '{INPUT_CSV}'")
        return

    print(f"\nLoaded {len(df)} feedback records.")

    # ----------------------------------------
    # Preprocess
    # ----------------------------------------

    df = preprocess_dataframe(df)

    reviews = df["review"].tolist()

    # ----------------------------------------
    # Initialize Models
    # ----------------------------------------

    category_model = CategoryClassifier()
    sentiment_model = SentimentClassifier()
    priority_model = PriorityClassifier()

    # ----------------------------------------
    # Category Prediction
    # ----------------------------------------

    print("\nPredicting categories...")

    categories = category_model.predict_batch(reviews)

    # ----------------------------------------
    # Sentiment Prediction
    # ----------------------------------------

    print("Predicting sentiments...")

    sentiments = sentiment_model.predict_batch(reviews)

    # ----------------------------------------
    # Priority Prediction
    # ----------------------------------------

    print("Assigning priorities...")

    priorities = priority_model.predict_batch(
        reviews,
        sentiments
    )

    # ----------------------------------------
    # Save Results
    # ----------------------------------------

    df["Category"] = categories
    df["Sentiment"] = sentiments
    df["Priority"] = priorities

    df.to_csv(OUTPUT_CSV, index=False)

    # ----------------------------------------
    # Summary
    # ----------------------------------------

    print("\nAnalysis Completed Successfully.")
    print(f"Output saved to:\n{OUTPUT_CSV}")

    print("\nCategory Distribution")
    print(df["Category"].value_counts())

    print("\nSentiment Distribution")
    print(df["Sentiment"].value_counts())

    print("\nPriority Distribution")
    print(df["Priority"].value_counts())

    print("\nDone!")


if __name__ == "__main__":
    main()