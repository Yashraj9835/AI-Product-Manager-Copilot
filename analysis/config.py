"""
config.py
-------------------------
Configuration settings and constants
for Restaurant Feedback Analysis.
"""

# ============================
# DATASET PATHS
# ============================

INPUT_CSV = "dataset/processed/cleaned_feedback.csv"
OUTPUT_CSV = "dataset/processed/analyzed_feedback.csv"

# ============================
# CATEGORY KEYWORDS
# ============================

CATEGORY_KEYWORDS = {
    "Food": [
        "food", "taste", "dish", "meal", "pizza",
        "burger", "biryani", "rice", "dessert",
        "drink", "beverage", "coffee", "tea",
        "spicy", "fresh", "delicious", "menu"
    ],

    "Service": [
        "service", "waiter", "waitress", "serving",
        "served", "table", "reservation",
        "response", "support"
    ],

    "Delivery": [
        "delivery", "deliver", "parcel",
        "late", "delay", "order",
        "driver", "pickup"
    ],

    "Price": [
        "price", "cost", "expensive",
        "cheap", "value", "money",
        "bill", "pricing"
    ],

    "Staff": [
        "staff", "employee", "manager",
        "cashier", "chef", "cook",
        "team", "worker"
    ],

    "Cleanliness": [
        "clean", "dirty", "hygiene",
        "washroom", "restroom",
        "table", "floor", "sanitary"
    ],

    "Ambience": [
        "ambience", "atmosphere",
        "music", "lighting",
        "decor", "environment",
        "crowded", "comfortable"
    ]
}

# ============================
# PRIORITY KEYWORDS
# ============================

HIGH_PRIORITY_KEYWORDS = [
    "refund",
    "late",
    "delay",
    "cold",
    "dirty",
    "spoiled",
    "rude",
    "terrible",
    "worst",
    "bad",
    "missing",
    "incorrect",
    "unsafe",
    "uncooked",
    "raw"
]

MEDIUM_PRIORITY_KEYWORDS = [
    "average",
    "okay",
    "slow",
    "normal",
    "fine",
    "acceptable"
]

LOW_PRIORITY_KEYWORDS = [
    "good",
    "great",
    "excellent",
    "amazing",
    "awesome",
    "perfect",
    "delicious",
    "fast"
]

# ============================
# SENTIMENT LABELS
# ============================

POSITIVE = "Positive"
NEGATIVE = "Negative"
NEUTRAL = "Neutral"

# ============================
# PRIORITY LABELS
# ============================

HIGH = "High"
MEDIUM = "Medium"
LOW = "Low"