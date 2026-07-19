from fastapi import APIRouter
from app.api.schemas import QuestionRequest, QuestionResponse
from app.services.ai_service import AIService

router = APIRouter()

ai_service = AIService()


@router.post("/ask", response_model=QuestionResponse)
def ask_ai(request: QuestionRequest):

    result = ai_service.ask(request.question)

    return result