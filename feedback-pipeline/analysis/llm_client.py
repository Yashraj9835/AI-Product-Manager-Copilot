import os

from dotenv import load_dotenv
from groq import Groq


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
# GROQ API KEY
# ============================================================

api_key = os.getenv(
    "GROQ_API_KEY"
)

if not api_key:
    raise ValueError(
        "GROQ_API_KEY not found in .env"
    )


print("[OK] Groq API Key Loaded")


# ============================================================
# GROQ CLIENT
# ============================================================

client = Groq(
    api_key=api_key
)


# ============================================================
# MODEL
# ============================================================

# This model is confirmed to be available
# for the current Groq API key.

GROQ_MODEL = "openai/gpt-oss-20b"


# ============================================================
# LLM REQUEST
# ============================================================

def ask_llm(
    prompt: str,
) -> str:
    """
    Send a prompt to Groq and return
    the generated text.
    """

    response = client.chat.completions.create(
        model=GROQ_MODEL,

        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],

        temperature=0.1,
        max_tokens=1024,
   )
    content = (
        response
        .choices[0]
        .message
        .content
    )

    if not content:
        raise ValueError(
            "Groq returned an empty response"
        )

    return content.strip()
