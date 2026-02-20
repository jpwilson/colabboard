"""Pydantic request/response schemas for the FastAPI endpoints."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    board_id: str
    verbose: bool = False
    model: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    backend: str
    model: str
