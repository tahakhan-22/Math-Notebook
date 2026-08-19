import re
import sympy

def to_human_math(expr_str: str) -> str:
    """
    Converts machine-oriented Python/SymPy mathematical expressions into clean, human-readable LaTeX format.
    
    Examples:
    - "x**2 + 2*x + 1" -> "x^2 + 2x + 1"
    - "Rational(3, 4)" or "3/4" -> "\\frac{3}{4}"
    - "Integral(x**2, x)" -> "\\int x^2 \\, dx"
    - "Derivative(x**2, x)" -> "\\frac{d}{dx}(x^2)"
    - "sqrt(x)" -> "\\sqrt{x}"
    """
    if not expr_str or not isinstance(expr_str, str):
        return ""

    s = expr_str.strip()

    # If input is already in clean LaTeX format, return directly
    if "\\" in s and not ("**" in s or "Integral" in s or "Derivative" in s or "Rational" in s):
        return s

    try:
        # Try SymPy parse and LaTeX conversion
        sym_expr = sympy.sympify(s, evaluate=False)
        latex_str = sympy.latex(sym_expr)
        if latex_str:
            return latex_str
    except Exception:
        pass

    # Fallback regex transformations
    s = s.replace("**", "^")
    s = s.replace("*", "")
    s = re.sub(r'\bRational\((\d+),\s*(\d+)\)', r'\\frac{\1}{\2}', s)
    s = re.sub(r'sqrt\(([^)]+)\)', r'\\sqrt{\1}', s)

    return s
