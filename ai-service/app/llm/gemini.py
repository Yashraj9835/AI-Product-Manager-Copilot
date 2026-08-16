import os

from dotenv import load_dotenv
from google import genai


# Load GEMINI_API_KEY from the project .env file
load_dotenv()


class GeminiService:
    """
    Service responsible for communicating with Google Gemini.
    """

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not found in environment variables"
            )

        self.client = genai.Client(
            api_key=api_key
        )

    def generate(self, prompt: str) -> str:
        """
        Send a prompt to Gemini and return the generated text.
        """

        print("Inside Gemini.generate()")

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        if not response.text:
            raise ValueError(
                "Gemini returned an empty response"
            )

        return response.text.strip()