//! 图书馆数据层的最小 API:documents / favorites / 全文检索。
//! 前端图书馆改版前,现有 /api/v1/library/books 投影接口保持不动。

use axum::extract::Query;
use axum::extract::{Path as AxumPath, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::models::domain::{build_job_id, now_iso};
use crate::models::library::{BlockSearchHit, DocumentRecord, FavoriteRecord};
use crate::routes::common::ok_json;
use crate::AppState;

fn default_limit() -> u32 {
    50
}

#[derive(Debug, Deserialize)]
pub struct ListDocumentsQuery {
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default)]
    pub offset: u32,
    pub reading_status: Option<String>,
    pub tag: Option<String>,
    pub collection_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DocumentListView {
    pub documents: Vec<DocumentRecord>,
}

pub async fn list_documents_route(
    State(state): State<AppState>,
    Query(query): Query<ListDocumentsQuery>,
) -> Result<Json<ApiResponse<DocumentListView>>, AppError> {
    let documents = state.db.list_documents(
        query.limit.clamp(1, 500),
        query.offset,
        query.reading_status.as_deref(),
        query.tag.as_deref(),
        query.collection_id.as_deref(),
    )?;
    Ok(ok_json(DocumentListView { documents }))
}

pub async fn get_document_route(
    State(state): State<AppState>,
    AxumPath(document_id): AxumPath<String>,
) -> Result<Json<ApiResponse<DocumentRecord>>, AppError> {
    let document = state
        .db
        .get_document(&document_id)
        .map_err(|_| AppError::not_found(format!("document not found: {document_id}")))?;
    Ok(ok_json(document))
}

#[derive(Debug, Deserialize)]
pub struct PatchDocumentInput {
    pub title: Option<String>,
    pub reading_status: Option<String>,
    pub tags: Option<Vec<String>>,
}

pub async fn patch_document_route(
    State(state): State<AppState>,
    AxumPath(document_id): AxumPath<String>,
    Json(payload): Json<PatchDocumentInput>,
) -> Result<Json<ApiResponse<DocumentRecord>>, AppError> {
    if let Some(status) = payload.reading_status.as_deref() {
        if !matches!(status, "unread" | "reading" | "done") {
            return Err(AppError::bad_request(
                "reading_status must be one of: unread, reading, done",
            ));
        }
    }
    let document = state
        .db
        .update_document_fields(
            &document_id,
            payload.title.as_deref(),
            payload.reading_status.as_deref(),
            payload.tags.as_deref(),
        )
        .map_err(|_| AppError::not_found(format!("document not found: {document_id}")))?;
    Ok(ok_json(document))
}

#[derive(Debug, Deserialize)]
pub struct CreateFavoriteInput {
    pub document_id: String,
    /// 缺省用文档当前 active_job_id(即阅读器正展示的块空间)
    pub job_id: Option<String>,
    pub page_idx: i64,
    pub block_id: String,
    pub char_start: Option<i64>,
    pub char_end: Option<i64>,
    #[serde(default)]
    pub kind: Option<String>,
    pub quote_text: String,
    #[serde(default)]
    pub translated_quote_text: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
}

pub async fn create_favorite_route(
    State(state): State<AppState>,
    Json(payload): Json<CreateFavoriteInput>,
) -> Result<Json<ApiResponse<FavoriteRecord>>, AppError> {
    let document = state
        .db
        .get_document(&payload.document_id)
        .map_err(|_| AppError::not_found(format!("document not found: {}", payload.document_id)))?;
    let job_id = payload
        .job_id
        .filter(|id| !id.trim().is_empty())
        .or(document.active_job_id)
        .ok_or_else(|| {
            AppError::bad_request("document has no active job; pass job_id explicitly")
        })?;
    if payload.quote_text.trim().is_empty() {
        return Err(AppError::bad_request("quote_text must not be empty"));
    }
    let now = now_iso();
    let favorite = FavoriteRecord {
        favorite_id: format!("fav-{}", build_job_id()),
        document_id: payload.document_id,
        job_id,
        page_idx: payload.page_idx,
        block_id: payload.block_id,
        char_start: payload.char_start,
        char_end: payload.char_end,
        kind: payload.kind.unwrap_or_else(|| "sentence".to_string()),
        quote_text: payload.quote_text,
        translated_quote_text: payload.translated_quote_text.unwrap_or_default(),
        note: payload.note.unwrap_or_default(),
        created_at: now.clone(),
        updated_at: now,
    };
    state.db.save_favorite(&favorite)?;
    Ok(ok_json(favorite))
}

#[derive(Debug, Deserialize)]
pub struct ListFavoritesQuery {
    pub document_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct FavoriteListView {
    pub favorites: Vec<FavoriteRecord>,
}

pub async fn list_favorites_route(
    State(state): State<AppState>,
    Query(query): Query<ListFavoritesQuery>,
) -> Result<Json<ApiResponse<FavoriteListView>>, AppError> {
    let favorites = state.db.list_favorites(query.document_id.as_deref())?;
    Ok(ok_json(FavoriteListView { favorites }))
}

pub async fn delete_favorite_route(
    State(state): State<AppState>,
    AxumPath(favorite_id): AxumPath<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let deleted = state.db.delete_favorite(&favorite_id)?;
    if !deleted {
        return Err(AppError::not_found(format!(
            "favorite not found: {favorite_id}"
        )));
    }
    Ok(ok_json(serde_json::json!({ "deleted": true })))
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    #[serde(default = "default_search_limit")]
    pub limit: u32,
}

fn default_search_limit() -> u32 {
    20
}

#[derive(Debug, Serialize)]
pub struct SearchResultView {
    pub query: String,
    pub hits: Vec<BlockSearchHit>,
}

pub async fn search_blocks_route(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<ApiResponse<SearchResultView>>, AppError> {
    let hits = state
        .db
        .search_blocks(&query.q, query.limit.clamp(1, 100))?;
    Ok(ok_json(SearchResultView {
        query: query.q,
        hits,
    }))
}
