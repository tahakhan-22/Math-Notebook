import sympy
from typing import Any, Union

def serialize_sympy_object(obj: Any) -> Union[int, float, str, list, dict, bool]:
    """
    Converts SymPy expressions and objects into JSON-serializable Python native types.
    Handles exact integers, rationals, sets, infinity, and complex numbers cleanly.
    """
    if obj is None:
        return ""

    if isinstance(obj, (bool, int, float, str)):
        return obj

    if isinstance(obj, sympy.Integer):
        return int(obj)

    if isinstance(obj, sympy.Float):
        val = float(obj)
        return int(val) if val.is_integer() else round(val, 6)

    if isinstance(obj, sympy.Rational):
        if obj.q == 1:
            return int(obj.p)
        return f"{obj.p}/{obj.q}"

    if isinstance(obj, sympy.Symbol):
        return str(obj)

    if isinstance(obj, sympy.Equality):
        lhs_str = serialize_sympy_object(obj.lhs)
        rhs_str = serialize_sympy_object(obj.rhs)
        return f"{lhs_str} = {rhs_str}"

    if obj == sympy.EmptySet:
        return "No solution"

    if obj in (sympy.S.Reals, sympy.S.Complexes):
        return "Infinitely many solutions"

    if obj in (sympy.oo, sympy.zoo, -sympy.oo):
        return "Undefined (Division by zero)"

    if isinstance(obj, (sympy.FiniteSet, set, list, tuple)):
        items = [serialize_sympy_object(item) for item in obj]
        return items if len(items) != 1 else items[0]

    if isinstance(obj, dict):
        return {str(k): serialize_sympy_object(v) for k, v in obj.items()}

    if isinstance(obj, sympy.Basic):
        return str(obj)

    return str(obj)
