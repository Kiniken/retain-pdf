//! Content-addressed binary assets (favorite screenshots, etc.).

use std::path::PathBuf;

use crate::db::documents::sha256_hex;
use crate::error::AppError;
use crate::models::api::AssetRecord;
use crate::models::domain::now_iso;

use super::LibraryDeps;

const ALLOWED_ASSET_MIMES: &[&str] = &["image/png", "image/jpeg", "image/webp"];
const MAX_ASSET_BYTES: usize = 20 * 1024 * 1024;

/// Resolved asset payload for route-layer HTTP response.
#[derive(Debug, Clone)]
pub struct AssetDownload {
    pub mime: String,
    pub data: Vec<u8>,
}

fn asset_extension(mime: &str) -> &'static str {
    match mime {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/webp" => "webp",
        _ => "bin",
    }
}

fn asset_path(deps: &LibraryDeps<'_>, asset_id: &str, mime: &str) -> PathBuf {
    deps.data_root
        .join("assets")
        .join(&asset_id[..2])
        .join(format!("{asset_id}.{}", asset_extension(mime)))
}

/// Store uploaded bytes (route extracts multipart; this owns validation + persist).
pub fn store_asset(
    deps: &LibraryDeps<'_>,
    mime: &str,
    data: &[u8],
) -> Result<AssetRecord, AppError> {
    if !ALLOWED_ASSET_MIMES.contains(&mime) {
        return Err(AppError::bad_request(format!(
            "unsupported asset mime: {mime} (allowed: png/jpeg/webp)"
        )));
    }
    if data.is_empty() || data.len() > MAX_ASSET_BYTES {
        return Err(AppError::bad_request("asset size must be 1B..20MB"));
    }
    let asset_id = sha256_hex(data);
    let path = asset_path(deps, &asset_id, mime);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if !path.exists() {
        std::fs::write(&path, data)?;
    }
    let record = AssetRecord {
        asset_id,
        mime: mime.to_string(),
        bytes: data.len() as u64,
        width: None,
        height: None,
        created_at: now_iso(),
    };
    deps.db.save_asset(&record)?;
    Ok(record)
}

pub fn load_asset(deps: &LibraryDeps<'_>, asset_id: &str) -> Result<AssetDownload, AppError> {
    if asset_id.len() < 8 || !asset_id.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(AppError::bad_request("invalid asset id"));
    }
    let record = deps
        .db
        .get_asset(asset_id)?
        .ok_or_else(|| AppError::not_found(format!("asset not found: {asset_id}")))?;
    let path = asset_path(deps, &record.asset_id, &record.mime);
    let data = std::fs::read(&path)
        .map_err(|_| AppError::not_found(format!("asset file missing: {asset_id}")))?;
    Ok(AssetDownload {
        mime: record.mime,
        data,
    })
}
