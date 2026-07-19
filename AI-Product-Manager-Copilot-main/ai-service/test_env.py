import os
from dotenv import load_dotenv

load_dotenv()

print("Loaded variables:")

for key, value in os.environ.items():
    if "GEMINI" in key or "GOOGLE" in key:
        print(key, "=", value)