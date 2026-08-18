'''

from typing import Any

from app.services.ai_service import AIService
from app.services.prd_service import PRDService
from app.services.prioritization_service import PrioritizationService
from app.analysis.priority_models import FeatureInput
from app.llm.gemini import GeminiService


class CopilotService:
    """
    Central conversational router for the AI Product Manager.

    Routes natural-language product questions to:
    - Normal conversation
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
        self.llm = GeminiService()

    def is_casual_conversation(self, question: str) -> bool:
        """
        Detect simple conversational messages that should not
        be sent through the product-feedback RAG pipeline.
        """

        q = question.lower().strip()

        casual_messages = {
            "hi",
            "hello",
            "hey",
            "hey there",
            "hi there",
            "good morning",
            "good afternoon",
            "good evening",
            "thanks",
            "thank you",
            "thankyou",
            "bye",
            "goodbye",
            "how are you",
            "who are you",
            "what can you do",
        }

        return q in casual_messages

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
        Default delivery-app features used when the user asks
        for prioritization without supplying feature metrics.

        The features include the metrics required by:
        - RICE: reach, impact, confidence, effort
        - ICE: impact, confidence, ease
        - MoSCoW: mos_cow
        """

        return [
            FeatureInput(
                name="Accurate Real-time Order Tracking",

                # RICE
                reach=80,
                impact=4,
                confidence=0.9,
                effort=5,

                # ICE
                ease=5,

                # MoSCoW
                mos_cow="MUST",
            ),

            FeatureInput(
                name="Delivery Issue Customer Support",

                # RICE
                reach=70,
                impact=3,
                confidence=0.85,
                effort=4,

                # ICE
                ease=4,

                # MoSCoW
                mos_cow="SHOULD",
            ),

            FeatureInput(
                name="Delivery Status Notifications",

                # RICE
                reach=60,
                impact=4,
                confidence=0.8,
                effort=6,

                # ICE
                ease=3,

                # MoSCoW
                mos_cow="COULD",
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

        # ---------------------------------------------------------
        # Casual conversation
        # ---------------------------------------------------------
        if self.is_casual_conversation(question):
            prompt = f"""
You are a friendly AI Product Manager assistant.

The user is having a casual conversation with you.

User message:
{question}

Respond naturally, briefly, and helpfully.

Do not use product-analysis headings.
Do not invent product information.
Do not provide customer-feedback analysis unless the user asks
for product-related information.
"""

            answer = self.llm.generate(prompt)

            return {
                "intent": "conversation",
                "answer": answer,
            }

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

        # AIService.ask() returns:
        #
        # {
        #     "question": "...",
        #     "answer": "...",
        #     "sources": [...]
        # }
        #
        # The Copilot API should NOT put that entire object inside
        # the "answer" field. The human-readable answer belongs in
        # "answer", while retrieved documents belong in "sources".

        return {
            "intent": "analyze",
            "answer": result.get("answer", ""),
            "sources": result.get("sources", []),
        }

'''

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
    - User story generation
    - Acceptance criteria generation
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
        # User Story intent
        # ---------------------------------------------------------
        user_story_keywords = [
            "user story",
            "user stories",
            "user-story",
            "user-stories",
            "generate stories",
            "generate user story",
            "generate user stories",
            "create user story",
            "create user stories",
            "write user story",
            "write user stories",
        ]

        # ---------------------------------------------------------
        # Acceptance Criteria intent
        # ---------------------------------------------------------
        acceptance_criteria_keywords = [
            "acceptance criteria",
            "acceptance criterion",
            "acceptance test",
            "acceptance tests",
            "generate acceptance criteria",
            "create acceptance criteria",
            "write acceptance criteria",
            "acceptance requirements",
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

        # ---------------------------------------------------------
        # IMPORTANT:
        # Check PRD first, then specific generation intents,
        # then prioritization, and finally analysis.
        # ---------------------------------------------------------

        if any(keyword in q for keyword in prd_keywords):
            return "prd"

        if any(keyword in q for keyword in user_story_keywords):
            return "user_story"

        if any(keyword in q for keyword in acceptance_criteria_keywords):
            return "acceptance_criteria"

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
        Default delivery-app features used when the user asks
        for prioritization without supplying feature metrics.

        These are intentionally limited to features relevant to
        the delivery-app product.
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
                name="Delivery Status Notifications",
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

    def generate_user_stories(self, question: str):
        prd = self.prd_service.generate(question)

        if isinstance(prd, dict):
            return prd.get("user_stories", [])

        return []

    def generate_acceptance_criteria(self, question: str):
        prd = self.prd_service.generate(question)

        if isinstance(prd, dict):
            return prd.get("acceptance_criteria", [])

        return []

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
        # User Stories
        # ---------------------------------------------------------
        if intent == "user_story":
            result = self.generate_user_stories(question)

            return {
                "intent": "user_story",
                "answer": result,
            }

        # ---------------------------------------------------------
        # Acceptance Criteria
        # ---------------------------------------------------------
        if intent == "acceptance_criteria":
            result = self.generate_acceptance_criteria(question)

            return {
                "intent": "acceptance_criteria",
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

        # AIService.ask() returns:
        #
        # {
        #     "question": "...",
        #     "answer": "...",
        #     "sources": [...]
        # }
        #
        # The Copilot API should NOT put that entire object inside
        # the "answer" field. The human-readable answer belongs in
        # "answer", while retrieved documents belong in "sources".

        return {
            "intent": "analyze",
            "answer": result.get("answer", ""),
            "sources": result.get("sources", []),
        }
