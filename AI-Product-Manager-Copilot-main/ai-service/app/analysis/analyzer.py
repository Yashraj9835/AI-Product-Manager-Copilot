from app.analysis.json_parser import JSONParser

from app.analysis.prompt_templates import PromptTemplates
from app.analysis.models import AnalysisResponse

class FeedbackAnalyzer:

    def __init__(self, retriever, llm):
        self.retriever = retriever
        self.llm = llm

    def analyze(self, question: str):

        # Retrieve relevant documents
        documents = self.retriever.search(question)

        # Build context
        context = "\n\n".join(
            [doc["text"] for doc in documents]
        )

        # Build prompt
        prompt = PromptTemplates.ANALYZE_FEEDBACK.format(
            context=context
        )

        # Ask Gemini
        response = self.llm.generate(prompt)

        # Convert JSON string into dictionary
        result = JSONParser.parse(response)

        # Convert dictionary into AnalysisResponse object
        return AnalysisResponse(**result)