"""Langfuse integration — CallbackHandler factory and post-response scoring."""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

CREATE_TOOLS = {
    "createStickyNote", "createShape", "createFrame",
    "createConnector", "createFreedraw",
}
MODIFY_TOOLS = {
    "moveObject", "resizeObject", "updateText",
    "changeColor", "arrangeObjects",
}


def create_langfuse_handler(
    board_id: str,
    command_type: str,
    model_name: str,
):
    """Create a Langfuse CallbackHandler for a single chat request.

    Returns None if Langfuse keys are not configured (graceful degradation).
    """
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    if not public_key or not secret_key:
        return None

    try:
        from langfuse.callback import CallbackHandler

        return CallbackHandler(
            trace_name="ai-chat",
            session_id=f"board:{board_id}",
            tags=[
                f"backend:docker",
                f"model:{model_name}",
                f"command:{command_type}",
            ],
            metadata={
                "boardId": board_id,
                "backend": "docker",
                "commandType": command_type,
            },
        )
    except Exception as e:
        logger.warning("Failed to create Langfuse handler: %s", e)
        return None


def post_scores(
    trace_id: str | None,
    tool_names: list[str],
    latency_ms: int,
) -> None:
    """Post programmatic scores to Langfuse (same metrics as NextJSAdapter)."""
    if not trace_id:
        return

    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
    if not public_key or not secret_key:
        return

    try:
        from langfuse import Langfuse

        langfuse = Langfuse()

        objects_created = sum(1 for t in tool_names if t in CREATE_TOOLS)
        objects_modified = sum(1 for t in tool_names if t in MODIFY_TOOLS)
        objects_deleted = sum(1 for t in tool_names if t == "deleteObject")

        scores = {
            "tool_call_count": len(tool_names),
            "objects_affected": objects_created + objects_modified + objects_deleted,
            "got_board_state": 1 if "getBoardState" in tool_names else 0,
            "hit_step_limit": 1 if len(tool_names) >= 10 else 0,
            "latency_ms": latency_ms,
            "error": 0,
        }

        for name, value in scores.items():
            langfuse.score(
                trace_id=trace_id,
                name=name,
                value=value,
                data_type="NUMERIC",
            )

        langfuse.flush()
    except Exception as e:
        logger.warning("Failed to post Langfuse scores: %s", e)
