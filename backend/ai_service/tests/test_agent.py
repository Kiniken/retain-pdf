import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from retainpdf_ai.agent import RetrievalAgent
from retainpdf_ai.tools import Tool, ToolRegistry


def _search_tool(hits):
    return Tool(
        name="search_fulltext",
        description="搜索",
        parameters={"type": "object", "properties": {"query": {"type": "string"}}},
        handler=lambda arguments: {"hits": [dict(hit) for hit in hits]},
    )


HITS = [
    {
        "document_id": "doc-a",
        "job_id": "job-1",
        "page_idx": 3,
        "block_id": "p004-b0002",
        "translated_snippet": "反应速率显著提高",
    },
    {
        "document_id": "doc-a",
        "job_id": "job-1",
        "page_idx": 7,
        "block_id": "p008-b0001",
        "translated_snippet": "选择性来自共轭效应",
    },
]


def _tool_call(name, arguments, call_id="call-1"):
    return {
        "id": call_id,
        "type": "function",
        "function": {"name": name, "arguments": json.dumps(arguments, ensure_ascii=False)},
    }


def test_agent_runs_tools_then_answers_with_cited_anchors():
    registry = ToolRegistry([_search_tool(HITS)])
    script = iter(
        [
            {"content": "", "tool_calls": [_tool_call("search_fulltext", {"query": "选择性"})]},
            {"content": "选择性来自共轭效应 [2]。", "tool_calls": []},
        ]
    )
    seen_tool_messages = []

    def fake_chat(messages, tools):
        seen_tool_messages.extend(m for m in messages if m["role"] == "tool")
        return next(script)

    agent = RetrievalAgent(registry, fake_chat, max_tool_rounds=4)
    result = agent.ask("为什么有选择性?")

    assert result.rounds == 2
    assert result.answer == "选择性来自共轭效应 [2]。"
    # 只返回被引用的锚点,且编号写进了给模型看的工具结果
    assert [citation.ref for citation in result.citations] == [2]
    assert result.citations[0].block_id == "p008-b0001"
    payload = json.loads(seen_tool_messages[0]["content"])
    assert payload["hits"][0]["ref"] == 1
    assert result.tool_trace == [
        {"round": 1, "tool": "search_fulltext", "arguments": {"query": "选择性"}}
    ]


def test_agent_falls_back_to_all_citations_when_answer_has_no_markers():
    registry = ToolRegistry([_search_tool(HITS)])
    script = iter(
        [
            {"content": "", "tool_calls": [_tool_call("search_fulltext", {"query": "速率"})]},
            {"content": "速率提高且有选择性。", "tool_calls": []},
        ]
    )
    agent = RetrievalAgent(registry, lambda m, t: next(script), max_tool_rounds=4)
    result = agent.ask("结论?")
    assert [citation.ref for citation in result.citations] == [1, 2]


def test_agent_forces_final_answer_when_rounds_exhausted():
    registry = ToolRegistry([_search_tool(HITS)])
    calls = {"n": 0}

    def looping_chat(messages, tools):
        calls["n"] += 1
        if tools:
            return {
                "content": "",
                "tool_calls": [_tool_call("search_fulltext", {"query": f"q{calls['n']}"})],
            }
        # 收尾调用不给工具
        assert messages[-1]["role"] == "user"
        return {"content": "基于已有证据的最终回答 [1]。", "tool_calls": []}

    agent = RetrievalAgent(registry, looping_chat, max_tool_rounds=3)
    result = agent.ask("一直想搜的问题")
    assert result.rounds == 3
    assert "最终回答" in result.answer
    assert len(result.tool_trace) == 3


def test_unknown_tool_and_handler_error_feed_back_to_model():
    def boom(_arguments):
        raise RuntimeError("backend down")

    registry = ToolRegistry(
        [
            Tool(
                name="broken",
                description="always fails",
                parameters={"type": "object", "properties": {}},
                handler=boom,
            )
        ]
    )
    script = iter(
        [
            {
                "content": "",
                "tool_calls": [
                    _tool_call("broken", {}, "c1"),
                    _tool_call("missing", {}, "c2"),
                ],
            },
            {"content": "工具都失败了,无法回答。", "tool_calls": []},
        ]
    )
    captured = []

    def fake_chat(messages, tools):
        captured.extend(m for m in messages if m["role"] == "tool")
        return next(script)

    agent = RetrievalAgent(registry, fake_chat, max_tool_rounds=3)
    result = agent.ask("q")
    assert result.answer.startswith("工具都失败了")
    errors = [json.loads(m["content"]) for m in captured]
    assert any("backend down" in str(e.get("error")) for e in errors)
    assert any("unknown tool" in str(e.get("error")) for e in errors)
