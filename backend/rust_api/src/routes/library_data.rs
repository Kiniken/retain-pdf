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
    /// 按任意 job_id(含历史 run)直查其所属文档,前端无需再扫列表反查
    pub job_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DocumentListView {
    pub documents: Vec<DocumentRecord>,
}

pub async fn list_documents_route(
    State(state): State<AppState>,
    Query(query): Query<ListDocumentsQuery>,
) -> Result<Json<ApiResponse<DocumentListView>>, AppError> {
    if let Some(job_id) = query.job_id.as_deref().map(str::trim).filter(|id| !id.is_empty()) {
        let documents = state
            .db
            .get_document_by_job_id(job_id)?
            .into_iter()
            .collect();
        return Ok(ok_json(DocumentListView { documents }));
    }
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
    /// 可缺省:给了 job_id 时后端自动解析所属文档(历史 run 也能收藏)
    #[serde(default)]
    pub document_id: String,
    /// 锚点所在块空间;缺省用文档当前 active_job_id
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
    /// 图片附件:先 POST /api/v1/assets 拿 asset_id 再挂上(kind 建议 figure)
    #[serde(default)]
    pub asset_id: Option<String>,
    /// 截图剪裁矩形几何(前端坐标系原样存)
    #[serde(default)]
    pub rect_json: Option<String>,
}

pub async fn create_favorite_route(
    State(state): State<AppState>,
    Json(payload): Json<CreateFavoriteInput>,
) -> Result<Json<ApiResponse<FavoriteRecord>>, AppError> {
    let requested_job_id = payload
        .job_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(str::to_string);
    let document = if !payload.document_id.trim().is_empty() {
        state
            .db
            .get_document(payload.document_id.trim())
            .map_err(|_| AppError::not_found(format!("document not found: {}", payload.document_id)))?
    } else if let Some(job_id) = requested_job_id.as_deref() {
        // 只给 job_id 也能收藏:历史 run 同样解析到所属文档
        state.db.get_document_by_job_id(job_id)?.ok_or_else(|| {
            AppError::not_found(format!("no document owns job: {job_id}"))
        })?
    } else {
        return Err(AppError::bad_request(
            "either document_id or job_id is required",
        ));
    };
    let job_id = requested_job_id
        .or(document.active_job_id.clone())
        .ok_or_else(|| {
            AppError::bad_request("document has no active job; pass job_id explicitly")
        })?;
    if payload.quote_text.trim().is_empty() {
        return Err(AppError::bad_request("quote_text must not be empty"));
    }
    let asset_id = payload
        .asset_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .map(str::to_string)
        .unwrap_or_default();
    if !asset_id.is_empty() && state.db.get_asset(&asset_id)?.is_none() {
        return Err(AppError::bad_request(format!(
            "asset not found: {asset_id}; upload it via POST /api/v1/assets first"
        )));
    }
    let now = now_iso();
    let favorite = FavoriteRecord {
        favorite_id: format!("fav-{}", build_job_id()),
        document_id: document.document_id,
        job_id,
        page_idx: payload.page_idx,
        block_id: payload.block_id,
        char_start: payload.char_start,
        char_end: payload.char_end,
        kind: payload.kind.unwrap_or_else(|| "sentence".to_string()),
        quote_text: payload.quote_text,
        translated_quote_text: payload.translated_quote_text.unwrap_or_default(),
        note: payload.note.unwrap_or_default(),
        asset_id,
        rect_json: payload.rect_json.unwrap_or_default(),
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

#[derive(Debug, Deserialize)]
pub struct PatchFavoriteInput {
    pub note: Option<String>,
}

pub async fn patch_favorite_route(
    State(state): State<AppState>,
    AxumPath(favorite_id): AxumPath<String>,
    Json(payload): Json<PatchFavoriteInput>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let Some(note) = payload.note else {
        return Err(AppError::bad_request("note is required"));
    };
    let updated = state.db.update_favorite_note(&favorite_id, &note)?;
    if !updated {
        return Err(AppError::not_found(format!(
            "favorite not found: {favorite_id}"
        )));
    }
    Ok(ok_json(serde_json::json!({ "updated": true })))
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
