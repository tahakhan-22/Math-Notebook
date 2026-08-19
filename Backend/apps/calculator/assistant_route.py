from fastapi import APIRouter, HTTPException, status
from schema import AssistantRequest, AssistantResponse
from apps.calculator.assistant_engine import process_assistant_request

router = APIRouter()

@router.post('', response_model=AssistantResponse)
async def assistant_endpoint(request: AssistantRequest):
    """
    POST /assistant
    Phase 3C AI Mathematical Assistant & Tutor Endpoint.
    Receives canvas drawing image, notebook context, active variable state, and action mode.
    Returns structured AssistantResponse.
    """
    try:
        response = process_assistant_request(request)
        return response
    except Exception as e:
        print(f"[Assistant Route Error] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your mathematical assistant request."
        )
