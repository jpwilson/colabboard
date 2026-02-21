"""FastAPI application — /health and /chat endpoints for the Orim Python agent."""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from collections.abc import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage

from app.agent import create_agent
from app.classify import classify_command
from app.langfuse_setup import create_langfuse_handler, post_scores
from app.models import ChatRequest, HealthResponse

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="Orim Agent (Python/LangChain)")

DEFAULT_MODEL = os.environ.get("AGENT_MODEL", "claude-sonnet-4-5")

# Lazy-init Supabase client (only when /chat is called)
_supabase_client = None


def _get_supabase():
    global _supabase_client
    if _supabase_client is None:
        from supabase import create_client

        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if url and key:
            _supabase_client = create_client(url, key)
    return _supabase_client


@app.get("/health")
async def health():
    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("CLAUDE_KEY", "")
    has_key = bool(api_key and api_key.startswith("sk-ant-"))
    return {
        "status": "ok",
        "backend": "docker",
        "model": DEFAULT_MODEL,
        "has_anthropic_key": has_key,
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    return StreamingResponse(
        stream_agent_response(request),
        media_type="application/x-ndjson",
    )


async def stream_agent_response(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Run the agent and stream NDJSON events."""
    start_time = time.monotonic()

    model_name = request.model or DEFAULT_MODEL
    supabase = _get_supabase()

    executor = create_agent(
        board_id=request.board_id,
        verbose=request.verbose,
        model_name=model_name,
        supabase_client=supabase,
    )

    # Build LangChain message history
    chat_history: list = []
    last_user_msg = ""
    for msg in request.messages:
        if msg.role == "user":
            last_user_msg = msg.content
            chat_history.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            chat_history.append(AIMessage(content=msg.content))

    # Pop the last user message — it goes into "input", rest is chat_history
    if chat_history and isinstance(chat_history[-1], HumanMessage):
        chat_history.pop()

    # Classify command for Langfuse tagging
    command_type = classify_command(last_user_msg)

    # Set up Langfuse callback handler
    langfuse_handler = create_langfuse_handler(
        board_id=request.board_id,
        command_type=command_type,
        model_name=model_name,
    )
    callbacks = [langfuse_handler] if langfuse_handler else []

    # Track tool calls for scoring
    tool_names: list[str] = []
    trace_id: str | None = None

    try:
        async for event in executor.astream_events(
            {"input": last_user_msg, "chat_history": chat_history},
            config={"callbacks": callbacks},
            version="v2",
        ):
            kind = event.get("event", "")

            # Extract trace ID from the Langfuse handler
            if trace_id is None and langfuse_handler:
                try:
                    trace_id = langfuse_handler.trace.id if langfuse_handler.trace else None
                except Exception:
                    pass

            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    content = chunk.content
                    # content can be a string or a list of dicts
                    if isinstance(content, str) and content:
                        yield json.dumps({"type": "text", "content": content}) + "\n"
                    elif isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                text = block.get("text", "")
                                if text:
                                    yield json.dumps({"type": "text", "content": text}) + "\n"

            elif kind == "on_tool_end":
                tool_name = event.get("name", "")
                tool_output = event.get("data", {}).get("output")
                tool_names.append(tool_name)

                yield json.dumps({
                    "type": "tool_call",
                    "id": str(uuid.uuid4()),
                    "name": tool_name,
                    "args": event.get("data", {}).get("input", {}),
                    "output": tool_output,
                }) + "\n"

    except Exception as e:
        logger.exception("Agent error")
        yield json.dumps({"type": "error", "error": str(e)}) + "\n"

    yield json.dumps({"type": "finish"}) + "\n"

    # Post-response scoring
    latency_ms = int((time.monotonic() - start_time) * 1000)
    post_scores(trace_id, tool_names, latency_ms)
