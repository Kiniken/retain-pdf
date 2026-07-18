//! Translate-from-library: reuse a document's stored upload and submit via JobsFacade.

use crate::error::AppError;
use crate::models::api::JobSubmissionView;
use crate::models::domain::WorkflowKind;
use crate::models::request::CreateJobInput;
use crate::services::jobs::JobsFacade;

use super::documents::require_document_upload;
use super::LibraryDeps;

/// Bind `request` to the document's stored upload, normalize workflow, and create a job.
pub fn translate_document(
    deps: &LibraryDeps<'_>,
    jobs: &JobsFacade<'_>,
    document_id: &str,
    mut request: CreateJobInput,
    base_url: &str,
) -> Result<JobSubmissionView, AppError> {
    let (_document, upload) = require_document_upload(deps, document_id)?;

    if !request.source.upload_id.trim().is_empty()
        && request.source.upload_id.trim() != upload.upload_id
    {
        return Err(AppError::bad_request(
            "source.upload_id does not match this document's stored upload",
        ));
    }
    request.source.upload_id = upload.upload_id.clone();
    request.source.source_url.clear();
    request.source.artifact_job_id.clear();

    if matches!(request.workflow, WorkflowKind::Ocr | WorkflowKind::Render) {
        return Err(AppError::bad_request(
            "document translate supports workflow=book or translate; default is book",
        ));
    }
    if !matches!(request.workflow, WorkflowKind::Translate) {
        request.workflow = WorkflowKind::Book;
    }

    jobs.create_submission(base_url, &request)
}
