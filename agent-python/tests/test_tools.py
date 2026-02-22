"""Unit tests for AI agent tools."""

from __future__ import annotations

from unittest.mock import MagicMock

from app.tools import make_tools


def _make_mock_supabase(board_objects=None):
    """Create a mock Supabase client that returns board_objects on select."""
    mock = MagicMock()
    result = MagicMock()
    result.data = board_objects or []
    mock.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = result
    mock.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = result
    return mock


def _get_tool(tools, name):
    for t in tools:
        if t.name == name:
            return t
    raise KeyError(f"Tool {name!r} not found")


class TestCreateStickyNote:
    def test_returns_create_action(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createStickyNote")
        result = tool.invoke({"text": "Hello"})
        assert result["action"] == "create"
        assert result["object"]["type"] == "sticky_note"
        assert result["object"]["text"] == "Hello"

    def test_default_position_and_color(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createStickyNote")
        result = tool.invoke({"text": "Test"})
        obj = result["object"]
        assert obj["x"] == 100
        assert obj["y"] == 100
        assert obj["fill"] == "#EAB308"  # default golden
        assert obj["width"] == 150
        assert obj["height"] == 150

    def test_custom_color_and_position(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createStickyNote")
        result = tool.invoke({"text": "Blue", "color": "#bfdbfe", "x": 200, "y": 300})
        obj = result["object"]
        assert obj["fill"] == "#bfdbfe"
        assert obj["x"] == 200
        assert obj["y"] == 300


class TestCreateShape:
    def test_rectangle(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createShape")
        result = tool.invoke({"type": "rectangle"})
        assert result["action"] == "create"
        assert result["object"]["type"] == "rectangle"
        assert result["object"]["width"] == 120
        assert result["object"]["height"] == 80

    def test_circle(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createShape")
        result = tool.invoke({"type": "circle", "fill": "#ff0000"})
        assert result["object"]["type"] == "circle"
        assert result["object"]["fill"] == "#ff0000"


class TestCreateFrame:
    def test_returns_object_and_title_label(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createFrame")
        result = tool.invoke({"title": "Strengths"})
        assert result["action"] == "create"
        assert "object" in result
        assert "titleLabel" in result
        assert result["object"]["type"] == "rectangle"
        assert result["titleLabel"]["type"] == "sticky_note"
        assert result["titleLabel"]["text"] == "Strengths"

    def test_frame_default_dimensions(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createFrame")
        result = tool.invoke({"title": "Test"})
        assert result["object"]["width"] == 350
        assert result["object"]["height"] == 300
        assert result["object"]["z_index"] == -1


class TestCreateConnector:
    def test_connector_structure(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createConnector")
        result = tool.invoke({"fromId": "a", "toId": "b"})
        obj = result["object"]
        assert obj["type"] == "connector"
        assert obj["fromId"] == "a"
        assert obj["toId"] == "b"
        assert obj["connectorStyle"] == "arrow-end"


class TestCreateFreedraw:
    def test_normalizes_points(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createFreedraw")
        result = tool.invoke({"points": [100, 200, 150, 250]})
        obj = result["object"]
        assert obj["type"] == "freedraw"
        assert obj["x"] == 100
        assert obj["y"] == 200
        assert obj["width"] == 50
        assert obj["height"] == 50
        assert obj["points"] == [0, 0, 50, 50]

    def test_too_few_points(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "createFreedraw")
        result = tool.invoke({"points": [1, 2]})
        assert "error" in result


class TestMoveObject:
    def test_returns_update_action(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "moveObject")
        result = tool.invoke({"objectId": "abc", "x": 500, "y": 600})
        assert result == {"action": "update", "id": "abc", "updates": {"x": 500, "y": 600}}


class TestResizeObject:
    def test_returns_update_action(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "resizeObject")
        result = tool.invoke({"objectId": "abc", "width": 200, "height": 300})
        assert result["action"] == "update"
        assert result["updates"]["width"] == 200


class TestUpdateText:
    def test_returns_update_action(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "updateText")
        result = tool.invoke({"objectId": "abc", "newText": "New text"})
        assert result["updates"]["text"] == "New text"


class TestChangeColor:
    def test_returns_update_action(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "changeColor")
        result = tool.invoke({"objectId": "abc", "color": "#ff0000"})
        assert result["updates"]["fill"] == "#ff0000"


class TestDeleteObject:
    def test_returns_delete_action(self):
        tools = make_tools("board-1", _make_mock_supabase())
        tool = _get_tool(tools, "deleteObject")
        result = tool.invoke({"objectId": "abc"})
        assert result == {"action": "delete", "id": "abc"}


class TestGetBoardState:
    def test_returns_objects(self):
        mock_data = [
            {"id": "1", "type": "sticky_note", "x": 100, "y": 100, "width": 150, "height": 150, "data": {"text": "Hello", "fill": "#EAB308"}, "z_index": 0},
        ]
        tools = make_tools("board-1", _make_mock_supabase(mock_data))
        tool = _get_tool(tools, "getBoardState")
        result = tool.invoke({})
        assert result["action"] == "read"
        assert result["count"] == 1
        assert result["objects"][0]["text"] == "Hello"

    def test_empty_board(self):
        tools = make_tools("board-1", _make_mock_supabase([]))
        tool = _get_tool(tools, "getBoardState")
        result = tool.invoke({})
        assert result["count"] == 0
        assert result["objects"] == []


class TestArrangeObjects:
    def test_horizontal_layout(self):
        mock_data = [
            {"id": "a", "width": 100, "height": 100},
            {"id": "b", "width": 100, "height": 100},
        ]
        tools = make_tools("board-1", _make_mock_supabase(mock_data))
        tool = _get_tool(tools, "arrangeObjects")
        result = tool.invoke({
            "objectIds": ["a", "b"],
            "layout": "horizontal",
            "startX": 50,
            "startY": 50,
            "gap": 10,
        })
        assert result["action"] == "batch_update"
        assert len(result["batchUpdates"]) == 2
        assert result["batchUpdates"][0]["updates"]["x"] == 50
        assert result["batchUpdates"][1]["updates"]["x"] == 160  # 50 + 100 + 10
