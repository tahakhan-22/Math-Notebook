import base64
import json
import os
import time
from io import BytesIO
from PIL import Image
from google import genai
from google.genai import types
from constants import GEMINI_API_KEY, GEMINI_MODEL
from schema import AssistantRequest, AssistantResponse, StepItem, VisualizationSpec, VisualizationInstructions
from apps.calculator.assistant_engine.prompts import build_assistant_prompt
from apps.calculator.assistant_engine.verifier import verify_assistant_response
from apps.calculator.assistant_engine.human_formatter import to_human_math

def get_genai_client() -> genai.Client:
    api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in backend environment.")
    return genai.Client(api_key=api_key)

def process_assistant_request(request: AssistantRequest) -> AssistantResponse:
    """
    Main Assistant Engine handler for IPAD MATH NOTE Phase 3D.
    Processes handwriting/canvas images, text queries, selected math expressions, nearby notebook expressions, hint levels, user proposed solutions, and action modes.
    Returns a structured AssistantResponse.
    """
    client = get_genai_client()

    prompt_text = build_assistant_prompt(
        action=request.action,
        selected_expression=request.selected_expression,
        nearby_expressions=request.nearby_expressions,
        user_query=request.user_query,
        user_solution=request.user_solution,
        hint_level=request.hint_level,
        dict_of_vars=request.dict_of_vars,
        notebook_context=request.notebook_context
    )

    contents = [prompt_text]

    # Process canvas image if provided
    if request.image:
        try:
            image_str = request.image
            if "," in image_str:
                image_str = image_str.split(",", 1)[1]
            image_bytes = base64.b64decode(image_str)
            if image_bytes:
                pil_img = Image.open(BytesIO(image_bytes))
                pil_img.load()
                contents.append(pil_img)
        except Exception as e:
            print(f"[Assistant Image Decode Warning] {e}")

    selected_model = GEMINI_MODEL
    max_retries = 1
    last_error = None
    response_obj = None

    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=selected_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AssistantResponse
                )
            )

            if not response or not response.text:
                raise ValueError("Empty response received from Gemini Assistant API.")

            raw_dict = json.loads(response.text)
            response_obj = AssistantResponse(**raw_dict)
            if response_obj:
                break

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                time.sleep(0.5)
            else:
                break

    if not response_obj:
        print(f"[Assistant Engine Error] {last_error}")
        return AssistantResponse(
            problem=request.selected_expression or request.user_query or "Notebook Problem",
            problem_type="general",
            topic="assistant_error",
            confidence=0.0,
            answer="Unable to process assistant request right now. Please try again.",
            verification_status="unverified",
            steps=[
                StepItem(
                    step=1,
                    title="Service Unavailable",
                    explanation="The AI Math Assistant is temporarily unable to connect to the model service.",
                    math="Error: Temporary Connection Issue",
                    display_math="\\text{Error: Temporary Connection Issue}"
                )
            ],
            method="fallback",
            warnings=["Assistant service timeout or connection error."]
        )

    # Ensure display_math is populated with human-readable LaTeX for every step
    for st in response_obj.steps:
        if not st.display_math:
            st.display_math = to_human_math(st.math)

    if response_obj.answer and not ("\\" in response_obj.answer):
        response_obj.answer = to_human_math(response_obj.answer)

    # Apply hybrid verification via SymPy engine
    verified_response = verify_assistant_response(response_obj, request.dict_of_vars)
    return verified_response
