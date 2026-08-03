"""
sentiment.py
-------------------------
Restaurant Feedback Sentiment Analysis
Uses VADER Sentiment Analyzer
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from config import POSITIVE, NEGATIVE, NEUTRAL
from utils import clean_text


class SentimentClassifier:
    """
    Classifies restaurant reviews as:
    - Positive
    - Negative
    - Neutral
    """

    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()

    def predict(self, review):
        """
        Predict sentiment for a single review.
        """

        review = clean_text(review)

        if not review:
            return NEUTRAL

        score = self.analyzer.polarity_scores(review)

        compound = score["compound"]

        if compound >= 0.05:
            return POSITIVE
        elif compound <= -0.05:
            return NEGATIVE
        else:
            return NEUTRAL

    def predict_batch(self, reviews):
        """
        Predict sentiments for multiple reviews.
        """

        return [self.predict(review) for review in reviews]