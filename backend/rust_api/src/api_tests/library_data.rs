use axum::body::to_bytes;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::util::ServiceExt;

use super::jobs_common::test_state;
use crate::app::build_app;
use crate::db::documents::sha256_hex;
use crate::models::domain::{now_iso, UploadRecord};
use crate::models::library::FtsBlockRow;

fn seed_document(state: &crate::AppState, content: &[u8]) -> String {
    let hash = sha256_hex(content);
    let upload = UploadRecord {
        upload_id: format!("up-{hash:.8}"),
        filename: "光谱综述.pdf".to_string(),
        stored_path: "uploads/x/paper.pdf".to_string(),
        bytes: content.len() as u64,
        page_count: 12,
        uploaded_at: now_iso(),
        developer_mode: false,
        content_hash: hash.clone(),
    };
    state.db.save_upload(&upload).expect("save upload");
    state
        .db
        .upsert_document_from_upload(&upload)
        .expect("upsert document");
    hash
}

async fn json_response(response: axum::response::Response) -> serde_json::Value {
    let bytes = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("read body");
    serde_json::from_slice(&bytes).expect("parse json")
}

#[tokio::test]
async fn documents_list_and_patch_roundtrip() {
    let state = test_state("library-documents");
    let app = build_app(state.clone());
    let document_id = seed_document(&state, b"doc one");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/documents")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("list response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = json_response(response).await;
    assert_eq!(payload["data"]["documents"][0]["document_id"], document_id);

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/api/v1/documents/{document_id}"))
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "reading_status": "reading",
                        "tags": ["化学", "光谱"]
                    })
                    .to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("patch response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = json_response(response).await;
    assert_eq!(payload["data"]["reading_status"], "reading");

    // 非法状态被拒绝
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/api/v1/documents/{document_id}"))
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({"reading_status": "nonsense"}).to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("bad patch response");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn favorites_crud_and_job_reference_guard() {
    let state = test_state("library-favorites");
    let app = build_app(state.clone());
    let document_id = seed_document(&state, b"doc favorites");
    state
        .db
        .set_document_active_job(&document_id, "job-active", None)
        .expect("set active job");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/favorites")
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "document_id": document_id,
                        "page_idx": 4,
                        "block_id": "p005-b0008",
                        "quote_text": "reaction rate increases",
                        "translated_quote_text": "反应速率随温度上升"
                    })
                    .to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("create response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = json_response(response).await;
    // 未显式给 job_id 时锚定到 active_job_id
    assert_eq!(payload["data"]["job_id"], "job-active");
    let favorite_id = payload["data"]["favorite_id"]
        .as_str()
        .expect("favorite id")
        .to_string();

    assert_eq!(
        state
            .db
            .favorites_referencing_job("job-active")
            .expect("count"),
        1
    );

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/favorites/{favorite_id}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("delete response");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(state.db.list_favorites(None).expect("list").len(), 0);
}

#[tokio::test]
async fn search_returns_anchored_hits() {
    let state = test_state("library-search");
    let app = build_app(state.clone());
    let document_id = seed_document(&state, b"doc search");
    state
        .db
        .replace_document_fts(
            &document_id,
            "job-1",
            &[FtsBlockRow {
                page_idx: 7,
                block_id: "p008-b0002".to_string(),
                source_text: "halogen lithium exchange selectivity".to_string(),
                translated_text: "卤素锂交换的选择性研究".to_string(),
            }],
        )
        .expect("seed fts");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/search?q=%E5%8D%A4%E7%B4%A0%E9%94%82%E4%BA%A4%E6%8D%A2")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("search response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = json_response(response).await;
    let hit = &payload["data"]["hits"][0];
    assert_eq!(hit["document_id"], document_id);
    assert_eq!(hit["job_id"], "job-1");
    assert_eq!(hit["page_idx"], 7);
    assert_eq!(hit["block_id"], "p008-b0002");
}

#[tokio::test]
async fn ai_proxy_returns_bad_gateway_when_upstream_is_down() {
    // 指向必死端口:代理应干净地报 502,而不是挂起或 500
    std::env::set_var("RUST_API_AI_SERVICE_BASE", "http://127.0.0.1:9");
    let state = test_state("ai-proxy-down");
    let app = build_app(state);
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/ai/ask")
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"question":"q"}"#))
                .expect("request"),
        )
        .await
        .expect("proxy response");
    std::env::remove_var("RUST_API_AI_SERVICE_BASE");
    assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
}

#[tokio::test]
async fn document_lookup_by_historical_job_id() {
    let state = test_state("library-job-lookup");
    let app = build_app(state.clone());
    let document_id = seed_document(&state, b"doc job lookup");
    // 历史 job:归属该文档但不是 active run
    state
        .db
        .set_document_active_job(&document_id, "job-new", None)
        .expect("set active");
    {
        let conn = rusqlite::Connection::open(state.config.jobs_db_path.clone()).expect("open db");
        conn.execute(
            "INSERT INTO jobs (job_id, workflow, status_json, created_at, updated_at, command_json, request_json, log_tail_json, document_id)
             VALUES ('job-old', '\"book\"', '\"succeeded\"', '2026-01-01', '2026-01-01', '[]', '{}', '[]', ?1)",
            rusqlite::params![document_id],
        )
        .expect("insert historical job");
    }

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/documents?job_id=job-old")
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("lookup response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = json_response(response).await;
    assert_eq!(payload["data"]["documents"][0]["document_id"], document_id);

    // 只带 job_id 创建收藏:锚定到历史 run 的块空间,文档由后端解析
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/favorites")
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "job_id": "job-old",
                        "page_idx": 2,
                        "block_id": "p003-b0001",
                        "quote_text": "historical quote"
                    })
                    .to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("create response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = json_response(response).await;
    assert_eq!(payload["data"]["document_id"], document_id);
    assert_eq!(payload["data"]["job_id"], "job-old");
}

#[tokio::test]
async fn favorite_note_patch_updates_in_place() {
    let state = test_state("library-fav-patch");
    let app = build_app(state.clone());
    let document_id = seed_document(&state, b"doc patch note");
    state
        .db
        .set_document_active_job(&document_id, "job-x", None)
        .expect("set active");
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/favorites")
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "document_id": document_id,
                        "page_idx": 1,
                        "block_id": "p002-b0001",
                        "quote_text": "q"
                    })
                    .to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("create");
    let favorite_id = json_response(response).await["data"]["favorite_id"]
        .as_str()
        .expect("id")
        .to_string();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/api/v1/favorites/{favorite_id}"))
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::json!({"note": "改后的笔记"}).to_string()))
                .expect("request"),
        )
        .await
        .expect("patch");
    assert_eq!(response.status(), StatusCode::OK);
    let favorites = state.db.list_favorites(Some(&document_id)).expect("list");
    // favorite_id 不变,note 原子更新
    assert_eq!(favorites[0].favorite_id, favorite_id);
    assert_eq!(favorites[0].note, "改后的笔记");
}

#[tokio::test]
async fn asset_upload_dedupes_and_serves_immutable() {
    let state = test_state("library-assets");
    let app = build_app(state.clone());
    let png: &[u8] = b"\x89PNG\r\n\x1a\nfake-png-bytes-for-test";
    let boundary = "XBOUNDARY";
    let mut body_bytes: Vec<u8> = Vec::new();
    body_bytes.extend_from_slice(
        format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"clip.png\"\r\nContent-Type: image/png\r\n\r\n"
        )
        .as_bytes(),
    );
    body_bytes.extend_from_slice(png);
    body_bytes.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());
    let body = body_bytes;
    let upload = |app: axum::Router| {
        let body = body.clone();
        async move {
            app.oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/v1/assets")
                    .header("X-API-Key", "test-key")
                    .header(
                        "content-type",
                        format!("multipart/form-data; boundary={boundary}"),
                    )
                    .body(Body::from(body))
                    .expect("request"),
            )
            .await
            .expect("upload response")
        }
    };

    let first = json_response(upload(app.clone()).await).await;
    let second = json_response(upload(app.clone()).await).await;
    // 内容寻址:同字节两次上传同一 asset_id
    assert_eq!(first["data"]["asset_id"], second["data"]["asset_id"]);
    let asset_id = first["data"]["asset_id"].as_str().expect("asset id");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/assets/{asset_id}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("download response");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("content-type").unwrap(),
        "image/png"
    );
    assert!(response
        .headers()
        .get("cache-control")
        .unwrap()
        .to_str()
        .unwrap()
        .contains("immutable"));

    // 收藏挂图:kind=figure + asset_id + rect_json
    let document_id = seed_document(&state, b"doc with figure");
    state
        .db
        .set_document_active_job(&document_id, "job-f", None)
        .expect("set active");
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/favorites")
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "document_id": document_id,
                        "page_idx": 3,
                        "block_id": "p004-b0001",
                        "kind": "figure",
                        "quote_text": "figure clip",
                        "asset_id": asset_id,
                        "rect_json": "{\"x\":10,\"y\":20,\"w\":300,\"h\":200}"
                    })
                    .to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("favorite response");
    assert_eq!(response.status(), StatusCode::OK);
    let payload = json_response(response).await;
    assert_eq!(payload["data"]["asset_id"], asset_id);
    assert!(payload["data"]["rect_json"].as_str().unwrap().contains("300"));

    // 未上传的 asset_id 被拒绝
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/favorites")
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "document_id": document_id,
                        "page_idx": 1,
                        "block_id": "p002-b0001",
                        "quote_text": "q",
                        "asset_id": "deadbeef00"
                    })
                    .to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("bad favorite response");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn conversation_lifecycle_and_message_appending() {
    let state = test_state("library-conversations");
    let app = build_app(state.clone());
    let document_id = seed_document(&state, b"doc conv");

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/ai/conversations")
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({"document_id": document_id}).to_string(),
                ))
                .expect("request"),
        )
        .await
        .expect("create conversation");
    assert_eq!(response.status(), StatusCode::OK);
    let conversation_id = json_response(response).await["data"]["conversation_id"]
        .as_str()
        .expect("id")
        .to_string();

    for (role, content) in [("user", "溴锂交换的选择性由什么决定?"), ("assistant", "由共轭效应决定 [1]。")] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri(format!("/api/v1/ai/conversations/{conversation_id}/messages"))
                    .header("X-API-Key", "test-key")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        serde_json::json!({
                            "role": role, "content": content,
                            "citations_json": if role == "assistant" { "[{\"ref\":1}]" } else { "" }
                        })
                        .to_string(),
                    ))
                    .expect("request"),
            )
            .await
            .expect("append message");
        assert_eq!(response.status(), StatusCode::OK);
    }

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/ai/conversations/{conversation_id}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("detail");
    let payload = json_response(response).await;
    // 标题自动取首问前缀;消息按 seq 正序;引用快照原样保存
    assert!(payload["data"]["title"].as_str().unwrap().contains("溴锂交换"));
    assert_eq!(payload["data"]["message_count"], 2);
    assert_eq!(payload["data"]["messages"][0]["role"], "user");
    assert_eq!(payload["data"]["messages"][1]["seq"], 2);
    assert!(payload["data"]["messages"][1]["citations_json"]
        .as_str()
        .unwrap()
        .contains("ref"));

    // 非法 role 被拒
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/v1/ai/conversations/{conversation_id}/messages"))
                .header("X-API-Key", "test-key")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::json!({"role": "tool", "content": "x"}).to_string()))
                .expect("request"),
        )
        .await
        .expect("bad role");
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    // 删除级联清消息
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/v1/ai/conversations/{conversation_id}"))
                .header("X-API-Key", "test-key")
                .body(Body::empty())
                .expect("request"),
        )
        .await
        .expect("delete");
    assert_eq!(response.status(), StatusCode::OK);
    assert!(state
        .db
        .list_messages(&conversation_id, 10)
        .expect("messages")
        .is_empty());
}
