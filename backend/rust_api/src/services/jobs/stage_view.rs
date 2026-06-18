use crate::models::api::{
    JobProgressView, JobStageRuntimeView, JobStageSnapshotView, JobStageStateView, JobStagesView,
};
use crate::models::domain::{public_stage_for_raw_stage, JobSnapshot, JobStatusKind, WorkflowKind};

use super::live_stage::LiveStageSnapshot;

#[derive(Debug)]
pub(crate) struct JobStageViewProjection {
    pub(crate) stage: Option<String>,
    pub(crate) stage_detail: Option<String>,
    pub(crate) progress: JobProgressView,
    pub(crate) stage_snapshot: Option<JobStageSnapshotView>,
    pub(crate) background_snapshots: Vec<JobStageSnapshotView>,
    pub(crate) stages: JobStagesView,
}

pub(crate) fn build_job_stage_view(
    job: &JobSnapshot,
    live_stage: Option<&LiveStageSnapshot>,
) -> JobStageViewProjection {
    let stage = live_stage
        .and_then(|snapshot| snapshot.stage.clone())
        .or_else(|| job.stage.clone());
    let display_stage = live_stage
        .and_then(|snapshot| snapshot.display_stage.clone())
        .or_else(|| public_stage_for_raw_stage(stage.as_deref()).map(str::to_string));
    let substage = live_stage.and_then(|snapshot| snapshot.substage.clone());
    let lane = live_stage
        .and_then(|snapshot| snapshot.lane.clone())
        .or_else(|| Some("main".to_string()));
    let stage_detail = live_stage
        .and_then(|snapshot| snapshot.stage_detail.clone())
        .or_else(|| job.stage_detail.clone());
    let progress = build_progress_view(job, live_stage);
    let background_snapshots: Vec<JobStageSnapshotView> = live_stage
        .map(|snapshot| {
            snapshot
                .background_stages
                .iter()
                .filter(|snapshot| snapshot.display_stage.as_deref() != Some("done"))
                .map(stage_snapshot_view)
                .collect()
        })
        .unwrap_or_default();
    let public_snapshot = build_public_stage_snapshot(
        job,
        display_stage.clone(),
        stage.clone(),
        substage.clone(),
        lane.clone(),
        stage_detail.clone(),
        progress.clone(),
    );
    let stages = build_stages_view(
        job,
        public_snapshot.as_ref(),
        &background_snapshots,
        &progress,
    );
    JobStageViewProjection {
        stage,
        stage_detail,
        progress,
        stage_snapshot: public_snapshot,
        background_snapshots,
        stages,
    }
}

pub(crate) fn build_progress_view(
    job: &JobSnapshot,
    live_stage: Option<&LiveStageSnapshot>,
) -> JobProgressView {
    let current = live_stage
        .and_then(|snapshot| snapshot.progress_current)
        .or(job.progress_current);
    let total = live_stage
        .and_then(|snapshot| snapshot.progress_total)
        .or(job.progress_total);
    JobProgressView {
        current,
        total,
        percent: match (current, total) {
            (Some(current), Some(total)) if total > 0 => {
                Some((current as f64 / total as f64) * 100.0)
            }
            _ => None,
        },
        unit: live_stage.and_then(|snapshot| snapshot.progress_unit.clone()),
    }
}

fn stage_snapshot_view(snapshot: &LiveStageSnapshot) -> JobStageSnapshotView {
    JobStageSnapshotView {
        display_stage: snapshot.display_stage.clone(),
        stage: snapshot.stage.clone(),
        substage: snapshot.substage.clone(),
        lane: snapshot.lane.clone(),
        stage_detail: snapshot.stage_detail.clone(),
        progress: JobProgressView {
            current: snapshot.progress_current,
            total: snapshot.progress_total,
            percent: match (snapshot.progress_current, snapshot.progress_total) {
                (Some(current), Some(total)) if total > 0 => {
                    Some((current as f64 / total as f64) * 100.0)
                }
                _ => None,
            },
            unit: snapshot.progress_unit.clone(),
        },
    }
}

fn build_public_stage_snapshot(
    job: &JobSnapshot,
    display_stage: Option<String>,
    stage: Option<String>,
    substage: Option<String>,
    lane: Option<String>,
    stage_detail: Option<String>,
    progress: JobProgressView,
) -> Option<JobStageSnapshotView> {
    if is_terminal_status(&job.status) {
        return None;
    }
    let display_stage = display_stage.filter(|stage| stage.as_str() != "done")?;
    Some(JobStageSnapshotView {
        display_stage: Some(display_stage),
        stage,
        substage,
        lane,
        stage_detail,
        progress,
    })
}

fn build_stages_view(
    job: &JobSnapshot,
    stage_snapshot: Option<&JobStageSnapshotView>,
    background_snapshots: &[JobStageSnapshotView],
    fallback_progress: &JobProgressView,
) -> JobStagesView {
    JobStagesView {
        ocr: stage_runtime(
            "ocr",
            job,
            stage_snapshot,
            background_snapshots,
            fallback_progress,
        ),
        translation: stage_runtime(
            "translation",
            job,
            stage_snapshot,
            background_snapshots,
            fallback_progress,
        ),
        render: stage_runtime(
            "render",
            job,
            stage_snapshot,
            background_snapshots,
            fallback_progress,
        ),
    }
}

fn stage_runtime(
    stage_name: &str,
    job: &JobSnapshot,
    stage_snapshot: Option<&JobStageSnapshotView>,
    background_snapshots: &[JobStageSnapshotView],
    fallback_progress: &JobProgressView,
) -> JobStageRuntimeView {
    let progress = stage_progress(stage_name, stage_snapshot, background_snapshots)
        .unwrap_or_else(|| empty_progress_for_stage(stage_name, stage_snapshot, fallback_progress));
    JobStageRuntimeView {
        state: stage_state(stage_name, job, stage_snapshot),
        progress,
    }
}

fn stage_state(
    stage_name: &str,
    job: &JobSnapshot,
    stage_snapshot: Option<&JobStageSnapshotView>,
) -> JobStageStateView {
    if !workflow_includes_stage(&job.workflow, stage_name) {
        return JobStageStateView::Skipped;
    }
    if matches!(
        stage_snapshot.and_then(|snapshot| snapshot.display_stage.as_deref()),
        Some(active) if active == stage_name
    ) {
        return JobStageStateView::InProgress;
    }
    if matches!(job.status, JobStatusKind::Failed) {
        let failed_stage = failed_public_stage(job).unwrap_or(stage_name);
        if failed_stage == stage_name {
            return JobStageStateView::Failed;
        }
    }
    if is_terminal_status(&job.status) {
        return match job.status {
            JobStatusKind::Succeeded => JobStageStateView::Completed,
            JobStatusKind::Canceled | JobStatusKind::Failed => {
                let failed_stage = failed_public_stage(job).unwrap_or(stage_name);
                if failed_stage == stage_name {
                    JobStageStateView::Failed
                } else if stage_precedes(stage_name, failed_stage) {
                    JobStageStateView::Completed
                } else {
                    JobStageStateView::Pending
                }
            }
            _ => JobStageStateView::Pending,
        };
    }
    if let Some(active_stage) =
        stage_snapshot.and_then(|snapshot| snapshot.display_stage.as_deref())
    {
        if stage_precedes(stage_name, active_stage) {
            JobStageStateView::Completed
        } else {
            JobStageStateView::Pending
        }
    } else {
        JobStageStateView::Pending
    }
}

fn stage_progress(
    stage_name: &str,
    stage_snapshot: Option<&JobStageSnapshotView>,
    background_snapshots: &[JobStageSnapshotView],
) -> Option<JobProgressView> {
    stage_snapshot
        .filter(|snapshot| snapshot.display_stage.as_deref() == Some(stage_name))
        .map(|snapshot| snapshot.progress.clone())
        .or_else(|| {
            background_snapshots
                .iter()
                .rev()
                .find(|snapshot| snapshot.display_stage.as_deref() == Some(stage_name))
                .map(|snapshot| snapshot.progress.clone())
        })
}

fn empty_progress_for_stage(
    stage_name: &str,
    stage_snapshot: Option<&JobStageSnapshotView>,
    fallback_progress: &JobProgressView,
) -> JobProgressView {
    if stage_snapshot
        .and_then(|snapshot| snapshot.display_stage.as_deref())
        .is_none()
        && fallback_progress.current.is_some()
        && public_stage_for_raw_stage(Some(stage_name)) == Some(stage_name)
    {
        return fallback_progress.clone();
    }
    JobProgressView {
        current: None,
        total: None,
        percent: None,
        unit: None,
    }
}

fn workflow_includes_stage(workflow: &WorkflowKind, stage_name: &str) -> bool {
    match workflow {
        WorkflowKind::Book => matches!(stage_name, "ocr" | "translation" | "render"),
        WorkflowKind::Translate => matches!(stage_name, "ocr" | "translation"),
        WorkflowKind::Render => stage_name == "render",
        WorkflowKind::Ocr => stage_name == "ocr",
    }
}

fn failed_public_stage(job: &JobSnapshot) -> Option<&'static str> {
    job.failure
        .as_ref()
        .and_then(|failure| public_stage_for_raw_stage(Some(failure.failed_stage_value())))
        .or_else(|| public_stage_for_raw_stage(job.stage.as_deref()))
}

fn stage_precedes(left: &str, right: &str) -> bool {
    stage_order(left) < stage_order(right)
}

fn stage_order(stage_name: &str) -> i32 {
    match stage_name {
        "ocr" => 1,
        "translation" => 2,
        "render" => 3,
        _ => 0,
    }
}

fn is_terminal_status(status: &JobStatusKind) -> bool {
    matches!(
        status,
        JobStatusKind::Succeeded | JobStatusKind::Failed | JobStatusKind::Canceled
    )
}
