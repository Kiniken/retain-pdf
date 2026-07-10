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

    def ask(self, question, *, document_id="", on_event=None):
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
    settings = Settings(api_keys=frozenset({"test-key"}))
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
    settings = Settings(api_keys=frozenset({"test-key"}))
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
