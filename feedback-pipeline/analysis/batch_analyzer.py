import json
from analysis.llm_client import ask_llm


def analyze_feedback_batch(feedback_list):

    prompt = f"""
You are an expert product analyst.

Analyze EVERY customer feedback record below.

For EACH feedback record, identify:

1. theme
2. pain_point

IMPORTANT:
- You MUST analyze every feedback.
- Do NOT analyze only the first feedback.
- Do NOT combine multiple feedbacks.
- Return exactly {len(feedback_list)} JSON objects.
- Keep the original feedback text.
- Theme should be a short phrase.
- Pain point should be a short phrase.
- If there is no pain point, use "None".
- Return ONLY valid JSON.
- Do NOT use markdown.

Required format:

[
  {{
    "feedback": "original feedback",
    "theme": "main theme",
    "pain_point": "main customer pain point"
  }}
]

Customer Feedback:

{json.dumps(feedback_list, ensure_ascii=False, indent=2)}
"""

    print(
        f"Sending {len(feedback_list)} feedbacks to Groq..."
    )

    response = ask_llm(prompt)

    print("Raw Groq response:")
    print(response)

    try:

        # Remove markdown fences if Groq adds them
        response = response.replace(
            "```json",
            ""
        )

        response = response.replace(
            "```",
            ""
        )

        response = response.strip()

        result = json.loads(response)

        # Make sure result is a list
        if not isinstance(result, list):

            print(
                "[ERROR] Groq returned something other than a JSON array"
            )

            return []

        print(
            f"[OK] Groq returned {len(result)} results"
        )

        # Check expected count
        if len(result) != len(feedback_list):

            print(
                "[WARN] WARNING: Result count mismatch"
            )

            print(
                "Expected:",
                len(feedback_list)
            )

            print(
                "Received:",
                len(result)
            )

        return result

    except Exception as e:

        print(
            "[ERROR] JSON Parsing Error:",
            e
        )

        print(
            "Groq Response:"
        )

        print(response)

        return []