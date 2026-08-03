"""
priority.py
-------------------------
Restaurant Feedback Priority Scoring
"""

from config import (
    HIGH,
    MEDIUM,
    LOW,
    HIGH_PRIORITY_KEYWORDS,
    MEDIUM_PRIORITY_KEYWORDS,
)
from utils import clean_text


class PriorityClassifier:
    """
    Assigns a priority level to restaurant reviews.

    Output:
    - High
    - Medium
    - Low
    """

    def __init__(self):
        self.high_keywords = HIGH_PRIORITY_KEYWORDS
        self.medium_keywords = MEDIUM_PRIORITY_KEYWORDS

    def predict(self, review, sentiment):
        """
        Predict priority using review text and sentiment.
        """

        review = clean_text(review)

        # High priority if any critical keyword is found
        for keyword in self.high_keywords:
            if keyword in review:
                return HIGH

        # Negative reviews are High priority
        if sentiment == "Negative":
            return HIGH

        # Medium priority keywords
        for keyword in self.medium_keywords:
            if keyword in review:
                return MEDIUM

        # Neutral reviews are Medium priority
        if sentiment == "Neutral":
            return MEDIUM

        # Positive reviews are Low priority
        return LOW

    def predict_batch(self, reviews, sentiments):
        """
        Predict priorities for multiple reviews.
        """

        priorities = []

        for review, sentiment in zip(reviews, sentiments):
            priorities.append(self.predict(review, sentiment))

        return priorities