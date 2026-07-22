//! Block full-text search.

use crate::error::AppError;
use crate::models::api::{SearchQuery, SearchResultView};

use super::LibraryDeps;

pub fn search_blocks(
    deps: &LibraryDeps<'_>,
    query: &SearchQuery,
) -> Result<SearchResultView, AppError> {
    let document_id = query.document_id.trim();
    let hits = deps.db.search_blocks(
        &query.q,
        query.limit.clamp(1, 100),
        if document_id.is_empty() {
            None
        } else {
            Some(document_id)
        },
    )?;
    Ok(SearchResultView {
        query: query.q.clone(),
        hits,
    })
}
