from app.rag.retriever import Retriever
from app.prompts.prompt_builder import PromptBuilder
from app.llm.gemini import GeminiService
from app.analysis.analyzer import FeedbackAnalyzer


class AIService:

    def __init__(self, retriever):
        self.retriever = retriever
        self.llm = GeminiService()

        self.analyzer = FeedbackAnalyzer(
            retriever=self.retriever,
            llm=self.llm
        )

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

    def analyze(self, question: str):
        return self.analyzer.analyze(question)

    def close(self):
        self.retriever.close()