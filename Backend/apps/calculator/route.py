import base64
from io import BytesIO
from fastapi import APIRouter, HTTPException, status
from PIL import Image
from apps.calculator.utils import analyze_image
from schema import ImageData

router = APIRouter()

@router.post('')
async def run(data: ImageData):
    """
    POST /calculate
    Receives canvas image base64 data and user-assigned variables dictionary.
    Invokes Gemini Vision API via google-genai SDK to recognize & solve handwritten math.
    """
    if not data.image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image payload is required."
        )

    try:
        # Extract base64 payload from data URL string if present
        image_str = data.image
        if "," in image_str:
            image_str = image_str.split(",", 1)[1]

        image_bytes = base64.b64decode(image_str)
        if not image_bytes:
            raise ValueError("Decoded image byte payload is empty.")

        image = Image.open(BytesIO(image_bytes))
        image.load()

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or corrupted canvas image data."
        )

    try:
        dict_vars = data.dict_of_vars if isinstance(data.dict_of_vars, dict) else {}
        responses = analyze_image(image, dict_of_vars=dict_vars)

        return {
            "message": "Image processed",
            "data": responses,
            "status": "success"
        }

    except Exception as e:
        print(f"[Backend Error] Calculation failed: {e}")
        return {
            "message": "Unable to process the expression right now. Please try again.",
            "data": [],
            "status": "error"
        }
