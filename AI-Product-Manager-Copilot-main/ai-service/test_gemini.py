from app.llm.gemini import GeminiService

gemini = GeminiService()

response = gemini.generate(
    "Reply with exactly: Hello from Gemini!"
)

print(response)