"""AI agent tool definitions — ported from src/lib/ai/tools.ts.

Tools are pure: they return data (object definitions), not side effects.
The frontend receives these results and calls addObject/updateObject/deleteObject.

Exception: getBoardState and arrangeObjects read from Supabase server-side.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from langchain_core.tools import tool

from app.defaults import SHAPE_DEFAULTS, SHAPE_TYPES, STICKY_COLORS


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_tools(board_id: str, supabase_client: Any) -> list:
    """Create all 11 tools bound to a specific board_id and Supabase client."""

    # ── Creation Tools ──────────────────────────────────────────────

    @tool("createStickyNote")
    def create_sticky_note(
        text: str,
        x: float = 100,
        y: float = 100,
        color: Optional[str] = None,
        width: Optional[float] = None,
        height: Optional[float] = None,
    ) -> dict:
        """Create a sticky note on the board with text and optional position/color."""
        defaults = SHAPE_DEFAULTS["sticky_note"]
        return {
            "action": "create",
            "object": {
                "id": _uuid(),
                "type": "sticky_note",
                "x": x,
                "y": y,
                "width": width or defaults["width"],
                "height": height or defaults["height"],
                "fill": color or defaults["fill"],
                "text": text,
                "z_index": 0,
                "updated_at": _now(),
            },
        }

    @tool("createShape")
    def create_shape(
        type: str,
        x: float = 100,
        y: float = 100,
        width: Optional[float] = None,
        height: Optional[float] = None,
        fill: Optional[str] = None,
        stroke: Optional[str] = None,
        strokeWidth: Optional[float] = None,
    ) -> dict:
        """Create a shape on the board. Supported types: rectangle, rounded_rectangle, circle, ellipse, triangle, diamond, star, hexagon, pentagon, arrow, line."""
        defaults = SHAPE_DEFAULTS.get(type, SHAPE_DEFAULTS["rectangle"])
        return {
            "action": "create",
            "object": {
                "id": _uuid(),
                "type": type,
                "x": x,
                "y": y,
                "width": width or defaults["width"],
                "height": height or defaults["height"],
                "fill": fill or defaults["fill"],
                "stroke": stroke or defaults.get("stroke", "#94a3b8"),
                "strokeWidth": strokeWidth or defaults.get("strokeWidth", 1),
                "z_index": 0,
                "updated_at": _now(),
            },
        }

    @tool("createFrame")
    def create_frame(
        title: str,
        x: float = 100,
        y: float = 100,
        width: float = 350,
        height: float = 300,
        fill: str = "#f1f5f9",
    ) -> dict:
        """Create a frame (large labeled rectangle) to group and organize content areas. Use for templates like SWOT quadrants, kanban columns, etc."""
        frame_w = width
        return {
            "action": "create",
            "object": {
                "id": _uuid(),
                "type": "rectangle",
                "x": x,
                "y": y,
                "width": frame_w,
                "height": height,
                "fill": fill,
                "stroke": "#94a3b8",
                "strokeWidth": 2,
                "opacity": 0.5,
                "z_index": -1,
                "updated_at": _now(),
            },
            "titleLabel": {
                "id": _uuid(),
                "type": "sticky_note",
                "x": x + 10,
                "y": y + 10,
                "width": min(frame_w - 20, 200),
                "height": 40,
                "fill": fill,
                "text": title,
                "z_index": 0,
                "updated_at": _now(),
            },
        }

    @tool("createConnector")
    def create_connector(
        fromId: str,
        toId: str,
        style: str = "arrow-end",
    ) -> dict:
        """Create a connector (arrow/line) between two existing objects on the board. Call getBoardState first to get object IDs."""
        return {
            "action": "create",
            "object": {
                "id": _uuid(),
                "type": "connector",
                "x": 0,
                "y": 0,
                "width": 0,
                "height": 0,
                "fill": "transparent",
                "stroke": "#1f2937",
                "strokeWidth": 2,
                "fromId": fromId,
                "toId": toId,
                "connectorStyle": style,
                "z_index": 0,
                "updated_at": _now(),
            },
        }

    @tool("createFreedraw")
    def create_freedraw(
        points: list,
        stroke: str = "#1f2937",
        strokeWidth: float = 3,
    ) -> dict:
        """Create a freehand drawing on the board. Provide a flat array of [x1, y1, x2, y2, ...] coordinates in absolute board space. The points will be normalized to the bounding box automatically. Use this to draw artistic shapes, sketches, underlines, circles, arrows, wavy lines, decorative elements, or any freeform path. Generate smooth curves by using many closely-spaced points (e.g., 20-50+ points for a curve). For a circle, use sin/cos to generate points around the circumference."""
        if len(points) < 4:
            return {
                "action": "create",
                "error": "Need at least 2 points (4 values) for a freehand drawing",
            }

        xs = [points[i] for i in range(0, len(points), 2)]
        ys = [points[i] for i in range(1, len(points), 2)]
        min_x, min_y = min(xs), min(ys)
        max_x, max_y = max(xs), max(ys)

        normalized = [
            v - min_x if i % 2 == 0 else v - min_y
            for i, v in enumerate(points)
        ]

        return {
            "action": "create",
            "object": {
                "id": _uuid(),
                "type": "freedraw",
                "x": min_x,
                "y": min_y,
                "width": max(max_x - min_x, 1),
                "height": max(max_y - min_y, 1),
                "fill": "transparent",
                "stroke": stroke,
                "strokeWidth": strokeWidth,
                "points": normalized,
                "z_index": 0,
                "updated_at": _now(),
            },
        }

    # ── Manipulation Tools ──────────────────────────────────────────

    @tool("moveObject")
    def move_object(objectId: str, x: float, y: float) -> dict:
        """Move an object to a new position on the board."""
        return {"action": "update", "id": objectId, "updates": {"x": x, "y": y}}

    @tool("resizeObject")
    def resize_object(objectId: str, width: float, height: float) -> dict:
        """Resize an object on the board."""
        return {
            "action": "update",
            "id": objectId,
            "updates": {"width": width, "height": height},
        }

    @tool("updateText")
    def update_text(objectId: str, newText: str) -> dict:
        """Update the text content of a sticky note or text object."""
        return {
            "action": "update",
            "id": objectId,
            "updates": {"text": newText},
        }

    @tool("changeColor")
    def change_color(objectId: str, color: str) -> dict:
        """Change the fill color of an object."""
        return {
            "action": "update",
            "id": objectId,
            "updates": {"fill": color},
        }

    @tool("deleteObject")
    def delete_object(objectId: str) -> dict:
        """Delete an object from the board."""
        return {"action": "delete", "id": objectId}

    # ── Layout Tool ─────────────────────────────────────────────────

    @tool("arrangeObjects")
    def arrange_objects(
        objectIds: list,
        layout: str,
        startX: float = 100,
        startY: float = 100,
        gap: float = 20,
        columns: int = 4,
    ) -> dict:
        """Move multiple objects into an arrangement (grid, horizontal row, vertical column). Provide the object IDs and layout type. Objects will be arranged starting from (startX, startY) with the given gap between them."""
        data = (
            supabase_client.table("board_objects")
            .select("id, width, height")
            .eq("board_id", board_id)
            .in_("id", objectIds)
            .execute()
        )

        obj_map = {
            o["id"]: {"w": o["width"], "h": o["height"]}
            for o in (data.data or [])
        }

        batch_updates: list = []
        cur_x = startX
        cur_y = startY
        row_max_h = 0

        for i, oid in enumerate(objectIds):
            dims = obj_map.get(oid, {"w": 150, "h": 150})

            if layout == "horizontal":
                batch_updates.append({"id": oid, "updates": {"x": cur_x, "y": startY}})
                cur_x += dims["w"] + gap
            elif layout == "vertical":
                batch_updates.append({"id": oid, "updates": {"x": startX, "y": cur_y}})
                cur_y += dims["h"] + gap
            else:  # grid
                col = i % columns
                row = i // columns
                if col == 0 and row > 0:
                    cur_y += row_max_h + gap
                    row_max_h = 0
                if col == 0:
                    cur_x = startX
                batch_updates.append({"id": oid, "updates": {"x": cur_x, "y": cur_y}})
                row_max_h = max(row_max_h, dims["h"])
                cur_x += dims["w"] + gap

        return {"action": "batch_update", "batchUpdates": batch_updates}

    # ── Read Tool ───────────────────────────────────────────────────

    @tool("getBoardState")
    def get_board_state() -> dict:
        """Get all objects currently on the board. Use this to understand the current layout before making changes. Always call this before moving, resizing, or modifying existing objects."""
        result = (
            supabase_client.table("board_objects")
            .select("id, type, x, y, width, height, data, z_index")
            .eq("board_id", board_id)
            .order("z_index")
            .execute()
        )

        if not result.data:
            return {"action": "read", "objects": [], "count": 0}

        objects = []
        for obj in result.data:
            d = obj.get("data") or {}
            objects.append({
                "id": obj["id"],
                "type": obj["type"],
                "x": obj["x"],
                "y": obj["y"],
                "width": obj["width"],
                "height": obj["height"],
                "text": d.get("text"),
                "fill": d.get("fill"),
            })

        return {"action": "read", "objects": objects, "count": len(objects)}

    return [
        create_sticky_note,
        create_shape,
        create_frame,
        create_connector,
        create_freedraw,
        move_object,
        resize_object,
        update_text,
        change_color,
        delete_object,
        arrange_objects,
        get_board_state,
    ]
