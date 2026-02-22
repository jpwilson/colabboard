"""Integration tests for FastAPI endpoints."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["backend"] == "docker"
    assert "model" in data


@pytest.mark.asyncio
async def test_chat_returns_ndjson():
    """Test that /chat returns NDJSON with at least a finish event."""

    # Mock the agent to yield a simple text + finish
    async def mock_stream(*args, **kwargs):
        # Simulate on_chat_model_stream event
        chunk_mock = MagicMock()
        chunk_mock.content = "Hello from Python agent"
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": chunk_mock},
        }

    mock_executor = MagicMock()
    mock_executor.astream_events = mock_stream

    with patch("app.main.create_agent", return_value=mock_executor), \
         patch("app.main._get_supabase", return_value=MagicMock()), \
         patch("app.main.create_langfuse_handler", return_value=None), \
         patch("app.main.post_scores"):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/chat",
                json={
                    "messages": [{"role": "user", "content": "Create a yellow sticky note"}],
                    "board_id": "test-board",
                    "verbose": False,
                },
            )

    assert resp.status_code == 200
    assert "application/x-ndjson" in resp.headers.get("content-type", "")

    lines = [line for line in resp.text.strip().split("\n") if line.strip()]
    assert len(lines) >= 1

    # Last line should be finish
    last = json.loads(lines[-1])
    assert last["type"] == "finish"

    # First line should be text
    if len(lines) > 1:
        first = json.loads(lines[0])
        assert first["type"] == "text"
        assert first["content"] == "Hello from Python agent"


@pytest.mark.asyncio
async def test_chat_tool_call_event():
    """Test that tool calls are streamed as NDJSON events."""

    async def mock_stream(*args, **kwargs):
        yield {
            "event": "on_tool_end",
            "name": "createStickyNote",
            "data": {
                "input": {"text": "Hello"},
                "output": {
                    "action": "create",
                    "object": {
                        "id": "test-id",
                        "type": "sticky_note",
                        "text": "Hello",
                        "x": 100, "y": 100,
                        "width": 150, "height": 150,
                        "fill": "#EAB308",
                        "z_index": 0,
                        "updated_at": "2024-01-01T00:00:00Z",
                    },
                },
            },
        }

    mock_executor = MagicMock()
    mock_executor.astream_events = mock_stream

    with patch("app.main.create_agent", return_value=mock_executor), \
         patch("app.main._get_supabase", return_value=MagicMock()), \
         patch("app.main.create_langfuse_handler", return_value=None), \
         patch("app.main.post_scores"):

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/chat",
                json={
                    "messages": [{"role": "user", "content": "Create a sticky note"}],
                    "board_id": "test-board",
                },
            )

    lines = [line for line in resp.text.strip().split("\n") if line.strip()]
    tool_events = [json.loads(l) for l in lines if json.loads(l)["type"] == "tool_call"]
    assert len(tool_events) == 1
    assert tool_events[0]["name"] == "createStickyNote"
    assert tool_events[0]["output"]["action"] == "create"
    assert tool_events[0]["output"]["object"]["text"] == "Hello"
