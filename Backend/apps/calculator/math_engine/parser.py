import re
import sympy
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)
from apps.calculator.math_engine.errors import UnsafeExpressionError, ParseError

# Prohibited dangerous keywords and non-mathematical patterns
PROHIBITED_PATTERNS = [
    r'__import__',
    r'\bimport\b',
    r'\beval\b',
    r'\bexec\b',
    r'\blambda\b',
    r'\bopen\b',
    r'\bos\b',
    r'\bsys\b',
    r'\bsystem\b',
    r'\bsubprocess\b',
    r'\bbuiltins\b',
    r'\bglobals\b',
    r'\blocals\b',
    r'\bgetattr\b',
    r'\bsetattr\b',
    r'\bdelattr\b',
    r'__class__',
    r'\bSymbol\b',
    r'\bFunction\b',
    r'__',
]

# Explicit function and constant allowlists
FUNCTION_ALLOWLIST = {
    "sqrt", "sin", "cos", "tan", "log", "ln", "exp", "abs",
    "diff", "derivative", "integrate", "integral", "limit",
    "f", "g", "h", "y", "u", "v"
}
CONSTANT_ALLOWLIST = {"pi", "e", "E"}

SAFE_FUNCTIONS = {
    "sqrt": sympy.sqrt,
    "sin": sympy.sin,
    "cos": sympy.cos,
    "tan": sympy.tan,
    "log": sympy.log,
    "ln": sympy.log,
    "exp": sympy.exp,
    "abs": sympy.Abs,
    "diff": sympy.diff,
    "derivative": sympy.diff,
    "integrate": sympy.integrate,
    "integral": sympy.integrate,
    "limit": sympy.limit,
    "pi": sympy.pi,
    "e": sympy.E,
    "E": sympy.E,
}

def validate_safety(expr_str: str) -> None:
    """
    Validates that the input expression string contains no malicious tokens, lambdas, or dangerous calls.
    Raises UnsafeExpressionError if any prohibited pattern is detected.
    """
    for pattern in PROHIBITED_PATTERNS:
        if re.search(pattern, expr_str, re.IGNORECASE):
            raise UnsafeExpressionError(f"Expression contains prohibited security pattern: {pattern}")

    # Check for unauthorized function call syntax: e.g. unknown_func(...)
    for match in re.finditer(r'\b([a-zA-Z_]\w*)\s*\(', expr_str):
        fname = match.group(1)
        if fname.lower() not in FUNCTION_ALLOWLIST and len(fname) > 1:
            raise ParseError(f"Unsupported function call '{fname}'. Allowed functions: {sorted(FUNCTION_ALLOWLIST)}")

def parse_safe_expression(expr_str: str, custom_symbols: dict = None) -> sympy.Expr:
    """
    Safely parses a normalized mathematical expression string into a SymPy AST.
    Enforces FUNCTION_ALLOWLIST checking.
    """
    validate_safety(expr_str)

    transformations = (
        standard_transformations +
        (implicit_multiplication_application, convert_xor)
    )

    local_dict = dict(SAFE_FUNCTIONS)
    
    # Pre-register any alphanumeric identifiers in expr_str (e.g. x1, x2, y1, f, g) as Symbol objects
    identifiers = re.findall(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', expr_str)
    for ident in identifiers:
        if ident.lower() not in FUNCTION_ALLOWLIST and ident not in CONSTANT_ALLOWLIST:
            local_dict[ident] = sympy.Symbol(ident)

    if custom_symbols:
        for k, v in custom_symbols.items():
            if isinstance(k, str) and k.isidentifier():
                local_dict[k] = sympy.Symbol(k) if not isinstance(v, sympy.Basic) else v

    try:
        parsed = parse_expr(
            expr_str,
            local_dict=local_dict,
            transformations=transformations,
            evaluate=False
        )

        return parsed
    except Exception as e:
        if isinstance(e, (UnsafeExpressionError, ParseError)):
            raise
        raise ParseError(f"Failed to parse mathematical expression '{expr_str}': {e}")
