"""Shape defaults and sticky note colors — ported from src/lib/shape-defaults.ts."""

from __future__ import annotations

SHAPE_DEFAULTS: dict[str, dict] = {
    "sticky_note": {"width": 150, "height": 150, "fill": "#EAB308"},
    "rectangle": {"width": 120, "height": 80, "fill": "#0066FF", "stroke": "#0044CC", "strokeWidth": 1},
    "rounded_rectangle": {"width": 120, "height": 80, "fill": "#7C3AED", "stroke": "#6D28D9", "strokeWidth": 1},
    "circle": {"width": 100, "height": 100, "fill": "#F97316", "stroke": "#EA580C", "strokeWidth": 1},
    "ellipse": {"width": 140, "height": 90, "fill": "#059669", "stroke": "#047857", "strokeWidth": 1},
    "triangle": {"width": 120, "height": 100, "fill": "#0D9488", "stroke": "#0F766E", "strokeWidth": 1},
    "diamond": {"width": 100, "height": 120, "fill": "#EAB308", "stroke": "#CA8A04", "strokeWidth": 1},
    "star": {"width": 120, "height": 120, "fill": "#EC4899", "stroke": "#DB2777", "strokeWidth": 1},
    "arrow": {"width": 150, "height": 4, "fill": "#1f2937", "stroke": "#1f2937", "strokeWidth": 2},
    "line": {"width": 150, "height": 0, "fill": "transparent", "stroke": "#1f2937", "strokeWidth": 2},
    "hexagon": {"width": 110, "height": 100, "fill": "#7C3AED", "stroke": "#6D28D9", "strokeWidth": 1},
    "pentagon": {"width": 110, "height": 100, "fill": "#EC4899", "stroke": "#DB2777", "strokeWidth": 1},
    "freedraw": {"width": 0, "height": 0, "fill": "transparent", "stroke": "#1f2937", "strokeWidth": 3},
    "connector": {"width": 0, "height": 0, "fill": "transparent", "stroke": "#1f2937", "strokeWidth": 2},
}

STICKY_COLORS = [
    "#EAB308",  # golden
    "#0066FF",  # electric blue
    "#DC2626",  # crimson
    "#059669",  # emerald
    "#F97316",  # hot orange
    "#7C3AED",  # royal purple
    "#EC4899",  # magenta
    "#0D9488",  # teal
]

STICKY_COLOR_NAMES = {
    "#EAB308": "golden",
    "#0066FF": "electric blue",
    "#DC2626": "crimson",
    "#059669": "emerald",
    "#F97316": "hot orange",
    "#7C3AED": "royal purple",
    "#EC4899": "magenta",
    "#0D9488": "teal",
}

SHAPE_TYPES = [
    "rectangle", "rounded_rectangle", "circle", "ellipse",
    "triangle", "diamond", "star", "hexagon", "pentagon",
    "arrow", "line",
]

CONNECTOR_STYLES = ["none", "arrow-end", "arrow-start", "arrow-both"]
