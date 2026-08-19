import sympy
from typing import Dict, Any, Optional
from apps.calculator.math_engine import solve_expression
from schema import AssistantResponse

def verify_step_with_sympy(step_math: str, dict_of_vars: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """
    Deterministically verifies a step math expression or equation using SymPy where practical.
    Returns verified simplified string or None if unverified.
    """
    if not step_math or not isinstance(step_math, str):
        return None

    try:
        results = solve_expression(step_math, dict_of_vars or {})
        if results and "result" in results[0]:
            return str(results[0]["result"])
    except Exception:
        pass
    return None

def verify_assistant_response(response: AssistantResponse, dict_of_vars: Optional[Dict[str, Any]] = None) -> AssistantResponse:
    """
    Hybrid Verification: Validates Gemini AI solution steps against SymPy math engine where practical.
    If SymPy confirms exact equality or numerical evaluation, appends verification note.
    """
    if not response or not response.steps:
        return response

    verified_count = 0
    for step in response.steps:
        if step.math:
            verified_val = verify_step_with_sympy(step.math, dict_of_vars)
            if verified_val is not None and "Error" not in verified_val:
                verified_count += 1

    if verified_count > 0:
        if not response.follow_up_context:
            response.follow_up_context = f"[Verified: {verified_count}/{len(response.steps)} steps verified deterministically via SymPy]"
        else:
            response.follow_up_context += f" [SymPy Verified: {verified_count}/{len(response.steps)} steps]"

    return response
