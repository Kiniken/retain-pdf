use std::path::Path;

use crate::config::WorkerCommandRuntimeConfig;
use crate::models::domain::ResolvedJobSpec;
use crate::storage_paths::JobPaths;

use super::entrypoints::provider_ocr_command as build_provider_ocr_entrypoint;
use super::stage_specs::write_provider_stage_spec;

pub(crate) fn build_ocr_command(
    config: &WorkerCommandRuntimeConfig<'_>,
    upload_path: Option<&Path>,
    request: &ResolvedJobSpec,
    job_paths: &JobPaths,
) -> Vec<String> {
    let spec_path =
        write_provider_stage_spec(request, job_paths, upload_path).expect("write provider spec");
    build_provider_ocr_entrypoint(config, &spec_path)
}
