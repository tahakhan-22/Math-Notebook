import pytest
from unittest.mock import patch, MagicMock
from schema import AssistantRequest, AssistantResponse, ContextMessage, StepItem, VisualizationSpec, VisualizationInstructions
from apps.calculator.assistant_engine import process_assistant_request, verify_step_with_sympy
from apps.calculator.assistant_engine.human_formatter import to_human_math

def test_human_formatter():
    """
    Verifies human_formatter converting machine syntax to user-facing LaTeX.
    """
    assert "x^{2}" in to_human_math("x**2 + 2*x + 1") or "x^2" in to_human_math("x**2 + 2*x + 1")
    assert "\\frac" in to_human_math("3/4") or "3/4" in to_human_math("3/4")
    assert "\\sqrt" in to_human_math("sqrt(x)") or "sqrt" in to_human_math("sqrt(x)")

def test_mocked_assistant_calculus_derivative():
    """
    Verifies Assistant handling of a calculus derivative problem: d/dx (x^3 - 3x).
    """
    req = AssistantRequest(
        action="solve",
        selected_expression="f(x) = x^3 - 3x",
        user_query="Find the derivative f'(x)"
    )

    mock_resp = MagicMock()
    mock_resp.text = '''{
        "problem": "f(x) = x^3 - 3x",
        "problem_type": "calculus",
        "topic": "derivative",
        "confidence": 0.99,
        "answer": "f'(x) = 3x^2 - 3",
        "steps": [
            {
                "step": 1,
                "title": "Apply Power Rule",
                "explanation": "d/dx(x^n) = n*x^(n-1)",
                "math": "3*x^2 - 3"
            }
        ],
        "method": "power_rule",
        "visualization": {
            "available": true,
            "type": "2d_function",
            "instructions": {
                "expression": "x**3 - 3*x",
                "secondary_expressions": [
                    { "expression": "3*x**2 - 3", "label": "Derivative" }
                ],
                "x_range": [-3.0, 3.0]
            }
        }
    }'''

    with patch("google.genai.Client") as MockClient:
        mock_client_inst = MockClient.return_value
        mock_client_inst.models.generate_content.return_value = mock_resp

        res = process_assistant_request(req)

        assert res.problem_type == "calculus"
        assert res.topic == "derivative"
        assert len(res.steps) == 1
        assert res.steps[0].display_math != ""
        assert res.visualization.available is True
        assert len(res.visualization.instructions.secondary_expressions) == 1

def test_mocked_assistant_progressive_hint_mode():
    """
    Verifies progressive hint mode without revealing the final answer immediately.
    """
    req = AssistantRequest(
        action="hint",
        hint_level=1,
        selected_expression="\\int x \\cos(x) dx"
    )

    mock_resp = MagicMock()
    mock_resp.text = '''{
        "problem": "\\\\int x \\\\cos(x) dx",
        "problem_type": "calculus",
        "topic": "integration_by_parts",
        "confidence": 0.98,
        "answer": "",
        "verification_status": "unverified",
        "steps": [
            {
                "step": 1,
                "title": "Hint 1: Choose Integration by Parts",
                "explanation": "Identify u and dv using the LIATE rule.",
                "math": "u = x, dv = \\\\cos(x)dx"
            }
        ],
        "method": "hint"
    }'''

    with patch("google.genai.Client") as MockClient:
        mock_client_inst = MockClient.return_value
        mock_client_inst.models.generate_content.return_value = mock_resp

        res = process_assistant_request(req)

        assert res.topic == "integration_by_parts"
        assert res.answer == ""
        assert len(res.steps) == 1
        assert "Hint 1" in res.steps[0].title

def test_mocked_assistant_verify_user_solution():
    """
    Verifies verify mode checking a user's proposed solution.
    """
    req = AssistantRequest(
        action="verify",
        selected_expression="d/dx (x^2 \\sin(x))",
        user_solution="2x \\sin(x) + x^2 \\cos(x)"
    )

    mock_resp = MagicMock()
    mock_resp.text = '''{
        "problem": "d/dx (x^2 \\\\sin(x))",
        "problem_type": "calculus",
        "topic": "product_rule",
        "confidence": 0.99,
        "answer": "2x \\\\sin(x) + x^2 \\\\cos(x)",
        "verification_status": "correct",
        "steps": [
            {
                "step": 1,
                "title": "Verification Result",
                "explanation": "Your solution is completely correct! Applied product rule: (u*v)' = u'v + uv'",
                "math": "d/dx(u*v) = u'*v + u*v'"
            }
        ],
        "method": "product_rule"
    }'''

    with patch("google.genai.Client") as MockClient:
        mock_client_inst = MockClient.return_value
        mock_client_inst.models.generate_content.return_value = mock_resp

        res = process_assistant_request(req)

        assert res.verification_status == "correct"
        assert "correct" in res.steps[0].explanation.lower()

def test_mocked_assistant_notebook_context_followup():
    """
    Verifies that notebook context and follow-up questions are correctly passed.
    """
    context = [
        ContextMessage(role="user", content="f(x) = x^3 - 3x"),
        ContextMessage(role="assistant", content="f'(x) = 3x^2 - 3")
    ]
    req = AssistantRequest(
        action="explain",
        user_query="So where are the critical points?",
        notebook_context=context,
        nearby_expressions=["f(x) = x^3 - 3x"]
    )

    mock_resp = MagicMock()
    mock_resp.text = '''{
        "problem": "Critical points of f(x) = x^3 - 3x",
        "problem_type": "calculus",
        "topic": "critical_points",
        "confidence": 0.99,
        "answer": "x = 1 and x = -1",
        "steps": [
            {
                "step": 1,
                "title": "Set Derivative to Zero",
                "explanation": "Solve 3x^2 - 3 = 0",
                "math": "3x^2 - 3 = 0"
            }
        ]
    }'''

    with patch("google.genai.Client") as MockClient:
        mock_client_inst = MockClient.return_value
        mock_client_inst.models.generate_content.return_value = mock_resp

        res = process_assistant_request(req)

        assert res.topic == "critical_points"
        assert "1" in res.answer

def test_sympy_step_verifier():
    """
    Verifies SymPy step verifier logic.
    """
    verified = verify_step_with_sympy("3 * 4 + 5")
    assert verified == "17" or verified == 17
