"""Shape defaults and sticky note colors — ported from src/lib/shape-defaults.ts."""

from __future__ import annotations

SHAPE_DEFAULTS: dict[str, dict] = {
    "sticky_note": {"width": 150, "height": 150, "fill": "#fef08a"},
    "rectangle": {"width": 120, "height": 80, "fill": "#e2e8f0", "stroke": "#94a3b8", "strokeWidth": 1},
    "rounded_rectangle": {"width": 120, "height": 80, "fill": "#e2e8f0", "stroke": "#94a3b8", "strokeWidth": 1},
    "circle": {"width": 100, "height": 100, "fill": "#bfdbfe", "stroke": "#3b82f6", "strokeWidth": 1},
    "ellipse": {"width": 140, "height": 90, "fill": "#bfdbfe", "stroke": "#3b82f6", "strokeWidth": 1},
    "triangle": {"width": 120, "height": 100, "fill": "#bbf7d0", "stroke": "#22c55e", "strokeWidth": 1},
    "diamond": {"width": 100, "height": 120, "fill": "#fde68a", "stroke": "#eab308", "strokeWidth": 1},
    "star": {"width": 120, "height": 120, "fill": "#fde68a", "stroke": "#f97316", "strokeWidth": 1},
    "arrow": {"width": 150, "height": 4, "fill": "#1f2937", "stroke": "#1f2937", "strokeWidth": 2},
    "line": {"width": 150, "height": 0, "fill": "transparent", "stroke": "#1f2937", "strokeWidth": 2},
    "hexagon": {"width": 110, "height": 100, "fill": "#c4b5fd", "stroke": "#8b5cf6", "strokeWidth": 1},
    "pentagon": {"width": 110, "height": 100, "fill": "#fbcfe8", "stroke": "#ec4899", "strokeWidth": 1},
    "freedraw": {"width": 0, "height": 0, "fill": "transparent", "stroke": "#1f2937", "strokeWidth": 3},
    "connector": {"width": 0, "height": 0, "fill": "transparent", "stroke": "#1f2937", "strokeWidth": 2},
}

STICKY_COLORS = [
    "#fef08a",  # yellow
    "#bbf7d0",  # green
    "#bfdbfe",  # blue
    "#fbcfe8",  # pink
    "#fde68a",  # amber
    "#c4b5fd",  # purple
    "#fed7aa",  # orange
    "#fecaca",  # red
]

STICKY_COLOR_NAMES = {
    "#fef08a": "yellow",
    "#bbf7d0": "green",
    "#bfdbfe": "blue",
    "#fbcfe8": "pink",
    "#fde68a": "amber",
    "#c4b5fd": "purple",
    "#fed7aa": "orange",
    "#fecaca": "red",
}

SHAPE_TYPES = [
    "rectangle", "rounded_rectangle", "circle", "ellipse",
    "triangle", "diamond", "star", "hexagon", "pentagon",
    "arrow", "line",
]

CONNECTOR_STYLES = ["none", "arrow-end", "arrow-start", "arrow-both"]
