use crate::error::AppError;
use crate::models::api::{ArtifactDownloadQuery, MarkdownQuery, PagePreviewQuery};
use crate::services::jobs::DocumentDownloadKind;
use crate::AppState;
use axum::extract::{Path as AxumPath, Query, State};
use axum::http::HeaderMap;
use axum::response::Response;

use crate::routes::common::build_jobs_route_deps;
use crate::routes::download_response::{
    bundle_response, cover_response, download_document_response, markdown_document_response,
    markdown_image_response, markdown_response, page_preview_response,
    registered_artifact_response, side_by_side_pdf_response, thumbnail_response,
};

pub async fn download_pdf(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    download_document_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        false,
        DocumentDownloadKind::OutputPdf,
    )
    .await
}

pub async fn download_side_by_side_pdf(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    side_by_side_pdf_response(&build_jobs_route_deps(&state), &headers, &job_id).await
}

pub async fn download_cover(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    cover_response(&build_jobs_route_deps(&state), &headers, &job_id).await
}

pub async fn download_thumbnail(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    thumbnail_response(&build_jobs_route_deps(&state), &headers, &job_id).await
}

pub async fn download_page_preview(
    State(state): State<AppState>,
    AxumPath((job_id, page)): AxumPath<(String, u32)>,
    headers: HeaderMap,
    Query(query): Query<PagePreviewQuery>,
) -> Result<Response, AppError> {
    page_preview_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        page,
        &query,
    )
    .await
}

pub async fn download_artifact_by_key(
    State(state): State<AppState>,
    AxumPath((job_id, artifact_key)): AxumPath<(String, String)>,
    headers: HeaderMap,
    Query(query): Query<ArtifactDownloadQuery>,
) -> Result<Response, AppError> {
    registered_artifact_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        &artifact_key,
        query.include_job_dir,
        false,
    )
    .await
}

pub async fn download_ocr_artifact_by_key(
    State(state): State<AppState>,
    AxumPath((job_id, artifact_key)): AxumPath<(String, String)>,
    headers: HeaderMap,
    Query(query): Query<ArtifactDownloadQuery>,
) -> Result<Response, AppError> {
    registered_artifact_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        &artifact_key,
        query.include_job_dir,
        true,
    )
    .await
}

pub async fn download_normalized_document(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    download_document_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        false,
        DocumentDownloadKind::NormalizedDocument,
    )
    .await
}

pub async fn download_ocr_normalized_document(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    download_document_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        true,
        DocumentDownloadKind::NormalizedDocument,
    )
    .await
}

pub async fn download_normalization_report(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    download_document_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        false,
        DocumentDownloadKind::NormalizationReport,
    )
    .await
}

pub async fn download_ocr_normalization_report(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    download_document_response(
        &build_jobs_route_deps(&state),
        &headers,
        &job_id,
        true,
        DocumentDownloadKind::NormalizationReport,
    )
    .await
}

pub async fn download_markdown(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
    Query(query): Query<MarkdownQuery>,
) -> Result<Response, AppError> {
    markdown_response(&build_jobs_route_deps(&state), &headers, job_id, &query).await
}

pub async fn get_markdown_document(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    markdown_document_response(&build_jobs_route_deps(&state), &headers, &job_id).await
}

pub async fn download_markdown_image(
    State(state): State<AppState>,
    AxumPath((job_id, path)): AxumPath<(String, String)>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    markdown_image_response(&build_jobs_route_deps(&state), &headers, &job_id, &path).await
}

pub async fn download_bundle(
    State(state): State<AppState>,
    AxumPath(job_id): AxumPath<String>,
    headers: HeaderMap,
) -> Result<Response, AppError> {
    bundle_response(&build_jobs_route_deps(&state), &headers, &job_id).await
}
