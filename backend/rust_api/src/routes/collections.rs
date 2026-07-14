//! 分类文件夹(合集)CRUD——collections/collection_documents 表早已随图书馆
//! 数据层建好(见 db/schema.rs),这里只是补上一直缺失的路由层。

use axum::extract::{Path as AxumPath, State};
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::models::api::ApiResponse;
use crate::models::library::CollectionRecord;
use crate::routes::common::ok_json;
use crate::AppState;

fn new_collection_id() -> String {
    format!("col-{}", crate::models::domain::build_job_id())
}

#[derive(Debug, Deserialize)]
pub struct CreateCollectionInput {
    pub name: String,
    #[serde(default)]
    pub parent_id: Option<String>,
}

pub async fn create_collection_route(
    State(state): State<AppState>,
    Json(payload): Json<CreateCollectionInput>,
) -> Result<Json<ApiResponse<CollectionRecord>>, AppError> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(AppError::bad_request("name must not be empty"));
    }
    let parent_id = payload
        .parent_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty());
    if let Some(parent_id) = parent_id {
        if state.db.get_collection(parent_id)?.is_none() {
            return Err(AppError::not_found(format!(
                "parent collection not found: {parent_id}"
            )));
        }
    }
    let collection = state
        .db
        .create_collection(&new_collection_id(), name, parent_id)?;
    Ok(ok_json(collection))
}

#[derive(Debug, Serialize)]
pub struct CollectionListView {
    pub collections: Vec<CollectionRecord>,
}

pub async fn list_collections_route(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<CollectionListView>>, AppError> {
    let collections = state.db.list_collections()?;
    Ok(ok_json(CollectionListView { collections }))
}

#[derive(Debug, Deserialize)]
pub struct PatchCollectionInput {
    pub name: Option<String>,
    pub sort_order: Option<i64>,
}

pub async fn patch_collection_route(
    State(state): State<AppState>,
    AxumPath(collection_id): AxumPath<String>,
    Json(payload): Json<PatchCollectionInput>,
) -> Result<Json<ApiResponse<CollectionRecord>>, AppError> {
    let name = payload
        .name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if payload.name.is_some() && name.is_none() {
        return Err(AppError::bad_request("name must not be empty"));
    }
    let collection = state
        .db
        .update_collection(&collection_id, name, payload.sort_order)
        .map_err(|_| AppError::not_found(format!("collection not found: {collection_id}")))?;
    Ok(ok_json(collection))
}

pub async fn delete_collection_route(
    State(state): State<AppState>,
    AxumPath(collection_id): AxumPath<String>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let deleted = state.db.delete_collection(&collection_id)?;
    if !deleted {
        return Err(AppError::not_found(format!(
            "collection not found: {collection_id}"
        )));
    }
    Ok(ok_json(serde_json::json!({ "deleted": true })))
}

#[derive(Debug, Deserialize)]
pub struct AddCollectionDocumentsInput {
    pub document_ids: Vec<String>,
}

pub async fn add_collection_documents_route(
    State(state): State<AppState>,
    AxumPath(collection_id): AxumPath<String>,
    Json(payload): Json<AddCollectionDocumentsInput>,
) -> Result<Json<ApiResponse<CollectionRecord>>, AppError> {
    if state.db.get_collection(&collection_id)?.is_none() {
        return Err(AppError::not_found(format!(
            "collection not found: {collection_id}"
        )));
    }
    let document_ids: Vec<String> = payload
        .document_ids
        .into_iter()
        .map(|id| id.trim().to_string())
        .filter(|id| !id.is_empty())
        .collect();
    for document_id in &document_ids {
        if state.db.get_document(document_id).is_err() {
            return Err(AppError::not_found(format!(
                "document not found: {document_id}"
            )));
        }
    }
    state
        .db
        .add_documents_to_collection(&collection_id, &document_ids)?;
    let collection = state
        .db
        .get_collection(&collection_id)?
        .ok_or_else(|| AppError::not_found(format!("collection not found: {collection_id}")))?;
    Ok(ok_json(collection))
}

pub async fn remove_collection_document_route(
    State(state): State<AppState>,
    AxumPath((collection_id, document_id)): AxumPath<(String, String)>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    let removed = state
        .db
        .remove_document_from_collection(&collection_id, &document_id)?;
    if !removed {
        return Err(AppError::not_found(format!(
            "document {document_id} is not in collection {collection_id}"
        )));
    }
    Ok(ok_json(serde_json::json!({ "removed": true })))
}
