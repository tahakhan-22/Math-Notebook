import pytest
from apps.calculator.math_engine import (
    solve_expression,
    process_expressions_sequentially,
    solve_system_of_equations,
    serialize_sympy_object,
    UnsafeExpressionError,
    MathEngineError,
    ParseError,
)

# 1. 2 + 3 -> 5
def test_addition():
    res = solve_expression("2 + 3")
    assert res[0]["result"] == 5

# 2. 3 * 4 + 5 -> 17
def test_pemdas_multiplication_addition():
    res = solve_expression("3 * 4 + 5")
    assert res[0]["result"] == 17

# 3. 10 / 2 -> 5
def test_division():
    res = solve_expression("10 / 2")
    assert res[0]["result"] == 5

# 4. 2^3 -> 8
def test_exponentiation():
    res = solve_expression("2^3")
    assert res[0]["result"] == 8

# 5. 2x with x=4 -> 8
def test_implicit_multiplication_variable():
    dict_vars = {"x": 4}
    res = solve_expression("2x", dict_vars)
    assert res[0]["result"] == 8

# 6. x + 2 with x=4 -> 6
def test_variable_addition():
    dict_vars = {"x": 4}
    res = solve_expression("x + 2", dict_vars)
    assert res[0]["result"] == 6

# 7. x = 5 -> assignment
def test_variable_assignment_x_5():
    dict_vars = {}
    res = solve_expression("x = 5", dict_vars)
    assert res[0]["assign"] is True
    assert res[0]["result"] == 5
    assert dict_vars.get("x") == 5

# 8. x + 2 = 5 -> x=3
def test_equation_x_plus_2_equals_5():
    dict_vars = {}
    res = solve_expression("x + 2 = 5", dict_vars)
    assert len(res) > 0
    assert "3" in str(res[0]["result"])

# 9. 2x + 4 = 10 -> x=3
def test_equation_2x_plus_4_equals_10():
    dict_vars = {}
    res = solve_expression("2x + 4 = 10", dict_vars)
    assert len(res) > 0
    assert "3" in str(res[0]["result"])

# 10. sequential assignment: x = 5 -> y = x + 2 -> y * 3 -> 21
def test_sequential_assignments_21():
    dict_vars = {}
    expressions = ["x = 5", "y = x + 2", "y * 3"]
    results = process_expressions_sequentially(expressions, dict_vars)
    assert dict_vars.get("x") == 5
    assert dict_vars.get("y") == 7
    assert results[2]["result"] == 21

# 11. fractions \frac{3}{4} + \frac{1}{4} -> 1
def test_fractions_latex():
    res = solve_expression("\\frac{3}{4} + \\frac{1}{4}")
    assert res[0]["result"] == 1

# 12. sqrt(16) -> 4
def test_square_root():
    res = solve_expression("sqrt(16)")
    assert res[0]["result"] == 4

# 13. decimal arithmetic 2.5 + 3.7 -> 6.2 and 10.5 / 2 -> 5.25
def test_decimal_arithmetic():
    res1 = solve_expression("2.5 + 3.7")
    assert abs(res1[0]["result"] - 6.2) < 1e-5

    res2 = solve_expression("10.5 / 2")
    assert abs(res2[0]["result"] - 5.25) < 1e-5

# 14. invalid syntax rejection
def test_invalid_syntax_rejection():
    with pytest.raises(MathEngineError):
        solve_expression("2 + * 5")

# 15. malicious input rejection
def test_malicious_input_rejection():
    malicious = [
        '__import__("os").system("ls")',
        'eval("1+1")',
        'exec("import os")',
        'open("secret.txt")',
        'os.system("echo hacked")',
        'lambda x: x',
        'foo.__class__',
        'Symbol("x")',
        'Function("f")',
    ]
    for code in malicious:
        with pytest.raises(MathEngineError):
            solve_expression(code)

# 16. unsupported functions rejection
def test_unsupported_functions_rejection():
    with pytest.raises(MathEngineError):
        solve_expression("unsupported_func_xyz(10)")

# 17. division by zero handling
def test_division_by_zero():
    results = process_expressions_sequentially(["5 / 0"])
    assert len(results) == 1
    assert "Error" in str(results[0]["result"]) or "zoo" in str(results[0]["result"]) or "nan" in str(results[0]["result"]).lower() or "Undefined" in str(results[0]["result"])

# 18. JSON serialization of SymPy results
def test_json_serialization_sympy():
    import sympy
    assert serialize_sympy_object(sympy.Integer(5)) == 5
    assert serialize_sympy_object(sympy.Float(3.14)) == 3.14
    assert serialize_sympy_object(sympy.Rational(1, 2)) == "1/2"

# 19. dict_of_vars initial state
def test_dict_of_vars_initial_state():
    initial_vars = {"a": 10, "b": 20}
    res = solve_expression("a + b", initial_vars)
    assert res[0]["result"] == 30

# 20. multiple expressions in a single request
def test_multiple_expressions_single_request():
    dict_vars = {}
    exprs = ["a = 2", "b = 3", "a * b"]
    results = process_expressions_sequentially(exprs, dict_vars)
    assert len(results) == 3
    assert results[2]["result"] == 6

# Phase 3B Real Handwriting Artifact Tests:
def test_handwriting_ocr_artifacts():
    res1 = solve_expression("3 × 4 + 5")
    assert res1[0]["result"] == 17

    res2 = solve_expression("10 ÷ 2")
    assert res2[0]["result"] == 5

    res3 = solve_expression("x² + 2x + 1", {"x": 3})
    assert res3[0]["result"] == 16

    res4 = solve_expression("x_{1} + x_{2}", {"x1": 4, "x2": 6})
    assert res4[0]["result"] == 10

    res5 = solve_expression("\\ln(e)")
    assert res5[0]["result"] == 1
