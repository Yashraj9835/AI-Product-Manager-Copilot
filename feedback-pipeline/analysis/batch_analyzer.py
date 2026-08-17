"""
Delivery-app feedback batch analysis.

This analyzer is intentionally scoped to the product domain:

    Food-delivery / on-demand delivery mobile application

The model classifies product/app and delivery experience issues such as:
- Order Tracking
- Delivery Experience
- Cart & Checkout
- Search & Discovery
- Notifications
- Authentication & Account
- App Performance
- UI/UX & Navigation
- Customer Support
- Feature Requests
- Offers & Promotions
- General Delivery Feedback

Food quality, restaurant ambience, restaurant staff behavior, etc.
are NOT treated as primary product categories.

The analyzer returns one JSON object per feedback item.
"""

import json
import logging
from typing import Any, Dict, List

from analysis.llm_client import ask_llm


logger = logging.getLogger(__name__)


# ============================================================
# PRODUCT TAXONOMY
# ============================================================

PRODUCT_CATEGORIES = [
    "Order Tracking",
    "Delivery Experience",
    "Cart & Checkout",
    "Search & Discovery",
    "Notifications",
    "Authentication & Account",
    "App Performance",
    "UI/UX & Navigation",
    "Customer Support",
    "Feature Requests",
    "Offers & Promotions",
    "General Delivery Feedback",
]


# ============================================================
# OUT-OF-SCOPE FOOD / RESTAURANT KEYWORDS
# ============================================================

FOOD_ONLY_KEYWORDS = [
    "food taste",
    "food tasted",
    "tasted amazing",
    "tasted good",
    "tasted great",
    "delicious",
    "fresh food",
    "food was fresh",
    "food freshness",
    "food was cold",
    "food was hot",
    "food temperature",
    "portion size",
    "too spicy",
    "too salty",
    "too oily",
    "undercooked",
    "overcooked",
    "restaurant staff",
    "staff were rude",
    "staff was rude",
    "restaurant ambience",
    "restaurant atmosphere",
    "restaurant interior",
    "restaurant quality",
    "food quality",
    "food packaging",
    "packaging quality",
]


# ============================================================
# SYSTEM / ANALYSIS PROMPT
# ============================================================

ANALYSIS_PROMPT = """
You are analyzing customer feedback for a FOOD-DELIVERY /
ON-DEMAND DELIVERY MOBILE APPLICATION similar to Swiggy,
Zomato, Uber Eats, DoorDash, or Grubhub.

============================================================
PRODUCT SCOPE
============================================================

The product team is interested primarily in:

1. DIGITAL PRODUCT EXPERIENCE
2. ORDERING EXPERIENCE
3. DELIVERY EXPERIENCE

Focus on issues such as:

- order tracking
- delivery status
- delivery ETA
- late delivery
- delivery estimates
- delivery partner experience
- cart
- checkout
- payment
- order placement
- search
- restaurant discovery
- filters
- notifications
- login
- OTP
- authentication
- account/profile
- app crashes
- slow loading
- app performance
- UI
- navigation
- usability
- customer support
- feature requests
- offers
- discounts
- coupons
- promotions


============================================================
IMPORTANT DOMAIN RULE
============================================================

This is NOT a restaurant-food-quality analysis system.

DO NOT use restaurant or food-quality topics as the primary
product category.

Examples of NON-PRIMARY topics:

- food taste
- food freshness
- food temperature
- portion size
- restaurant ambience
- restaurant staff behavior
- restaurant food quality
- restaurant interior
- restaurant menu quality
- restaurant packaging quality

If feedback contains BOTH food-related content AND a clear
delivery/app/product problem, classify according to the
DELIVERY or PRODUCT problem.

Example:

"The food was cold because the order arrived 45 minutes late."

Correct:
category = "Delivery Experience"

Incorrect:
category = "General Delivery Feedback"


Example:

"The biryani was good but checkout keeps failing."

Correct:
category = "Cart & Checkout"

Incorrect:
category = "General Delivery Feedback"


Example:

"The food was excellent but I cannot see where my driver is."

Correct:
category = "Order Tracking"

Incorrect:
category = "General Delivery Feedback"


============================================================
OUT-OF-SCOPE FOOD / RESTAURANT-ONLY RULE
============================================================

Some feedback will contain ONLY restaurant or food-related
information.

If there is NO clear digital-product, ordering, support, or
delivery problem:

category = "General Delivery Feedback"
theme = "None"
pain_point = "None"
ai_recommendation = "None"

DO NOT invent a product recommendation.

Example:

"The restaurant staff were rude."

Correct:

category = "General Delivery Feedback"
theme = "None"
pain_point = "None"
ai_recommendation = "None"


Example:

"The food was fresh and delicious."

Correct:

category = "General Delivery Feedback"
theme = "None"
pain_point = "None"
ai_recommendation = "None"


Example:

"The biryani tasted amazing and was very fresh."

Correct:

category = "General Delivery Feedback"
theme = "None"
pain_point = "None"
ai_recommendation = "None"


However:

"The food was cold because the order arrived 45 minutes late."

Correct:

category = "Delivery Experience"

The delivery problem is the important product insight.


============================================================
CRITICAL CATEGORY PRIORITY RULE
============================================================

Specific product workflows take priority over generic categories.

If a crash, error, failure, or bug happens specifically during:

- checkout
- payment
- placing an order
- completing an order
- cart operations
- adding items to cart
- removing items from cart
- order confirmation

classify it as:

"Cart & Checkout"

DO NOT classify these cases as:

"App Performance"


Example:

"The app crashes whenever I open checkout."

Correct:
category = "Cart & Checkout"

Incorrect:
category = "App Performance"


Example:

"The app crashes when I try to place my order."

Correct:
category = "Cart & Checkout"

Incorrect:
category = "App Performance"


Example:

"Payment keeps failing when I try to complete my order."

Correct:
category = "Cart & Checkout"

Incorrect:
category = "App Performance"


Use "App Performance" for general crashes, freezing,
slow loading, lag, or performance problems that are NOT
specifically tied to checkout, payment, cart, or order placement.


============================================================
ALLOWED CATEGORIES
============================================================

You MUST choose exactly ONE category from this list:

1. Order Tracking
2. Delivery Experience
3. Cart & Checkout
4. Search & Discovery
5. Notifications
6. Authentication & Account
7. App Performance
8. UI/UX & Navigation
9. Customer Support
10. Feature Requests
11. Offers & Promotions
12. General Delivery Feedback

NEVER create a new category.

NEVER return:

- Food Quality
- Restaurant Quality
- Food Taste
- Restaurant Ambience
- Restaurant Staff
- Packaging Quality

as the category.


============================================================
CATEGORY SELECTION RULES
============================================================

ORDER TRACKING:

Use for:

- tracking order
- tracking driver
- order status
- delivery status
- driver location
- live tracking
- inaccurate tracking
- incorrect order status
- missing tracking information


DELIVERY EXPERIENCE:

Use for:

- late delivery
- delivery ETA
- delivery estimate
- delivery delay
- missing delivery
- delivery partner issue
- delivery instructions
- incorrect delivery
- delivery taking too long
- delivery arriving late


CART & CHECKOUT:

Use for:

- cart problems
- checkout failure
- checkout crash
- checkout error
- payment failure
- payment error
- unable to place order
- order placement errors
- order completion errors
- cart items disappearing
- cart update problems
- checkout problems
- payment problems

If checkout/payment/cart/order placement is involved,
this category takes priority over App Performance.


SEARCH & DISCOVERY:

Use for:

- search problems
- search results
- search relevance
- filters
- restaurant discovery
- finding restaurants
- finding items


NOTIFICATIONS:

Use for:

- missing notifications
- delayed notifications
- push notification problems
- delivery notification problems
- order update notifications


AUTHENTICATION & ACCOUNT:

Use for:

- login
- logout
- OTP
- password
- account
- profile
- authentication
- account access
- registration


APP PERFORMANCE:

Use for:

- general app crashes
- freezing
- slow loading
- app responsiveness
- performance problems
- app startup problems
- lag

Do NOT use this category when the crash/error is specifically
related to checkout, payment, cart, or order placement.


UI/UX & NAVIGATION:

Use for:

- confusing interface
- navigation problems
- difficult-to-use screens
- buttons
- layout
- usability
- accessibility
- UI problems


CUSTOMER SUPPORT:

Use for:

- support response
- support delays
- unable to contact support
- poor support experience
- unresolved support requests


FEATURE REQUESTS:

Use for:

- requests for new functionality
- requests to add a feature
- requests to improve an existing feature
- suggestions for new capabilities


OFFERS & PROMOTIONS:

Use for:

- coupons
- discounts
- promotional codes
- offers
- promo problems
- coupon application problems


GENERAL DELIVERY FEEDBACK:

Use only when the feedback does not clearly fit another
allowed product/delivery category.

This includes food-only or restaurant-only feedback where
there is no clear digital-product or delivery issue.


============================================================
SENTIMENT
============================================================

Choose exactly one:

Positive
Neutral
Negative

Sentiment should reflect the customer's overall experience
with the product or delivery service.

If there is a serious product problem, the sentiment should
normally be Negative even if the feedback also contains praise.

Example:

"The food was excellent but checkout keeps failing."

Correct:

sentiment = "Negative"


============================================================
PRIORITY
============================================================

Choose exactly one:

High
Medium
Low


HIGH priority examples:

- app crashes during critical workflows
- checkout completely failing
- payment completely failing
- customer cannot place an order
- login completely broken
- orders cannot be tracked
- severe delivery failures
- repeated critical errors
- order cannot be completed


MEDIUM priority examples:

- slow performance
- confusing navigation
- delayed notifications
- search problems
- support delays
- recurring but non-blocking problems


LOW priority examples:

- minor UI improvements
- cosmetic changes
- small usability suggestions
- non-critical feature requests


IMPORTANT:

Priority must reflect PRODUCT or DELIVERY IMPACT.

Food quality alone does NOT determine priority.

For food-only or restaurant-only feedback:

priority = "Low"


============================================================
THEME
============================================================

Theme should be a concise PRODUCT or DELIVERY level phrase.

Good examples:

"Late Delivery"
"Order Tracking Accuracy"
"Checkout Failure"
"Checkout Crash"
"Payment Failure"
"Slow App Loading"
"Login Issues"
"Search Relevance"
"Missing Delivery Notifications"
"Customer Support Response"
"Navigation Usability"
"Coupon Application"

For food-only or restaurant-only feedback:

theme = "None"


============================================================
PAIN POINT
============================================================

Describe the customer's actual product or delivery problem
in one concise sentence.

Do not invent details.

For food-only or restaurant-only feedback:

pain_point = "None"


============================================================
RECOMMENDATION
============================================================

Provide one practical product recommendation.

Examples:

"Improve real-time order-status synchronization."

"Investigate checkout failures across payment methods."

"Fix checkout crashes to ensure customers can complete orders."

"Optimize app startup and screen loading performance."

"Improve push notification reliability for delivery updates."

For food-only or restaurant-only feedback:

ai_recommendation = "None"

Do NOT invent product changes for restaurant or food-only
complaints.


============================================================
OUTPUT FORMAT
============================================================

Return ONLY valid JSON.

Return exactly ONE object for every input feedback item.

Each object MUST contain:

[
  {{
    "feedback": "original feedback text",
    "category": "one allowed category",
    "sentiment": "Positive",
    "priority": "High",
    "theme": "short product-level theme",
    "pain_point": "concise customer problem",
    "ai_recommendation": "practical product recommendation"
  }}
]

IMPORTANT:

- Do not add markdown.
- Do not add explanations.
- Do not add extra fields.
- Do not omit objects.
- Do not change the original feedback text.
- Do not invent categories.
- Use exactly one allowed category.
- Return exactly one object for every input item.
- Preserve input order.
- For food-only or restaurant-only feedback use None for
  theme, pain_point, and ai_recommendation.


============================================================
INPUT FEEDBACK
============================================================

{feedback_list}
"""


# ============================================================
# SAFE FALLBACK
# ============================================================

def fallback_result(text: str) -> Dict[str, str]:
    """
    Safe result when the LLM cannot provide valid output.
    """

    return {
        "feedback": text,
        "category": "General Delivery Feedback",
        "sentiment": "Neutral",
        "priority": "Low",
        "theme": "None",
        "pain_point": "None",
        "ai_recommendation": "None",
    }


# ============================================================
# NORMALIZE ONE RESULT
# ============================================================

def normalize_result(
    result: Any,
    original_text: str,
) -> Dict[str, str]:

    if not isinstance(result, dict):
        return fallback_result(original_text)

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    category = str(
        result.get(
            "category",
            "General Delivery Feedback",
        )
    ).strip()

    if category not in PRODUCT_CATEGORIES:
        category = "General Delivery Feedback"

    # --------------------------------------------------------
    # SENTIMENT
    # --------------------------------------------------------

    sentiment = str(
        result.get(
            "sentiment",
            "Neutral",
        )
    ).strip()

    if sentiment not in {
        "Positive",
        "Neutral",
        "Negative",
    }:
        sentiment = "Neutral"

    # --------------------------------------------------------
    # PRIORITY
    # --------------------------------------------------------

    priority = str(
        result.get(
            "priority",
            "Low",
        )
    ).strip()

    if priority not in {
        "High",
        "Medium",
        "Low",
    }:
        priority = "Low"

    # --------------------------------------------------------
    # THEME
    # --------------------------------------------------------

    theme = str(
        result.get(
            "theme",
            "None",
        )
    ).strip()

    if not theme:
        theme = "None"

    # --------------------------------------------------------
    # PAIN POINT
    # --------------------------------------------------------

    pain_point = str(
        result.get(
            "pain_point",
            "None",
        )
    ).strip()

    if not pain_point:
        pain_point = "None"

    # --------------------------------------------------------
    # AI RECOMMENDATION
    # --------------------------------------------------------

    recommendation = str(
        result.get(
            "ai_recommendation",
            "None",
        )
    ).strip()

    if not recommendation:
        recommendation = "None"

    # --------------------------------------------------------
    # OUT-OF-SCOPE NORMALIZATION
    # --------------------------------------------------------

    if category == "General Delivery Feedback":
        if (
            theme.lower()
            in {
                "food quality",
                "food taste",
                "food freshness",
                "restaurant quality",
                "restaurant staff",
                "restaurant ambience",
                "staff behavior",
                "packaging quality",
            }
        ):
            theme = "None"
            pain_point = "None"
            recommendation = "None"

    # --------------------------------------------------------
    # FINAL RECORD
    # --------------------------------------------------------

    return {
        "feedback": original_text,
        "category": category,
        "sentiment": sentiment,
        "priority": priority,
        "theme": theme,
        "pain_point": pain_point,
        "ai_recommendation": recommendation,
    }


# ============================================================
# EXTRACT JSON
# ============================================================

def parse_llm_json(raw_response: Any) -> Any:
    """
    Parse JSON returned by the LLM.

    Handles:
    - Python list/dict
    - JSON string
    - markdown code fences
    """

    if isinstance(raw_response, (list, dict)):
        return raw_response

    if raw_response is None:
        return None

    text = str(raw_response).strip()

    if not text:
        return None

    # --------------------------------------------------------
    # Remove markdown code fences
    # --------------------------------------------------------

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

        if text.lower().startswith("json"):
            text = text[4:].strip()

    # --------------------------------------------------------
    # Parse JSON
    # --------------------------------------------------------

    try:
        return json.loads(text)

    except json.JSONDecodeError:
        logger.warning(
            "LLM returned invalid JSON: %s",
            text[:500],
        )

        return None


# ============================================================
# BATCH ANALYSIS
# ============================================================

def analyze_batch(
    feedback_list: List[str],
) -> List[Dict[str, str]]:
    """
    Analyze a batch of feedback records.

    Returns exactly one result for every input item.
    """

    if not feedback_list:
        return []

    # --------------------------------------------------------
    # Normalize inputs
    # --------------------------------------------------------

    normalized_feedback = [
        str(text).strip()
        for text in feedback_list
    ]

    # --------------------------------------------------------
    # Build prompt
    # --------------------------------------------------------

    prompt = ANALYSIS_PROMPT.format(
        feedback_list=json.dumps(
            normalized_feedback,
            ensure_ascii=False,
        )
    )

    # --------------------------------------------------------
    # Call LLM
    # --------------------------------------------------------

    try:
        raw_response = ask_llm(prompt)

        parsed = parse_llm_json(raw_response)

        # ----------------------------------------------------
        # Invalid response
        # ----------------------------------------------------

        if not isinstance(parsed, list):
            logger.warning(
                "LLM response was not a list. "
                "Using safe fallback results."
            )

            return [
                fallback_result(text)
                for text in normalized_feedback
            ]

        # ----------------------------------------------------
        # Normalize results
        # ----------------------------------------------------

        results: List[Dict[str, str]] = []

        for index, original_text in enumerate(
            normalized_feedback
        ):

            if index < len(parsed):
                results.append(
                    normalize_result(
                        parsed[index],
                        original_text,
                    )
                )
            else:
                results.append(
                    fallback_result(original_text)
                )

        return results

    # --------------------------------------------------------
    # LLM/API failure
    # --------------------------------------------------------

    except Exception as exc:

        logger.exception(
            "Batch feedback analysis failed: %s",
            exc,
        )

        # Do NOT pretend that the LLM analyzed the feedback.
        # Return an explicit error record so callers can detect
        # that this batch was not successfully analyzed.

        return [
            {
                "feedback": text,
                "category": "General Delivery Feedback",
                "sentiment": "Neutral",
                "priority": "Low",
                "theme": "AI Analysis Failed",
                "pain_point": "AI analysis could not be completed.",
                "ai_recommendation": (
                    "Retry AI analysis after the API rate limit "
                    "or service issue has been resolved."
                ),
            }
            for text in normalized_feedback
        ]

# ============================================================
# COMPATIBILITY FUNCTION
# ============================================================

def analyze_feedback(
    feedback_list: List[str],
) -> List[Dict[str, str]]:
    """
    Backwards-compatible wrapper.

    Existing routes can continue calling analyze_feedback().
    """

    return analyze_batch(feedback_list)


# ============================================================
# SINGLE ITEM HELPER
# ============================================================

def analyze_single(
    feedback: str,
) -> Dict[str, str]:
    """
    Analyze a single feedback item using the same
    product taxonomy.
    """

    results = analyze_batch([feedback])

    if results:
        return results[0]

    return fallback_result(feedback)
