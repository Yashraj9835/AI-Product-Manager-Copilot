from fastapi import APIRouter
from app.api.schemas import QuestionRequest, QuestionResponse
from app.services.ai_service import AIService
from app.analysis.models import AnalysisResponse

router = APIRouter()

ai_service = AIService()


@router.post("/ask", response_model=QuestionResponse)
def ask_ai(request: QuestionRequest):

    result = ai_service.ask(request.question)

    return result


@router.post(
    "/analyze",
    response_model=AnalysisResponse
)
def analyze(request: QuestionRequest):

    return ai_service.analyze(request.question)