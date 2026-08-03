"""
category.py
-------------------------
Restaurant Feedback Category Classification
"""

from config import CATEGORY_KEYWORDS
from utils import clean_text


class CategoryClassifier:
    """
    Classifies restaurant reviews into predefined categories.
    """

    def __init__(self):
        self.categories = CATEGORY_KEYWORDS

    def predict(self, review):
        """
        Predict a category for a review.
        """

        review = clean_text(review)

        if not review:
            return "Other"

        scores = {}

        # Count matching keywords for each category
        for category, keywords in self.categories.items():
            score = 0

            for keyword in keywords:
                if keyword in review:
                    score += 1

            scores[category] = score

        # Select category with highest score
        best_category = max(scores, key=scores.get)

        # If no keywords matched
        if scores[best_category] == 0:
            return "Other"

        return best_category

    def predict_batch(self, reviews):
        """
        Predict categories for multiple reviews.
        """

        return [self.predict(review) for review in reviews]