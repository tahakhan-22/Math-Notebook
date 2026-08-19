# IPAD MATH NOTE — FastAPI Backend

## Overview
Production-grade FastAPI backend for **IPAD MATH NOTE**, an AI-powered touch-first mathematical notebook application designed for iPad, mobile, and tablet.

## Architecture
- **Gemini Vision & Tutor Engine**: Powers handwriting recognition, mathematical problem transcription, step-by-step educational explanations, and graph visualization instructions.
- **Deterministic SymPy Engine**: Solves arithmetic, equations, variable assignments, and provides deterministic verification for AI predictions.
- **Human Math Presentation Layer (`human_formatter.py`)**: Converts machine-oriented Python/SymPy strings (`x**2`, `Rational(3,4)`) into clean, user-facing LaTeX (`x^2`, `\frac{3}{4}`).

## Security
- `GEMINI_API_KEY` is strictly backend-only and never exposed to client bundles or Vite environment variables.
- Zero dynamic code execution (`eval`/`exec`).

## Endpoints
- `POST /calculate`: Accepts `{ "image": "...", "dict_of_vars": {...} }` and returns deterministic solutions.
- `POST /assistant`: Accepts `{ "image": "...", "action": "solve|explain|hint|verify|visualize", "selected_expression": "...", "notebook_context": [...] }` and returns structured `AssistantResponse`.
