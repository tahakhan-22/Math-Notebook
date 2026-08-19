import re
import sympy
from typing import List, Dict, Any, Union
from apps.calculator.math_engine.normalizer import normalize_expression
from apps.calculator.math_engine.parser import parse_safe_expression, validate_safety
from apps.calculator.math_engine.serializer import serialize_sympy_object
from apps.calculator.math_engine.errors import MathEngineError, SolveError

def solve_expression(expr_input: str, dict_of_vars: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Deterministically solves or evaluates a single mathematical expression, calculus operator, or equation string.
    Updates dict_of_vars in place if an assignment is made.
    Returns a list of dict items matching frontend contract: [{'expr': str, 'result': Any, 'assign': bool}].
    """
    if dict_of_vars is None:
        dict_of_vars = {}

    if not expr_input or not expr_input.strip():
        return []

    raw_input = expr_input.strip()
    validate_safety(raw_input)

    # 0. Calculus Operator Handling: Derivatives (d/dx, diff) and Integrals (\int, integrate)
    if "d/d" in raw_input or "diff(" in raw_input:
        try:
            target_str = re.sub(r'd/d[a-zA-Z]\s*', '', raw_input).strip("()")
            target_str = re.sub(r'diff\(([^,]+),?\s*[a-zA-Z]?\)', r'\1', target_str)
            norm_target = normalize_expression(target_str)
            parsed_target = parse_safe_expression(norm_target, custom_symbols=dict_of_vars)
            x_sym = sympy.Symbol('x')
            for sym in parsed_target.free_symbols:
                x_sym = sym
                break
            derived = sympy.diff(parsed_target, x_sym)
            ser_res = serialize_sympy_object(derived)
            return [{
                "expr": f"d/d{x_sym}({target_str})",
                "result": ser_res,
                "assign": False
            }]
        except Exception:
            pass

    if "\\int" in raw_input or "integrate(" in raw_input:
        try:
            target_str = raw_input.replace("\\int", "").replace("dx", "").replace("dy", "").strip("()")
            target_str = re.sub(r'integrate\(([^,]+),?\s*[a-zA-Z]?\)', r'\1', target_str)
            norm_target = normalize_expression(target_str)
            parsed_target = parse_safe_expression(norm_target, custom_symbols=dict_of_vars)
            x_sym = sympy.Symbol('x')
            for sym in parsed_target.free_symbols:
                x_sym = sym
                break
            integrated = sympy.integrate(parsed_target, x_sym)
            ser_res = serialize_sympy_object(integrated)
            return [{
                "expr": f"\\int ({target_str}) d{x_sym}",
                "result": f"{ser_res} + C",
                "assign": False
            }]
        except Exception:
            pass

    # 1. Handle Equality / Assignment: check if "=" is present in raw input
    if "=" in raw_input and not raw_input.startswith("="):
        parts = raw_input.split("=")
        if len(parts) == 2:
            left_str, right_str = parts[0].strip(), parts[1].strip()

            # Check if it's a simple variable assignment like "x = 5" or "x = 4 + 2"
            if left_str.isidentifier() and left_str not in {"sqrt", "sin", "cos", "tan", "log", "exp", "abs", "pi", "e"}:
                norm_right = normalize_expression(right_str)
                parsed_right = parse_safe_expression(norm_right, custom_symbols=dict_of_vars)
                substituted_right = substitute_vars(parsed_right, dict_of_vars)
                simplified_val = sympy.simplify(substituted_right)
                serialized_res = serialize_sympy_object(simplified_val)
                dict_of_vars[left_str] = serialized_res

                return [{
                    "expr": f"{left_str} = {right_str}",
                    "result": serialized_res,
                    "assign": True
                }]

            # General Equation: left_str = right_str (e.g. 2*x + 5 = 15 or x^2 - 4 = 0)
            norm_left = normalize_expression(left_str)
            norm_right = normalize_expression(right_str)
            parsed_left = parse_safe_expression(norm_left, custom_symbols=dict_of_vars)
            parsed_right = parse_safe_expression(norm_right, custom_symbols=dict_of_vars)

            eq = sympy.Eq(parsed_left, parsed_right)
            eq_sub = substitute_vars(eq, dict_of_vars)

            symbols = list(eq_sub.free_symbols)
            if not symbols:
                is_true = bool(eq_sub.lhs == eq_sub.rhs or sympy.simplify(eq_sub.lhs - eq_sub.rhs) == 0)
                return [{
                    "expr": raw_input,
                    "result": "True" if is_true else "False",
                    "assign": False
                }]

            sol = sympy.solve(eq_sub, symbols)

            if isinstance(sol, dict):
                results = []
                for sym, val in sol.items():
                    ser_val = serialize_sympy_object(val)
                    dict_of_vars[str(sym)] = ser_val
                    results.append({
                        "expr": str(sym),
                        "result": ser_val,
                        "assign": True
                    })
                return results

            elif isinstance(sol, list):
                if len(symbols) == 1:
                    target_sym = str(symbols[0])
                    results = []
                    for val in sol:
                        ser_val = serialize_sympy_object(val)
                        results.append({
                            "expr": raw_input,
                            "result": f"{target_sym} = {ser_val}",
                            "assign": True
                        })
                    return results if results else [{
                        "expr": raw_input,
                        "result": "No solution",
                        "assign": False
                    }]
                elif sol:
                    results = []
                    for tuple_sol in sol:
                        if isinstance(tuple_sol, tuple):
                            sol_strs = [f"{str(sym)} = {serialize_sympy_object(v)}" for sym, v in zip(symbols, tuple_sol)]
                            results.append({
                                "expr": raw_input,
                                "result": ", ".join(sol_strs),
                                "assign": True
                            })
                        else:
                            ser_val = serialize_sympy_object(tuple_sol)
                            results.append({"expr": raw_input, "result": ser_val, "assign": True})
                    return results

    # 2. Expression Evaluation / Simplification (e.g., 3 * 4 + 5, x + 2, x^2 + y)
    norm_str = normalize_expression(raw_input)
    parsed_expr = parse_safe_expression(norm_str, custom_symbols=dict_of_vars)

    subbed_expr = substitute_vars(parsed_expr, dict_of_vars)

    try:
        simplified = sympy.simplify(subbed_expr)
        serialized_val = serialize_sympy_object(simplified)

        return [{
            "expr": raw_input,
            "result": serialized_val,
            "assign": False
        }]
    except Exception as e:
        raise SolveError(f"Failed to evaluate expression '{raw_input}': {e}")

def solve_system_of_equations(eq_strings: List[str], dict_of_vars: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    if dict_of_vars is None:
        dict_of_vars = {}

    eq_objects = []
    all_symbols = set()

    for eq_str in eq_strings:
        if "=" not in eq_str:
            continue
        parts = eq_str.split("=")
        norm_left = normalize_expression(parts[0])
        norm_right = normalize_expression(parts[1])
        p_left = parse_safe_expression(norm_left, custom_symbols=dict_of_vars)
        p_right = parse_safe_expression(norm_right, custom_symbols=dict_of_vars)
        eq = sympy.Eq(p_left, p_right)
        eq_sub = substitute_vars(eq, dict_of_vars)
        eq_objects.append(eq_sub)
        all_symbols.update(eq_sub.free_symbols)

    symbols_list = list(all_symbols)
    if not symbols_list or not eq_objects:
        return []

    sol = sympy.solve(eq_objects, symbols_list)

    if isinstance(sol, dict):
        results = []
        for sym, val in sol.items():
            ser_val = serialize_sympy_object(val)
            dict_of_vars[str(sym)] = ser_val
            results.append({
                "expr": str(sym),
                "result": ser_val,
                "assign": True
            })
        return results
    elif isinstance(sol, list) and sol:
        results = []
        for tuple_sol in sol:
            if isinstance(tuple_sol, tuple):
                for sym, v in zip(symbols_list, tuple_sol):
                    ser_val = serialize_sympy_object(v)
                    dict_of_vars[str(sym)] = ser_val
                    results.append({
                        "expr": str(sym),
                        "result": ser_val,
                        "assign": True
                    })
            else:
                ser_val = serialize_sympy_object(tuple_sol)
                results.append({"expr": "solution", "result": ser_val, "assign": True})
        return results

    return [{"expr": "System", "result": "No solution found", "assign": False}]

def substitute_vars(sympy_obj: Any, dict_of_vars: Dict[str, Any]) -> Any:
    if not dict_of_vars or not hasattr(sympy_obj, "subs"):
        return sympy_obj

    subs_dict = {}
    for k, v in dict_of_vars.items():
        if isinstance(k, str) and k.isidentifier():
            try:
                sym = sympy.Symbol(k)
                if isinstance(v, (int, float)):
                    subs_dict[sym] = v
                elif isinstance(v, str):
                    subs_dict[sym] = sympy.sympify(v)
            except Exception:
                pass

    if subs_dict:
        return sympy_obj.subs(subs_dict)
    return sympy_obj

def process_expressions_sequentially(expressions: List[str], dict_of_vars: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    if dict_of_vars is None:
        dict_of_vars = {}

    all_results = []

    eq_count = sum(1 for e in expressions if "=" in e and not e.split("=")[0].strip().isidentifier())
    if eq_count >= 2:
        try:
            sys_results = solve_system_of_equations(expressions, dict_of_vars)
            if sys_results and sys_results[0].get("result") != "No solution found":
                return sys_results
        except Exception:
            pass

    for expr_str in expressions:
        try:
            res_items = solve_expression(expr_str, dict_of_vars)
            all_results.extend(res_items)
        except MathEngineError as me:
            all_results.append({
                "expr": expr_str,
                "result": f"Math Engine Error: {me}",
                "assign": False
            })
        except Exception as e:
            all_results.append({
                "expr": expr_str,
                "result": "Error: Unable to process expression",
                "assign": False
            })

    return all_results
