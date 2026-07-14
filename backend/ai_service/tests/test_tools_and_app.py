import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from retainpdf_ai.agent import AskResult, Citation, RetrievalAgent
from retainpdf_ai.app import build_app
from retainpdf_ai.blocks import read_page_blocks
from retainpdf_ai.config import Settings
from retainpdf_ai.tools import build_default_registry


class FakeRust:
    def __init__(self):
        self.documents = [
            {
                "document_id": "doc-a",
                "title": "光谱计算方法",
                "page_count": 12,
                "tags": ["化学"],
                "reading_status": "reading",
                "active_job_id": "job-1",
            }
        ]

    def search_fulltext(self, query, limit=20):
        return [
            {
                "document_id": "doc-a",
                "job_id": "job-1",
                "page_idx": 2,
                "block_id": "p003-b0001",
                "source_snippet": "spectra",
                "translated_snippet": f"关于{query}的片段",
            }
        ]

    def list_documents(self, *, tag="", reading_status="", limit=50):
        return self.documents

    def get_document(self, document_id):
        return self.documents[0]

    def list_favorites(self, document_id=""):
        return [
            {
                "favorite_id": "fav-1",
                "document_id": "doc-a",
                "job_id": "job-1",
                "page_idx": 4,
                "block_id": "p005-b0008",
                "kind": "sentence",
                "quote_text": "reaction rate",
                "translated_quote_text": "反应速率相关引文",
                "note": "重要",
            }
        ]


def _write_job_dir(root: Path):
    job_root = root / "jobs" / "job-1"
    normalized = job_root / "ocr" / "normalized"
    normalized.mkdir(parents=True)
    (normalized / "document.v1.json").write_text(
        json.dumps(
            {
                "pages": [
                    {
                        "page_index": 2,
                        "blocks": [
                            {"block_id": "p003-b0000", "text": "first block"},
                            {"block_id": "p003-b0001", "text": "second block"},
                        ],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    translated = job_root / "translated"
    translated.mkdir(parents=True)
    (translated / "page-003-deepseek.json").write_text(
        json.dumps(
            [
                {"page_idx": "2", "block_idx": "1", "translated_text": "第二个块的译文"},
            ]
        ),
        encoding="utf-8",
    )
    return job_root


def test_read_page_blocks_aligns_translation_by_numeric_index(tmp_path):
    job_root = _write_job_dir(tmp_path)
    blocks = read_page_blocks(job_root, 2)
    assert [block.block_id for block in blocks] == ["p003-b0000", "p003-b0001"]
    assert blocks[1].translated_text == "第二个块的译文"
    windowed = read_page_blocks(job_root, 2, around_block_id="p003-b0001", max_blocks=1)
    assert [block.block_id for block in windowed] == ["p003-b0001"]


def test_default_registry_tools_return_anchored_results(tmp_path):
    _write_job_dir(tmp_path)
    settings = Settings(data_root=tmp_path)
    registry = build_default_registry(settings, FakeRust())

    hits = registry.invoke("search_fulltext", {"query": "光谱"})["hits"]
    assert hits[0]["block_id"] == "p003-b0001"

    documents = registry.invoke("list_documents", {})["documents"]
    assert documents[0]["document_id"] == "doc-a"

    blocks = registry.invoke("read_blocks", {"document_id": "doc-a", "page_idx": 2})
    assert blocks["job_id"] == "job-1"
    assert blocks["blocks"][1]["translated_text"] == "第二个块的译文"

    favorites = registry.invoke("search_favorites", {"keyword": "速率"})["favorites"]
    assert favorites[0]["favorite_id"] == "fav-1"
    assert registry.invoke("search_favorites", {"keyword": "不存在"})["favorites"] == []

    assert "query must not be empty" in registry.invoke("search_fulltext", {})["error"]


class FakeAgent(RetrievalAgent):
    def __init__(self):
        pass

    def ask(self, question, *, document_id="", on_event=None, chat_fn=None, history=None):
        if on_event is not None:
            on_event({"type": "tool", "round": 1, "tool": "search_fulltext", "arguments": {"query": "q"}})
        return AskResult(
            answer=f"回答:{question} [1]",
            citations=[
                Citation(
                    ref=1,
                    document_id="doc-a",
                    job_id="job-1",
                    page_idx=2,
                    block_id="p003-b0001",
                    snippet="片段",
                )
            ],
            tool_trace=[{"round": 1, "tool": "search_fulltext", "arguments": {"query": "q"}}],
            rounds=2,
        )


def test_ask_endpoint_requires_api_key_and_returns_citations():
    settings = Settings(api_keys=frozenset({"test-key"}), llm_api_key="env-llm-key")
    app = build_app(settings, agent=FakeAgent())
    client = TestClient(app)

    assert client.get("/healthz").json()["ok"] is True

    denied = client.post("/v1/ask", json={"question": "q"})
    assert denied.status_code == 401

    response = client.post(
        "/v1/ask",
        json={"question": "库里讲什么?"},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["answer"].startswith("回答:")
    assert data["citations"][0]["block_id"] == "p003-b0001"
    assert data["rounds"] == 2


def test_ask_endpoint_streams_sse_events():
    settings = Settings(api_keys=frozenset({"test-key"}), llm_api_key="env-llm-key")
    app = build_app(settings, agent=FakeAgent())
    client = TestClient(app)

    with client.stream(
        "POST",
        "/v1/ask",
        json={"question": "流式?", "stream": True},
        headers={"X-API-Key": "test-key"},
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        events = []
        for line in response.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))
    assert events[0]["type"] == "tool"
    assert events[0]["tool"] == "search_fulltext"
    assert events[-1]["type"] == "done"
    assert events[-1]["answer"].startswith("回答:")
    assert events[-1]["citations"][0]["block_id"] == "p003-b0001"


def test_ask_endpoint_requires_llm_key_from_env_or_request():
    # env 与请求都无 LLM key:提前 400,不打到上游
    settings = Settings(api_keys=frozenset({"test-key"}))
    client = TestClient(build_app(settings, agent=FakeAgent()))
    missing = client.post(
        "/v1/ask",
        json={"question": "q"},
        headers={"X-API-Key": "test-key"},
    )
    assert missing.status_code == 400
    assert "LLM API Key" in missing.json()["detail"]

    # 请求携带 LLM key:即使 env 为空也放行(FakeAgent 忽略 chat_fn)
    ok = client.post(
        "/v1/ask",
        json={"question": "q", "llm_api_key": "sk-from-frontend"},
        headers={"X-API-Key": "test-key"},
    )
    assert ok.status_code == 200
    assert ok.json()["data"]["answer"].startswith("回答:")


def test_ask_resolves_document_id_from_job_id():
    # 历史 job 也能定位文档:job_id → 服务端解析 document_id,
    # 不再依赖前端的 active_job_id 反查
    captured = {}

    class RecordingAgent(FakeAgent):
        def ask(self, question, *, document_id="", on_event=None, chat_fn=None, history=None):
            captured["document_id"] = document_id
            return super().ask(question, document_id=document_id, on_event=on_event, chat_fn=chat_fn)

    class JobAwareRust(FakeRust):
        def get_document_by_job(self, job_id):
            assert job_id == "job-old"
            return {"document_id": "doc-a"}

    settings = Settings(api_keys=frozenset({"test-key"}))
    app = build_app(settings, agent=RecordingAgent(), rust=JobAwareRust())
    client = TestClient(app)
    response = client.post(
        "/v1/ask",
        json={"question": "历史任务的问题", "job_id": "job-old", "llm_api_key": "sk-test"},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    assert captured["document_id"] == "doc-a"


def test_ask_keeps_explicit_document_id_over_job_id():
    captured = {}

    class RecordingAgent(FakeAgent):
        def ask(self, question, *, document_id="", on_event=None, chat_fn=None, history=None):
            captured["document_id"] = document_id
            return super().ask(question, document_id=document_id, on_event=on_event, chat_fn=chat_fn)

    settings = Settings(api_keys=frozenset({"test-key"}))
    app = build_app(settings, agent=RecordingAgent(), rust=FakeRust())
    client = TestClient(app)
    client.post(
        "/v1/ask",
        json={"question": "q", "document_id": "doc-explicit", "job_id": "job-x", "llm_api_key": "sk-test"},
        headers={"X-API-Key": "test-key"},
    )
    assert captured["document_id"] == "doc-explicit"


def test_ask_injects_conversation_history_and_persists_turn():
    calls = {"history": None, "appended": []}

    class HistoryAgent(FakeAgent):
        def ask(self, question, *, document_id="", on_event=None, chat_fn=None, history=None):
            calls["history"] = history
            return super().ask(question, document_id=document_id, on_event=on_event, chat_fn=chat_fn)

    class ConvRust(FakeRust):
        def get_conversation(self, conversation_id):
            assert conversation_id == "conv-1"
            return {
                "conversation_id": "conv-1",
                "messages": [
                    {"role": "user", "content": "之前的问题", "seq": 1},
                    {"role": "assistant", "content": "之前的回答 [1]", "seq": 2},
                ],
            }

        def append_conversation_message(self, conversation_id, *, role, content, **kwargs):
            calls["appended"].append((conversation_id, role, content[:20], kwargs.get("citations_json", "")))
            return {"message_id": f"msg-{role}"}

    settings = Settings(api_keys=frozenset({"test-key"}))
    app = build_app(settings, agent=HistoryAgent(), rust=ConvRust())
    client = TestClient(app)
    response = client.post(
        "/v1/ask",
        json={"question": "接着上个问题继续", "conversation_id": "conv-1", "llm_api_key": "sk-test"},
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    # 历史注入
    assert calls["history"] == [
        {"role": "user", "content": "之前的问题"},
        {"role": "assistant", "content": "之前的回答 [1]"},
    ]
    # 回写 user + assistant 两条,assistant 带引用快照
    assert [(c[1], c[0]) for c in calls["appended"]] == [("user", "conv-1"), ("assistant", "conv-1")]
    assert "block_id" in calls["appended"][1][3]


def test_agent_places_history_between_system_and_current_question():
    from retainpdf_ai.agent import RetrievalAgent
    from retainpdf_ai.tools import ToolRegistry

    seen = {}

    def chat(messages, tools):
        seen["messages"] = messages
        return {"content": "好的。", "tool_calls": []}

    agent = RetrievalAgent(ToolRegistry([]), chat, max_tool_rounds=2)
    agent.ask(
        "当前问题",
        history=[
            {"role": "user", "content": "上一问"},
            {"role": "assistant", "content": "上一答"},
            {"role": "tool", "content": "should be dropped"},
        ],
    )
    roles = [m["role"] for m in seen["messages"]]
    assert roles == ["system", "user", "assistant", "user"]
    assert seen["messages"][1]["content"] == "上一问"
    assert seen["messages"][-1]["content"] == "当前问题"
