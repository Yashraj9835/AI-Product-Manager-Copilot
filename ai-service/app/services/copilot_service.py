from typing import Any

from app.services.ai_service import AIService
from app.services.prd_service import PRDService
from app.services.prioritization_service import PrioritizationService
from app.analysis.priority_models import FeatureInput


class CopilotService:
    """
    Central conversational router for the AI Product Manager.

    Routes natural-language product questions to:
    - AI/RAG analysis
    - PRD generation
    - Feature prioritization
    """

    def __init__(
        self,
        ai_service: AIService,
        prd_service: PRDService,
        prioritization_service: PrioritizationService,
    ):
        self.ai_service = ai_service
        self.prd_service = prd_service
        self.prioritization_service = prioritization_service

    def detect_intent(self, question: str) -> str:
        q = question.lower().strip()

        # ---------------------------------------------------------
        # PRD intent
        # ---------------------------------------------------------
        prd_keywords = [
            "prd",
            "generate prd",
            "create prd",
            "write prd",
            "make prd",
            "build prd",
            "product requirements",
            "product requirement document",
            "requirements document",
        ]

        # ---------------------------------------------------------
        # Prioritization intent
        # ---------------------------------------------------------
        prioritization_keywords = [
            "rice",
            "rice score",
            "rice scores",
            "ice",
            "ice score",
            "moscow",
            "moscow prioritization",
            "prioritize",
            "prioritise",
            "priority score",
            "feature score",
            "feature scores",
            "rank features",
            "ranking features",
        ]

        if any(keyword in q for keyword in prd_keywords):
            return "prd"

        if any(keyword in q for keyword in prioritization_keywords):
            return "prioritize"

        # Everything else goes to RAG/product analysis
        return "analyze"

    def _extract_framework(self, question: str) -> str:
        q = question.lower()

        if "moscow" in q:
            return "MOSCOW"

        if "ice" in q and "rice" not in q:
            return "ICE"

        return "RICE"

    def _default_features(self):
        """
        Default features used when the user asks for
        prioritization without supplying feature metrics.

        These can later be replaced with live feature data
        from the database.
        """

        return [
            FeatureInput(
                name="Accurate Real-time Order Tracking",
                reach=80,
                impact=4,
                confidence=0.9,
                effort=5,
            ),
            FeatureInput(
                name="Delivery Issue Customer Support",
                reach=70,
                impact=3,
                confidence=0.85,
                effort=4,
            ),
            FeatureInput(
                name="Food Temperature Monitoring",
                reach=60,
                impact=4,
                confidence=0.8,
                effort=6,
            ),
        ]

    def prioritize(self, question: str):
        framework = self._extract_framework(question)

        features = self._default_features()

        return self.prioritization_service.prioritize(
            framework,
            features,
        )

    def generate_prd(self, question: str):
        return self.prd_service.generate(question)

    def answer(self, question: str) -> dict[str, Any]:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty")

        intent = self.detect_intent(question)

        # ---------------------------------------------------------
        # PRD
        # ---------------------------------------------------------
        if intent == "prd":
            result = self.generate_prd(question)

            return {
                "intent": "prd",
                "answer": result,
            }

        # ---------------------------------------------------------
        # Feature Prioritization
        # ---------------------------------------------------------
        if intent == "prioritize":
            result = self.prioritize(question)

            return {
                "intent": "prioritize",
                "answer": result,
            }

        # ---------------------------------------------------------
        # Product Analysis / RAG
        # ---------------------------------------------------------
        result = self.ai_service.ask(question)

        return {
            "intent": "analyze",
            "answer": result,
        }