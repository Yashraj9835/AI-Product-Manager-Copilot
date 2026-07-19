from app.rag.retriever import Retriever
from app.prompts.prompt_builder import PromptBuilder
from app.llm.gemini import GeminiService


class AIService:

    def __init__(self):

        self.retriever = Retriever()

        self.llm = GeminiService()

    def ask(self, question: str, limit: int = 5):

        documents = self.retriever.search(
            question,
            limit=limit
        )

        prompt = PromptBuilder.build(
            question,
            documents,
        )

        print("Calling Gemini...")

        answer = self.llm.generate(prompt)

        return {
            "question": question,
            "answer": answer,
            "sources": documents,
        }
    
    def close(self):
        self.retriever.close()