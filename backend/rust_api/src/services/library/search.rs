//! Block full-text search.

use crate::error::AppError;
use crate::models::api::{SearchQuery, SearchResultView};

use super::LibraryDeps;

pub fn search_blocks(
    deps: &LibraryDeps<'_>,
    query: &SearchQuery,
) -> Result<SearchResultView, AppError> {
    let hits = deps
        .db
        .search_blocks(&query.q, query.limit.clamp(1, 100))?;
    Ok(SearchResultView {
        query: query.q.clone(),
        hits,
    })
}
