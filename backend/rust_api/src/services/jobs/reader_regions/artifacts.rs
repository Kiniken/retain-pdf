use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde_json::Value;

use crate::error::AppError;
use crate::models::domain::JobSnapshot;
use crate::storage_paths::{resolve_normalized_document, resolve_translation_manifest};

use super::value_extract::{
    bbox_from_value, canonical_item_id, region_type_from_item, source_text_from_item, value_string,
};

#[derive(Clone)]
pub(super) struct SourceRegion {
    pub(super) page: i64,
    pub(super) bbox: Vec<f64>,
    pub(super) text: Option<String>,
    pub(super) region_type: String,
}

pub(super) fn load_translation_manifest_pages(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<Vec<(i64, Vec<Value>)>, AppError> {
    let manifest_path = resolve_translation_manifest(job, data_root).ok_or_else(|| {
        AppError::not_found(format!("translation manifest not found: {}", job.job_id))
    })?;
    load_manifest_pages(&manifest_path)
}

fn load_manifest_pages(manifest_path: &Path) -> Result<Vec<(i64, Vec<Value>)>, AppError> {
    let text = std::fs::read_to_string(manifest_path)?;
    let manifest: Value = serde_json::from_str(&text).map_err(|err| {
        AppError::internal(format!(
            "parse translation manifest {}: {err}",
            manifest_path.display()
        ))
    })?;
    let pages = manifest
        .get("pages")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            AppError::internal(format!(
                "invalid translation manifest: {}",
                manifest_path.display()
            ))
        })?;
    let base_dir = manifest_path.parent().unwrap_or(manifest_path);
    let mut result = Vec::new();
    for page in pages {
        let page_idx = page
            .get("page_index")
            .and_then(Value::as_i64)
            .unwrap_or_default();
        let rel_path = value_string(page.get("path"));
        if rel_path.is_empty() {
            continue;
        }
        let payload_path = if Path::new(&rel_path).is_absolute() {
            PathBuf::from(&rel_path)
        } else {
            base_dir.join(&rel_path)
        };
        let text = std::fs::read_to_string(&payload_path)?;
        let page_payload: Value = serde_json::from_str(&text).map_err(|err| {
            AppError::internal(format!(
                "parse translation page {}: {err}",
                payload_path.display()
            ))
        })?;
        let items = page_payload.as_array().cloned().unwrap_or_default();
        result.push((page_idx, items));
    }
    Ok(result)
}

pub(super) fn load_source_region_map(
    data_root: &Path,
    job: &JobSnapshot,
) -> Result<HashMap<String, SourceRegion>, AppError> {
    let Some(path) = resolve_normalized_document(job, data_root) else {
        return Ok(HashMap::new());
    };
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let text = std::fs::read_to_string(&path)?;
    let payload: Value = serde_json::from_str(&text).map_err(|err| {
        AppError::internal(format!(
            "parse normalized document {}: {err}",
            path.display()
        ))
    })?;
    let pages = payload
        .get("pages")
        .and_then(Value::as_array)
        .ok_or_else(|| {
            AppError::internal(format!("invalid normalized document: {}", path.display()))
        })?;
    let mut regions = HashMap::new();
    for page in pages {
        let page_idx = page
            .get("page_index")
            .and_then(Value::as_i64)
            .unwrap_or_else(|| page.get("page").and_then(Value::as_i64).unwrap_or(1) - 1);
        let Some(blocks) = page.get("blocks").and_then(Value::as_array) else {
            continue;
        };
        for block in blocks {
            let block_id = value_string(block.get("block_id"));
            if block_id.is_empty() {
                continue;
            }
            let Some(bbox) = bbox_from_value(block.get("bbox")) else {
                continue;
            };
            let region = SourceRegion {
                page: page_idx + 1,
                bbox,
                text: source_text_from_item(block),
                region_type: region_type_from_item(block),
            };
            regions.insert(block_id.clone(), region.clone());
            regions.insert(canonical_item_id(&block_id), region);
        }
    }
    Ok(regions)
}
