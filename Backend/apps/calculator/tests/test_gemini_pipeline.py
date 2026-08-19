from unittest.mock import patch, MagicMock
from PIL import Image
from apps.calculator.utils import analyze_image

def test_mocked_gemini_equation_pipeline():
    """
    Verifies Image -> Mock Gemini Transcription ("x + 2 = 5", type="equation") -> Deterministic SymPy Solver -> Result (x = 3).
    """
    img = Image.new("RGB", (100, 100), color=(0, 0, 0))
    dict_vars = {}

    mock_response = MagicMock()
    mock_response.text = '[{"expression": "x + 2 = 5", "expression_type": "equation", "confidence": 0.99, "latex": "x + 2 = 5"}]'

    with patch("google.genai.Client") as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.models.generate_content.return_value = mock_response

        results = analyze_image(img, dict_vars)

        assert len(results) >= 1
        assert "3" in str(results[0]["result"])
        assert results[0]["assign"] is True

def test_mocked_gemini_arithmetic_pipeline():
    """
    Verifies Image -> Mock Gemini Transcription ("3 * 4 + 5", type="arithmetic") -> Deterministic SymPy Solver -> Result (17).
    """
    img = Image.new("RGB", (100, 100), color=(0, 0, 0))
    dict_vars = {}

    mock_response = MagicMock()
    mock_response.text = '[{"expression": "3 * 4 + 5", "expression_type": "arithmetic", "confidence": 0.98, "latex": "3 \\times 4 + 5"}]'

    with patch("google.genai.Client") as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.models.generate_content.return_value = mock_response

        results = analyze_image(img, dict_vars)

        assert len(results) == 1
        assert results[0]["result"] == 17
        assert results[0]["assign"] is False

def test_mocked_gemini_ambiguous_rejection():
    """
    Verifies that ambiguous or unclear transcription is safely handled.
    """
    img = Image.new("RGB", (100, 100), color=(0, 0, 0))
    dict_vars = {}

    mock_response = MagicMock()
    mock_response.text = '[{"expression": "unclear", "expression_type": "ambiguous", "confidence": 0.1, "latex": ""}]'

    with patch("google.genai.Client") as MockClient:
        mock_client_instance = MockClient.return_value
        mock_client_instance.models.generate_content.return_value = mock_response

        results = analyze_image(img, dict_vars)

        assert len(results) == 1
        assert results[0]["expr"] == "Error"
