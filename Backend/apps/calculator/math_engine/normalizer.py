import re
from apps.calculator.math_engine.errors import NormalizationError

def normalize_expression(expr_str: str) -> str:
    """
    Hardened Normalizer for Real-World Handwritten Mathematics & LaTeX.
    Transforms Gemini OCR & LaTeX variants into clean SymPy-compatible string syntax.
    """
    if not expr_str or not isinstance(expr_str, str):
        raise NormalizationError("Expression string must be a non-empty string.")

    s = expr_str.strip()

    # 1. Normalize Unicode symbols & minus signs
    s = s.replace("−", "-").replace("–", "-").replace("—", "-")
    s = s.replace("×", "*").replace("·", "*").replace("÷", "/")
    s = s.replace("π", "pi").replace("√", "sqrt")

    # 2. Unicode superscripts: x² -> x**2, x³ -> x**3
    superscript_map = {'⁰': '**0', '¹': '**1', '²': '**2', '³': '**3', '⁴': '**4', '⁵': '**5', '⁶': '**6', '⁷': '**7', '⁸': '**8', '⁹': '**9'}
    for sup_char, repl in superscript_map.items():
        s = s.replace(sup_char, repl)

    # 3. Strip dollar sign wrappers and LaTeX formatting tags
    s = s.replace("$", "").replace("\\left", "").replace("\\right", "")
    s = re.sub(r'\\text\{([^}]*)\}', r'\1', s)
    s = re.sub(r'\\mathrm\{([^}]*)\}', r'\1', s)
    s = re.sub(r'\\mathbf\{([^}]*)\}', r'\1', s)

    # 4. LaTeX function and operator mappings
    s = s.replace("\\times", "*").replace("\\cdot", "*").replace("\\div", "/")
    s = s.replace("\\le", "<=").replace("\\leq", "<=")
    s = s.replace("\\ge", ">=").replace("\\geq", ">=")
    s = s.replace("\\neq", "!=")
    s = s.replace("\\pi", "pi")

    # Functions: \ln(x) -> log(x), \log -> log, \sin -> sin, \cos -> cos, \tan -> tan, \exp -> exp
    s = re.sub(r'\\ln\b', 'log', s)
    s = re.sub(r'\\log\b', 'log', s)
    s = re.sub(r'\\sin\b', 'sin', s)
    s = re.sub(r'\\cos\b', 'cos', s)
    s = re.sub(r'\\tan\b', 'tan', s)
    s = re.sub(r'\\exp\b', 'exp', s)

    # 5. LaTeX Subscripts: x_{1} -> x1, x_1 -> x1 (Subscripted variables like x1, x2 are preserved as identifiers)
    s = re.sub(r'([a-zA-Z])_\{(\d+)\}', r'\1\2', s)
    s = re.sub(r'([a-zA-Z])_(\d+)', r'\1\2', s)

    # 6. LaTeX Square roots: \sqrt{arg} or \sqrt[n]{arg}
    s = re.sub(r'\\sqrt\[([^\]]+)\]\{([^}]+)\}', r'((\2)**(1/(\1)))', s)
    s = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', s)

    # 7. LaTeX Fractions: \frac{num}{den} (handles nested fractions)
    while "\\frac" in s:
        prev_s = s
        s = re.sub(r'\\frac\{([^{}]+)\}\{([^{}]+)\}', r'((\1)/(\2))', s)
        if s == prev_s:
            s = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'((\1)/(\2))', s)
            if s == prev_s:
                break

    # 8. Exponentiation: x^{n} -> x**(n) and x^n -> x**(n)
    s = re.sub(r'\^\{([^}]+)\}', r'**(\1)', s)
    s = re.sub(r'\^([0-9a-zA-Z]+)', r'**\1', s)

    # 9. Spacing artifacts from Gemini transcription:
    # Number before variable: "2 x" -> "2*x", "3 × x" -> "3*x", "x ^ 2" -> "x**2"
    s = re.sub(r'(\d)\s+([a-zA-Z])', r'\1*\2', s)

    # 10. Implicit multiplication patterns:
    # Number before variable/paren/function: 2x -> 2*x, 3(x+1) -> 3*(x+1), 2sqrt(x) -> 2*sqrt(x)
    s = re.sub(r'(\d)\s*([a-zA-Z\(])', r'\1*\2', s)
    s = re.sub(r'(\))\s*([a-zA-Z\(])', r'\1*\2', s)

    # 11. Two-letter variable products (excluding keywords & subscripted vars like x1)
    keywords = {"pi", "sqrt", "sin", "cos", "tan", "log", "exp", "abs", "True", "False"}
    def repl_var_prod(match):
        w = match.group(0)
        if w.lower() in keywords:
            return w
        # 2 distinct alpha letters like xy, ab, xz
        if len(w) == 2 and w[0].isalpha() and w[1].isalpha():
            return f"{w[0]}*{w[1]}"
        return w

    s = re.sub(r'\b[a-zA-Z]{2}\b', repl_var_prod, s)

    # Clean up multiple spaces
    s = re.sub(r'\s+', ' ', s).strip()
    return s
