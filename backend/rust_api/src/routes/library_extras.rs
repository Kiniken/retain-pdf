//! 资产存储(收藏截图等二进制附件)与 AI 问答会话历史。
//!
//! 资产是内容寻址的:asset_id = sha256(文件字节),文件落
//! data_root/assets/<前2位>/<hash>,重复上传自动归并,URL 永久可缓存。
//! 会话遵循"软锚点"原则:引用只存 JSON 快照,不做 job 删除保护。

use axum::extract::{Multipart, Path as AxumPath, Query, State};
use axum::http::header;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::db::documents::sha256_hex;
use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::models::domain::{build_job_id, now_iso};
use crate::models::library::{AssetRecord, ConversationRecord, MessageRecord};
use crate::routes::common::ok_json;
use crate::AppState;

const ALLOWED_ASSET_MIMES: &[&str] = &["image/png", "image/jpeg", "image/webp"];
const MAX_ASSET_BYTES: usize = 20 * 1024 * 1024;

fn asset_extension(mime: &str) -> &'static str {
    match mime {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        _ => "bin",
    }
}

fn asset_path(state: &AppState, asset_id: &str, mime: &str) -> std::path::PathBuf {
    state
        .config
        .data_root
        .join("assets")
        .join(&asset_id[..2])
        .join(format!("{asset_id}.{}", asset_extension(mime)))
}

pub async fn upload_asset_route(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<AssetRecord>>, AppError> {
    let mut bytes: Option<(String, Vec<u8>)> = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|error| AppError::bad_request(format!("invalid multipart: {error}")))?
    {
        if field.name() != Some("file") {
            continue;
        }
        let mime = field
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();
        let data = field
            .bytes()
            .await
            .map_err(|error| AppError::bad_request(format!("read upload failed: {error}")))?;
        bytes = Some((mime, data.to_vec()));
        break;
    }
    let Some((mime, data)) = bytes else {
        return Err(AppError::bad_request("multipart field 'file' is required"));
    };
    if !ALLOWED_ASSET_MIMES.contains(&mime.as_str()) {
        return Err(AppError::bad_request(format!(
            "unsupported asset mime: {mime} (allowed: png/jpeg/webp)"
        )));
    }
    if data.is_empty() || data.len() > MAX_ASSET_BYTES {
        return Err(AppError::bad_request("asset size must be 1B..20MB"));
    }
    let asset_id = sha256_hex(&data);
    let path = asset_path(&state, &asset_id, &mime);
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    if !path.exists() {
        tokio::fs::write(&path, &data).await?;
    }
    let record = AssetRecord {
        asset_id,
        mime,
        bytes: data.len() as u64,
        width: None,
        height: None,
        created_at: now_iso(),
    };
    state.db.save_asset(&record)?;
    Ok(ok_json(record))
}

pub async fn download_asset_route(
    State(state): State<AppState>,
    AxumPath(asset_id): AxumPath<String>,
) -> Result<Response, AppError> {
    if asset_id.len() < 8 || !asset_id.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(AppError::bad_request("invalid asset id"));
    }
    let record = state
        .db
        .get_asset(&asset_id)?
        .ok_or_else(|| AppError::not_found(format!("asset not found: {asset_id}")))?;
    let path = asset_path(&state, &record.asset_id, &record.mime);
    let data = tokio::fs::read(&path)
        .await
        .map_err(|_| AppError::not_found(format!("asset file missing: {asset_id}")))?;
    Ok((
        [
            (header::CONTENT_TYPE, record.mime.clone()),
            // 内容寻址 → 永久缓存安全
            (header::CACHE_CONTROL, "public, max-age=31536000, immutable".to_string()),
        ],
        data,
    )
        .into_response())
}

#[derive(Debug, Deserialize)]
pub struct CreateConversationInput {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub document_id: String,
}

pub async fn create_conversation_route(
    State(state): State<AppState>,
    Json(payload): Json<CreateConversationInput>,
) -> Result<Json<ApiResponse<ConversationRecord>>, AppError> {
    let document_id = payload.document_id.trim();
    let document_id = if document_id.is_empty() {
        None
    } else {
        // 校验存在性,避免挂到不存在的文档上
        state
            .db
            .get_document(document_id)
            .map_err(|_| AppError::not_found(format!("document not found: {document_id}")))?;
        Some(document_id)
    };
    let conversation = state.db.create_conversation(
        &format!("conv-{}", build_job_id()),
        payload.title.trim(),
        document_id,
    )?;
    Ok(ok_json(conversation))
}

#[derive(Debug, Deserialize)]
pub struct ListConversationsQuery {
    #[serde(default = "default_conversations_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
}

fn default_conversations_limit() -> u32 {
    50
}

#[derive(Debug, Serialize)]
pub struct ConversationListView {
    pub conversations: Vec<ConversationRecord>,
}

pub async fn list_conversations_route(
    State(state): State<AppState>,
    Query(query): Query<ListConversationsQuery>,
) -> Result<Json<ApiResponse<ConversationListView>>, AppError> {
    let conversations = state
        .db
        .list_conversations(query.limit.clamp(1, 200), query.offset)?;
    Ok(ok_json(ConversationListView { conversations }))
}

#[derive(Debug, Serialize)]
pub struct ConversationDetailView {
    #[serde(flatten)]
    pub conversation: ConversationRecord,
    pub messages: Vec<MessageRecord>,
}

pub async fn get_conversation_route(
    State(state): State<AppState>,
    AxumPath(conversation_id): AxumPath<String>,
) -> Result<Json<ApiResponse<ConversationDetailView>>, AppError> {
    let conversation = state
        .db
        .get_conversation(&conversation_id)?
        .ok_or_else(|| AppError::not_found(format!("conversation not found: {conversation_id}")))?;
    let messages = state.db.list_messages(&conversation_id, 500)?;
    Ok(ok_json(ConversationDetailView {
        conversation,
        messages,
    }))
}

pub async fn delete_conversation_route(
    State(state): State<AppState>,
    AxumPath(conversation_id): AxumPath<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    if !state.db.delete_conversation(&conversation_id)? {
        return Err(AppError::not_found(format!(
            "conversation not found: {conversation_id}"
        )));
    }
    Ok(ok_json(serde_json::json!({ "deleted": true })))
}

#[derive(Debug, Deserialize)]
pub struct AppendMessageInput {
    pub role: String,
    pub content: String,
    #[serde(default)]
    pub citations_json: String,
    #[serde(default)]
    pub tool_trace_json: String,
    #[serde(default)]
    pub model: String,
}

pub async fn append_message_route(
    State(state): State<AppState>,
    AxumPath(conversation_id): AxumPath<String>,
    Json(payload): Json<AppendMessageInput>,
) -> Result<Json<ApiResponse<MessageRecord>>, AppError> {
    if !matches!(payload.role.as_str(), "user" | "assistant") {
        return Err(AppError::bad_request("role must be user or assistant"));
    }
    if payload.content.trim().is_empty() {
        return Err(AppError::bad_request("content must not be empty"));
    }
    if state.db.get_conversation(&conversation_id)?.is_none() {
        return Err(AppError::not_found(format!(
            "conversation not found: {conversation_id}"
        )));
    }
    let citations = if payload.citations_json.trim().is_empty() {
        "[]".to_string()
    } else {
        payload.citations_json
    };
    let trace = if payload.tool_trace_json.trim().is_empty() {
        "[]".to_string()
    } else {
        payload.tool_trace_json
    };
    let message = state.db.append_message(
        &conversation_id,
        &format!("msg-{}", build_job_id()),
        &payload.role,
        &payload.content,
        &citations,
        &trace,
        &payload.model,
    )?;
    Ok(ok_json(message))
}
