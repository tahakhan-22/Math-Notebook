from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ImageData(BaseModel):
    image: str
    dict_of_vars: dict = Field(default_factory=dict)

class ContextMessage(BaseModel):
    role: str = Field(description="Role: 'user' or 'assistant'")
    content: str = Field(description="Text content or math expression")

class AssistantRequest(BaseModel):
    image: Optional[str] = Field(default=None, description="Base64 PNG canvas drawing image")
    dict_of_vars: Dict[str, Any] = Field(default_factory=dict, description="Active variable state dictionary")
    action: str = Field(default="solve", description="Action: solve, explain, hint, simplify, alternative, verify, visualize, continue, practice")
    selected_expression: Optional[str] = Field(default=None, description="Currently selected math expression on canvas")
    nearby_expressions: List[str] = Field(default_factory=list, description="Nearby notebook expressions for spatial context")
    user_query: Optional[str] = Field(default=None, description="User follow-up question or query string")
    user_solution: Optional[str] = Field(default=None, description="User's proposed solution for verify mode")
    hint_level: int = Field(default=1, description="Progressive hint level index (1, 2, 3...)")
    notebook_context: List[ContextMessage] = Field(default_factory=list, description="Recent notebook conversation & expression context")

class StepItem(BaseModel):
    step: int = Field(description="Step sequence index starting at 1")
    title: str = Field(description="Brief title of the mathematical step")
    explanation: str = Field(description="Clear pedagogical explanation")
    math: str = Field(description="Internal math expression or equation for this step")
    display_math: Optional[str] = Field(default="", description="User-facing human readable LaTeX representation")

class AnnotationItem(BaseModel):
    type: str = Field(description="Annotation type: root, critical_point, minimum, maximum, inflection, tangent, asymptote")
    x: float = Field(description="X coordinate")
    y: Optional[float] = Field(default=None, description="Y coordinate")
    label: str = Field(default="", description="Annotation label")

class SecondaryExpression(BaseModel):
    expression: str = Field(description="Mathematical expression for derived/solution curve")
    label: str = Field(default="Derivative / Solution", description="Curve label for legend")

class VisualizationInstructions(BaseModel):
    expression: str = Field(default="", description="Primary mathematical function or surface expression for plotting")
    secondary_expressions: List[SecondaryExpression] = Field(default_factory=list, description="Secondary solution or derived curves to plot simultaneously")
    x_range: List[float] = Field(default_factory=lambda: [-5.0, 5.0], description="X axis plot range [min, max]")
    y_range: List[float] = Field(default_factory=lambda: [-5.0, 5.0], description="Y axis plot range [min, max]")
    annotations: List[AnnotationItem] = Field(default_factory=list, description="Key mathematical plot annotations")

class VisualizationSpec(BaseModel):
    available: bool = Field(default=False, description="Whether visualization is available for this problem")
    type: str = Field(default="none", description="Visualization type: 2d_function, derivative_graph, integral_area, 3d_surface, vector_field, none")
    instructions: VisualizationInstructions = Field(default_factory=VisualizationInstructions)

class AssistantResponse(BaseModel):
    problem: str = Field(default="", description="Transcribed or recognized mathematical problem")
    problem_type: str = Field(default="general", description="Category: arithmetic, algebra, calculus, multivariable, linear_algebra, differential_equations")
    topic: str = Field(default="general", description="Specific topic e.g. integration_by_parts, quadratic_formula")
    confidence: float = Field(default=0.95, description="Confidence score from 0.0 to 1.0")
    answer: str = Field(default="", description="Final mathematical answer in LaTeX or clean math syntax")
    verification_status: str = Field(default="unverified", description="Verification status: correct, incorrect, partially_correct, unverified")
    steps: List[StepItem] = Field(default_factory=list, description="Step-by-step solution walkthrough")
    method: str = Field(default="standard", description="Primary solution method used")
    alternative_methods: List[str] = Field(default_factory=list, description="List of alternative solution approaches")
    visualization: VisualizationSpec = Field(default_factory=VisualizationSpec)
    follow_up_context: str = Field(default="", description="Contextual note for follow-up questions")
    warnings: List[str] = Field(default_factory=list, description="Any ambiguity or edge-case warnings")
