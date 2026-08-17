import os

from dotenv import load_dotenv
from openai import OpenAI


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

env_path = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        ".env",
    )
)

if os.path.exists(env_path):
    load_dotenv(
        dotenv_path=env_path,
        override=True,
    )
else:
    load_dotenv(
        override=True,
    )


# ============================================================
# GEMINI API KEY
# ============================================================

api_key = os.getenv(
    "GEMINI_API_KEY"
)

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY not found in .env"
    )


print("[OK] Gemini API Key Loaded")


# ============================================================
# GEMINI CLIENT
# ============================================================

client = OpenAI(
    api_key=api_key,
    base_url=(
        "https://generativelanguage.googleapis.com/"
        "v1beta/openai/"
    ),
)


# ============================================================
# MODEL
# ============================================================

GEMINI_MODEL = "gemini-2.5-flash"


# ============================================================
# LLM REQUEST
# ============================================================

def ask_llm(
    prompt: str,
) -> str:
    """
    Send a prompt to Gemini and return
    the generated text.

    JSON mode is enabled only when the
    prompt explicitly requests valid JSON.

    This keeps normal Copilot responses
    as normal text.
    """

    request_options = {
        "model": GEMINI_MODEL,

        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],

        "temperature": 0.1,
        "max_tokens": 4096,
    }

    # --------------------------------------------------------
    # ENABLE JSON MODE ONLY FOR JSON REQUESTS
    # --------------------------------------------------------

    prompt_lower = prompt.lower()

    json_requested = (
        "generate only valid json" in prompt_lower
        or "return only valid json" in prompt_lower
        or "return exactly this json structure" in prompt_lower
    )

    if json_requested:
        request_options["response_format"] = {
            "type": "json_object"
        }

    # --------------------------------------------------------
    # SEND REQUEST
    # --------------------------------------------------------

    response = client.chat.completions.create(
        **request_options
    )

    content = (
        response
        .choices[0]
        .message
        .content
    )

    if not content:
        raise ValueError(
            "Gemini returned an empty response"
        )

    return content.strip()
