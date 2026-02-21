"""Command classifier for Langfuse tagging — ported from src/lib/ai/classify-command.ts."""

from __future__ import annotations

import re
from typing import Literal

CommandType = Literal[
    "create", "template", "layout", "modify", "delete", "query", "ambiguous"
]

_PATTERNS: list[tuple[CommandType, re.Pattern[str]]] = [
    # Templates (check before create)
    ("template", re.compile(
        r"\b(swot|kanban|retrospective|retro|pros.?cons|brainstorm|flowchart|timeline|decision.?matrix|template)\b",
        re.IGNORECASE,
    )),
    # Delete
    ("delete", re.compile(
        r"\b(delete|remove|clear|erase|get rid of)\b", re.IGNORECASE
    )),
    # Layout / arrange
    ("layout", re.compile(
        r"\b(arrange|grid|organize|align|layout|sort|group|spread)\b",
        re.IGNORECASE,
    )),
    # Query / read
    ("query", re.compile(
        r"\b(what('s| is)|how many|list|show me|describe|count|tell me about)\b",
        re.IGNORECASE,
    )),
    # Modify
    ("modify", re.compile(
        r"\b(change|update|modify|resize|make .*(larger|smaller|bigger|green|blue|red|yellow|pink|purple)|move|rename|recolor|edit)\b",
        re.IGNORECASE,
    )),
    # Create
    ("create", re.compile(
        r"\b(add|create|make|put|place|insert|draw|new|build|generate)\b",
        re.IGNORECASE,
    )),
]


def classify_command(message: str) -> CommandType:
    for cmd_type, regex in _PATTERNS:
        if regex.search(message):
            return cmd_type
    return "ambiguous"
