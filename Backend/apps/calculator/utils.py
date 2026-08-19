import json
import os
import time
from PIL import Image
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from google import genai
from google.genai import types
from constants import GEMINI_API_KEY, GEMINI_MODEL
from apps.calculator.math_engine import process_expressions_sequentially

class TranscribedMathItem(BaseModel):
    expression: str = Field(description="The raw mathematical expression, equation, or variable assignment transcribed from handwriting")
    expression_type: str = Field(default="expression", description="The mathematical type: arithmetic, variable, assignment, equation, system, or ambiguous")
    confidence: float = Field(default=0.95, description="Transcription confidence score from 0.0 to 1.0")
    latex: str = Field(default="", description="Optional LaTeX representation of the handwritten math")

def get_genai_client() -> genai.Client:
    api_key = GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not configured in backend environment.")
    return genai.Client(api_key=api_key)

def analyze_image(img: Image.Image, dict_of_vars: dict) -> List[Dict[str, Any]]:
    """
    Phase 3B Production Pipeline:
    1. Invokes Gemini Vision API strictly as a Transcriber (Image -> Handwritten Math Expression strings).
    2. Passes transcribed expressions to the backend SymPy Math Engine for deterministic solving & evaluation.
    3. Maintains dict_of_vars variable state sequentially.
    """
    client = get_genai_client()

    prompt = (
        "You are a production-grade handwritten mathematical expression transcriber. "
        "Your ONLY role is to accurately transcribe the handwritten mathematical symbols, numbers, variables, "
        "operators, fractions, exponents, roots, parentheses, and equality signs from the image into raw mathematical text. "
        "\n"
        "STRICT RULES:\n"
        "1. Transcribe EXACTLY what is drawn in the image. Do NOT compute answers or solve equations. Do NOT perform arithmetic.\n"
        "2. Preserve mathematical structure: variables, exponents (e.g. x^2 or x²), fractions, square roots, parentheses, equality signs.\n"
        "3. Explicitly classify expression_type as one of: 'arithmetic', 'variable', 'assignment', 'equation', 'system', or 'ambiguous'.\n"
        "4. If multiple expressions or lines exist, return each as a separate item in reading order.\n"
        "5. If handwriting is completely unreadable or ambiguous, set expression_type='ambiguous' and expression='unclear'.\n"
        "\n"
        "Output MUST be a valid JSON array of objects with keys 'expression', 'expression_type', and 'confidence'."
    )

    max_retries = 1
    last_error = None
    transcribed_expressions = []

    for attempt in range(max_retries + 1):
        try:
            selected_model = GEMINI_MODEL
            response = client.models.generate_content(
                model=selected_model,
                contents=[prompt, img],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=list[TranscribedMathItem]
                )
            )

            if not response or not response.text:
                raise ValueError("Empty response received from Gemini API.")

            raw_data = json.loads(response.text)
            if isinstance(raw_data, dict):
                raw_data = [raw_data]

            for item in raw_data:
                expr = str(item.get("expression", "")).strip()
                expr_type = str(item.get("expression_type", "")).strip().lower()
                if expr and expr_type != "ambiguous" and expr != "unclear":
                    transcribed_expressions.append(expr)

            if transcribed_expressions:
                break

        except Exception as e:
            last_error = e
            if attempt < max_retries:
                time.sleep(0.5)
            else:
                break

    if not transcribed_expressions:
        if last_error:
            print(f"[Gemini Transcription Error] {last_error}")
        return [{
            "expr": "Error",
            "result": "Unable to process expression right now. Please try again.",
            "assign": False
        }]

    # Pass transcribed raw expressions into the Deterministic SymPy Math Engine
    results = process_expressions_sequentially(transcribed_expressions, dict_of_vars)
    return results