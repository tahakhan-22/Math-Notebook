class MathEngineError(Exception):
    """Base exception for deterministic math engine errors."""
    pass

class NormalizationError(MathEngineError):
    """Raised when expression normalization fails."""
    pass

MathNormalizationError = NormalizationError

class UnsafeExpressionError(MathEngineError):
    """Raised when an expression contains prohibited or unsafe code constructs."""
    pass

class ParseError(MathEngineError):
    """Raised when an expression cannot be parsed into a valid mathematical AST."""
    pass

MathParseError = ParseError

class SolveError(MathEngineError):
    """Raised when deterministic solving or evaluation fails."""
    pass

MathSolveError = SolveError

class UnsupportedExpressionError(MathEngineError):
    """Raised when an expression type is not supported by the math engine."""
    pass

UnsupportedMathError = UnsupportedExpressionError
