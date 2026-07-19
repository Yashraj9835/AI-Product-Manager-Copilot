from app.services.ai_service import AIService

ai = AIService()

try:
    response = ai.ask("What are the biggest customer complaints?")
    print(response["answer"])
finally:
    ai.close()

print("\nQuestion:\n")

print(response["question"])

print("\nAnswer:\n")

print(response["answer"])

print("\nSources Retrieved:")

print(len(response["sources"]))