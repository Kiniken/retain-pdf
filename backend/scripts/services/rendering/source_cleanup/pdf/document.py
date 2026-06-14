from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor
from concurrent.futures import as_completed
from dataclasses import dataclass
import os
from pathlib import Path
import time

import fitz
import pikepdf
from pikepdf import Name

from services.rendering.source_cleanup.execution_plan import BBoxTextStripExecutionPlan
from services.rendering.source_cleanup.execution_policy import PageCleanupExecutionPolicy
from services.rendering.source_cleanup.pdf.stream_engine import strip_bbox_text_from_content_bytes
from services.rendering.source_cleanup.pdf.stream_engine import strip_bbox_text_from_page
from services.rendering.source_cleanup.types import BBoxTextStripResult


BBOX_TEXT_STRIP_PARALLEL_PAGE_THRESHOLD = 12
BBOX_TEXT_STRIP_PARALLEL_MAX_WORKERS = 6
BBOX_TEXT_STRIP_PAGES_PER_WORKER = 6


@dataclass
class _ApplyTimings:
    elapsed: float = 0.0
    make_stream_elapsed: float = 0.0
    assign_elapsed: float = 0.0
    top_pages: list[tuple[int, int, float]] | None = None


@dataclass(frozen=True)
class _PageRewriteTask:
    source_pdf_path: Path
    page_idx: int
    weight: int
    rects: tuple[tuple[float, float, float, float], ...]
    protected_rects: tuple[tuple[float, float, float, float], ...]
    has_execution_policy: bool = False
    path_removal_rects: tuple[tuple[float, float, float, float], ...] = ()

    def fitz_rects(self) -> list[fitz.Rect]:
        return [fitz.Rect(rect) for rect in self.rects]

    def fitz_protected_rects(self) -> list[fitz.Rect]:
        return [fitz.Rect(rect) for rect in self.protected_rects]

    def execution_policy(self) -> PageCleanupExecutionPolicy | None:
        if not self.has_execution_policy:
            return None
        return PageCleanupExecutionPolicy(
            path_removal_rects=tuple(fitz.Rect(rect) for rect in self.path_removal_rects)
        )


@dataclass(frozen=True)
class _PageRewriteResult:
    page_idx: int
    content_stream: bytes | None
    removed: int
    forms_changed: int


@dataclass(frozen=True)
class _ChunkTiming:
    page_count: int
    weight: int
    elapsed: float


def strip_bbox_text_rects_from_pdf_copy(
    *,
    source_pdf_path: Path,
    output_pdf_path: Path,
    page_rects: dict[int, list[fitz.Rect]],
    page_protected_rects: dict[int, list[fitz.Rect]] | None = None,
    recurse_forms: bool | None = None,
    skip_form_xobject_pages: bool = False,
    skipped_complex: int = 0,
    skipped_no_text_overlap: int = 0,
    skipped_visual_background: int = 0,
    skipped_complex_page_indices: frozenset[int] = frozenset(),
    skipped_no_text_overlap_page_indices: frozenset[int] = frozenset(),
    skipped_visual_background_page_indices: frozenset[int] = frozenset(),
    pre_skipped_form_xobject_page_indices: frozenset[int] = frozenset(),
    pre_strip_no_effect_page_indices: frozenset[int] = frozenset(),
    candidate_elapsed: float = 0.0,
    candidate_source: str = "unknown",
    max_elapsed_seconds: float | None = None,
    page_features: dict[int, dict[str, object]] | None = None,
    page_execution_policies: dict[int, PageCleanupExecutionPolicy] | None = None,
) -> BBoxTextStripResult:
    page_protected_rects = page_protected_rects or {}
    if not page_rects:
        return BBoxTextStripResult(
            changed=False,
            pages_skipped_complex=skipped_complex,
            pages_skipped_no_text_overlap=skipped_no_text_overlap,
            pages_skipped_visual_background=skipped_visual_background,
            pages_skipped_form_xobject=len(pre_skipped_form_xobject_page_indices),
            pages_strip_no_effect=len(pre_strip_no_effect_page_indices),
            skipped_complex_page_indices=frozenset(skipped_complex_page_indices),
            skipped_no_text_overlap_page_indices=frozenset(skipped_no_text_overlap_page_indices),
            skipped_visual_background_page_indices=frozenset(skipped_visual_background_page_indices),
            skipped_form_xobject_page_indices=frozenset(pre_skipped_form_xobject_page_indices),
            strip_no_effect_page_indices=frozenset(pre_strip_no_effect_page_indices),
        )

    output_pdf_path.parent.mkdir(parents=True, exist_ok=True)
    output_pdf_path.unlink(missing_ok=True)

    pages_changed = 0
    attempted_page_indices = set(page_rects)
    changed_page_indices: set[int] = set()
    removed_total = 0
    forms_changed_total = 0
    open_elapsed = 0.0
    parse_elapsed = 0.0
    apply_timings = _ApplyTimings()
    save_elapsed = 0.0
    close_elapsed = 0.0
    skipped_form_xobject_page_indices: frozenset[int] = frozenset()
    effective_recurse_forms = True if recurse_forms is None else recurse_forms
    deadline = _deadline_from_budget(max_elapsed_seconds)
    open_started = time.perf_counter()
    pdf = pikepdf.Pdf.open(source_pdf_path)
    open_elapsed = time.perf_counter() - open_started
    try:
        runtime_page_results, parse_elapsed, runtime_skipped_form_xobject_page_indices, chunk_timings = _strip_pages(
            source_pdf_path=source_pdf_path,
            pdf=pdf,
            page_rects=page_rects,
            page_protected_rects=page_protected_rects,
            recurse_forms=effective_recurse_forms,
            skip_form_xobject_pages=skip_form_xobject_pages,
            deadline=deadline,
            page_features=page_features or {},
            page_execution_policies=page_execution_policies or {},
        )
        page_results = list(runtime_page_results)
        skipped_form_xobject_page_indices = frozenset(
            pre_skipped_form_xobject_page_indices
            | runtime_skipped_form_xobject_page_indices
        )
        (
            pages_changed,
            removed_total,
            forms_changed_total,
            changed_page_indices,
            apply_timings,
        ) = _apply_page_results(pdf, page_results)

        if pages_changed <= 0:
            output_pdf_path.unlink(missing_ok=True)
            return BBoxTextStripResult(
                changed=False,
                pages_skipped_complex=skipped_complex,
                pages_skipped_no_text_overlap=skipped_no_text_overlap,
                pages_skipped_visual_background=skipped_visual_background,
                pages_skipped_form_xobject=len(skipped_form_xobject_page_indices),
                pages_strip_no_effect=len(attempted_page_indices | pre_strip_no_effect_page_indices),
                skipped_complex_page_indices=frozenset(skipped_complex_page_indices),
                skipped_no_text_overlap_page_indices=frozenset(skipped_no_text_overlap_page_indices),
                skipped_visual_background_page_indices=frozenset(skipped_visual_background_page_indices),
                skipped_form_xobject_page_indices=skipped_form_xobject_page_indices,
                strip_no_effect_page_indices=frozenset(attempted_page_indices | pre_strip_no_effect_page_indices),
            )

        save_started = time.perf_counter()
        pdf.save(
            output_pdf_path,
            object_stream_mode=pikepdf.ObjectStreamMode.generate,
            compress_streams=True,
            recompress_flate=False,
        )
        save_elapsed = time.perf_counter() - save_started
    finally:
        close_started = time.perf_counter()
        pdf.close()
        close_elapsed = time.perf_counter() - close_started

    top_apply_pages = _format_top_apply_pages(apply_timings.top_pages or [])
    top_chunks = _format_top_chunks(chunk_timings)
    strip_no_effect_page_indices = frozenset(
        (attempted_page_indices - changed_page_indices) | pre_strip_no_effect_page_indices
    )
    print(
        f"bbox text strip: mode=strip pages={pages_changed} text_show_ops={removed_total} "
        f"forms={forms_changed_total} skipped_complex_pages={skipped_complex} "
        f"skipped_no_text_overlap_pages={skipped_no_text_overlap} "
        f"skipped_visual_background_pages={skipped_visual_background} "
        f"skipped_form_xobject_pages={len(skipped_form_xobject_page_indices)} "
        f"strip_no_effect_pages={len(strip_no_effect_page_indices)} "
        f"candidate_source={candidate_source} candidates={candidate_elapsed:.2f}s open={open_elapsed:.2f}s "
        f"rewrite={parse_elapsed:.2f}s apply={apply_timings.elapsed:.2f}s "
        f"make_stream={apply_timings.make_stream_elapsed:.2f}s assign={apply_timings.assign_elapsed:.2f}s "
        f"save={save_elapsed:.2f}s close={close_elapsed:.2f}s "
        f"top_apply_pages={top_apply_pages} top_chunks={top_chunks} "
        f"output={output_pdf_path}",
        flush=True,
    )
    return BBoxTextStripResult(
        changed=True,
        output_pdf_path=output_pdf_path,
        pages_changed=pages_changed,
        text_show_ops_removed=removed_total,
        pages_skipped_complex=skipped_complex,
        pages_skipped_no_text_overlap=skipped_no_text_overlap,
        pages_skipped_visual_background=skipped_visual_background,
        pages_skipped_form_xobject=len(skipped_form_xobject_page_indices),
        pages_strip_no_effect=len(strip_no_effect_page_indices),
        forms_changed=forms_changed_total,
        changed_page_indices=frozenset(changed_page_indices),
        skipped_complex_page_indices=frozenset(skipped_complex_page_indices),
        skipped_no_text_overlap_page_indices=frozenset(skipped_no_text_overlap_page_indices),
        skipped_visual_background_page_indices=frozenset(skipped_visual_background_page_indices),
        skipped_form_xobject_page_indices=skipped_form_xobject_page_indices,
        strip_no_effect_page_indices=strip_no_effect_page_indices,
    )


def strip_bbox_text_execution_plan_from_pdf_copy(
    *,
    execution_plan: BBoxTextStripExecutionPlan,
    recurse_forms: bool | None = None,
    skip_form_xobject_pages: bool = False,
    max_elapsed_seconds: float | None = None,
) -> BBoxTextStripResult:
    candidates = execution_plan.candidates
    return strip_bbox_text_rects_from_pdf_copy(
        source_pdf_path=execution_plan.source_pdf_path,
        output_pdf_path=execution_plan.output_pdf_path,
        page_rects=execution_plan.page_rects,
        page_protected_rects=execution_plan.page_protected_rects,
        recurse_forms=recurse_forms,
        skip_form_xobject_pages=skip_form_xobject_pages,
        skipped_complex=candidates.pages_skipped_complex,
        skipped_no_text_overlap=candidates.pages_skipped_no_text_overlap,
        skipped_visual_background=candidates.pages_skipped_visual_background,
        skipped_complex_page_indices=candidates.skipped_complex_page_indices,
        skipped_no_text_overlap_page_indices=candidates.skipped_no_text_overlap_page_indices,
        skipped_visual_background_page_indices=candidates.skipped_visual_background_page_indices,
        pre_skipped_form_xobject_page_indices=candidates.skipped_form_xobject_page_indices,
        pre_strip_no_effect_page_indices=candidates.strip_no_effect_page_indices,
        candidate_elapsed=execution_plan.candidate_elapsed,
        candidate_source=candidates.candidate_source,
        max_elapsed_seconds=max_elapsed_seconds,
        page_features=candidates.page_features,
        page_execution_policies=execution_plan.page_execution_policies,
    )


def _deadline_from_budget(max_elapsed_seconds: float | None) -> float | None:
    if max_elapsed_seconds is None or max_elapsed_seconds <= 0:
        return None
    return time.perf_counter() + float(max_elapsed_seconds)


def _apply_page_results(
    pdf: pikepdf.Pdf,
    page_results: list[_PageRewriteResult],
) -> tuple[int, int, int, set[int], _ApplyTimings]:
    started = time.perf_counter()
    pages_changed = 0
    removed_total = 0
    forms_changed_total = 0
    changed_page_indices: set[int] = set()
    make_stream_elapsed = 0.0
    assign_elapsed = 0.0
    page_apply_timings: list[tuple[int, int, float]] = []

    for result in page_results:
        page_started = time.perf_counter()
        forms_changed_total += result.forms_changed
        if not result.content_stream or result.removed <= 0:
            if result.forms_changed > 0:
                pages_changed += 1
                changed_page_indices.add(result.page_idx)
                removed_total += result.removed
            page_apply_timings.append((result.page_idx, 0, time.perf_counter() - page_started))
            continue

        make_stream_started = time.perf_counter()
        stream = pdf.make_stream(result.content_stream)
        make_stream_elapsed += time.perf_counter() - make_stream_started

        assign_started = time.perf_counter()
        pdf.pages[result.page_idx].obj[Name("/Contents")] = stream
        assign_elapsed += time.perf_counter() - assign_started

        pages_changed += 1
        changed_page_indices.add(result.page_idx)
        removed_total += result.removed
        page_apply_timings.append((result.page_idx, len(result.content_stream), time.perf_counter() - page_started))

    page_apply_timings.sort(key=lambda item: item[2], reverse=True)
    return (
        pages_changed,
        removed_total,
        forms_changed_total,
        changed_page_indices,
        _ApplyTimings(
            elapsed=time.perf_counter() - started,
            make_stream_elapsed=make_stream_elapsed,
            assign_elapsed=assign_elapsed,
            top_pages=page_apply_timings[:5],
        ),
    )


def _format_top_apply_pages(page_timings: list[tuple[int, int, float]]) -> str:
    if not page_timings:
        return "-"
    return ",".join(
        f"p{page_idx + 1}:{content_size}b/{elapsed:.2f}s"
        for page_idx, content_size, elapsed in page_timings
    )


def _strip_pages(
    *,
    source_pdf_path: Path,
    pdf: pikepdf.Pdf,
    page_rects: dict[int, list[fitz.Rect]],
    page_protected_rects: dict[int, list[fitz.Rect]],
    recurse_forms: bool,
    skip_form_xobject_pages: bool,
    deadline: float | None,
    page_features: dict[int, dict[str, object]],
    page_execution_policies: dict[int, PageCleanupExecutionPolicy],
) -> tuple[list[_PageRewriteResult], float, frozenset[int], list[_ChunkTiming]]:
    if len(page_rects) < BBOX_TEXT_STRIP_PARALLEL_PAGE_THRESHOLD:
        started = time.perf_counter()
        skipped_form_pages: set[int] = set()
        results = [
            _strip_page_or_skip_form_page(
                pdf=pdf,
                page_idx=page_idx,
                rects=rects,
                protected_rects=page_protected_rects.get(page_idx, []),
                recurse_forms=recurse_forms,
                skip_form_xobject_pages=skip_form_xobject_pages,
                skipped_form_pages=skipped_form_pages,
                page_features=page_features,
                execution_policy=page_execution_policies.get(page_idx),
            )
            for page_idx, rects in page_rects.items()
        ]
        return results, time.perf_counter() - started, frozenset(skipped_form_pages), []

    worker_count = _parallel_worker_count(len(page_rects))
    if worker_count <= 1:
        started = time.perf_counter()
        skipped_form_pages: set[int] = set()
        results = [
            _strip_page_or_skip_form_page(
                pdf=pdf,
                page_idx=page_idx,
                rects=rects,
                protected_rects=page_protected_rects.get(page_idx, []),
                recurse_forms=recurse_forms,
                skip_form_xobject_pages=skip_form_xobject_pages,
                skipped_form_pages=skipped_form_pages,
                page_features=page_features,
                execution_policy=page_execution_policies.get(page_idx),
            )
            for page_idx, rects in page_rects.items()
        ]
        return results, time.perf_counter() - started, frozenset(skipped_form_pages), []

    started = time.perf_counter()
    results_by_page: dict[int, _PageRewriteResult] = {}
    plain_page_rects: dict[int, list[fitz.Rect]] = {}
    form_page_rects: dict[int, list[fitz.Rect]] = {}
    skipped_form_pages: set[int] = set()
    for page_idx, rects in page_rects.items():
        if recurse_forms and _page_has_form_xobjects_for_page(pdf, page_idx, page_features):
            if skip_form_xobject_pages:
                skipped_form_pages.add(page_idx)
                plain_page_rects[page_idx] = rects
            else:
                form_page_rects[page_idx] = rects
        else:
            plain_page_rects[page_idx] = rects

    chunk_timings: list[_ChunkTiming] = []
    if plain_page_rects:
        page_chunks = _page_chunks(
            source_pdf_path,
            pdf,
            plain_page_rects,
            page_protected_rects,
            worker_count,
            page_execution_policies,
        )
        with ProcessPoolExecutor(max_workers=worker_count) as executor:
            futures = [
                executor.submit(_strip_page_chunk_worker, chunk)
                for chunk in page_chunks
            ]
            for future in as_completed(futures):
                worker_results, chunk_timing = future.result()
                chunk_timings.append(chunk_timing)
                for result in worker_results:
                    results_by_page[result.page_idx] = result
    if form_page_rects:
        if skip_form_xobject_pages:
            skipped_form_pages.update(form_page_rects)
        else:
            for page_idx, rects in form_page_rects.items():
                if deadline is not None and time.perf_counter() >= deadline:
                    skipped_form_pages.add(page_idx)
                    continue
                results_by_page[page_idx] = _strip_page_in_open_pdf(
                    pdf=pdf,
                    page_idx=page_idx,
                    rects=rects,
                    protected_rects=page_protected_rects.get(page_idx, []),
                    recurse_forms=recurse_forms,
                    execution_policy=page_execution_policies.get(page_idx),
                )
    for page_idx in set(page_rects) - set(results_by_page):
        results_by_page[page_idx] = _PageRewriteResult(page_idx=page_idx, content_stream=None, removed=0, forms_changed=0)
    results = [results_by_page[page_idx] for page_idx in page_rects]
    return results, time.perf_counter() - started, frozenset(skipped_form_pages), chunk_timings


def _strip_page_or_skip_form_page(
    *,
    pdf: pikepdf.Pdf,
    page_idx: int,
    rects: list[fitz.Rect],
    protected_rects: list[fitz.Rect],
    recurse_forms: bool,
    skip_form_xobject_pages: bool,
    skipped_form_pages: set[int],
    page_features: dict[int, dict[str, object]],
    execution_policy: PageCleanupExecutionPolicy | None = None,
) -> _PageRewriteResult:
    if recurse_forms and skip_form_xobject_pages and _page_has_form_xobjects_for_page(pdf, page_idx, page_features):
        skipped_form_pages.add(page_idx)
        return _strip_page_in_open_pdf(
            pdf=pdf,
            page_idx=page_idx,
            rects=rects,
            protected_rects=protected_rects,
            recurse_forms=False,
            execution_policy=execution_policy,
        )
    return _strip_page_in_open_pdf(
        pdf=pdf,
        page_idx=page_idx,
        rects=rects,
        protected_rects=protected_rects,
        recurse_forms=recurse_forms,
        execution_policy=execution_policy,
    )


def _strip_page_in_open_pdf(
    *,
    pdf: pikepdf.Pdf,
    page_idx: int,
    rects: list[fitz.Rect],
    protected_rects: list[fitz.Rect],
    recurse_forms: bool,
    execution_policy: PageCleanupExecutionPolicy | None = None,
) -> _PageRewriteResult:
    content_stream, removed, forms_changed = strip_bbox_text_from_page(
        pdf.pages[page_idx],
        rects,
        pdf=pdf,
        protected_rects=protected_rects,
        recurse_forms=recurse_forms,
        execution_policy=execution_policy,
    )
    return _PageRewriteResult(
        page_idx=page_idx,
        content_stream=content_stream,
        removed=removed,
        forms_changed=forms_changed,
    )


def _strip_page_chunk_worker(
    chunk: list[_PageRewriteTask],
) -> tuple[list[_PageRewriteResult], _ChunkTiming]:
    started = time.perf_counter()
    results: list[_PageRewriteResult] = []
    opened: dict[Path, pikepdf.Pdf] = {}
    try:
        for task in chunk:
            pdf = opened.get(task.source_pdf_path)
            if pdf is None:
                pdf = pikepdf.Pdf.open(task.source_pdf_path)
                opened[task.source_pdf_path] = pdf
            content_stream, removed, forms_changed = strip_bbox_text_from_content_bytes(
                _page_content_stream_bytes(pdf, task.page_idx),
                task.fitz_rects(),
                protected_rects=task.fitz_protected_rects(),
                execution_policy=task.execution_policy(),
            )
            results.append(
                _PageRewriteResult(
                    page_idx=task.page_idx,
                    content_stream=content_stream,
                    removed=removed,
                    forms_changed=forms_changed,
                )
            )
    finally:
        for pdf in opened.values():
            pdf.close()
    return results, _ChunkTiming(
        page_count=len(chunk),
        weight=sum(task.weight for task in chunk),
        elapsed=time.perf_counter() - started,
    )


def _parallel_worker_count(page_count: int) -> int:
    raw = str(os.environ.get("RETAIN_BBOX_TEXT_STRIP_WORKERS", "") or "").strip()
    if raw:
        try:
            return max(1, int(raw))
        except ValueError:
            pass
    cpu_count = os.cpu_count() or 1
    page_limited_workers = max(1, (page_count + BBOX_TEXT_STRIP_PAGES_PER_WORKER - 1) // BBOX_TEXT_STRIP_PAGES_PER_WORKER)
    return max(1, min(BBOX_TEXT_STRIP_PARALLEL_MAX_WORKERS, cpu_count, page_count, page_limited_workers))


def _rect_tuples(rects: list[fitz.Rect]) -> tuple[tuple[float, float, float, float], ...]:
    return tuple((float(rect.x0), float(rect.y0), float(rect.x1), float(rect.y1)) for rect in rects)


def _page_chunks(
    source_pdf_path: Path,
    pdf: pikepdf.Pdf,
    page_rects: dict[int, list[fitz.Rect]],
    page_protected_rects: dict[int, list[fitz.Rect]],
    worker_count: int,
    page_execution_policies: dict[int, PageCleanupExecutionPolicy] | None = None,
) -> list[list[_PageRewriteTask]]:
    chunks: list[list[_PageRewriteTask]] = [[] for _ in range(max(1, worker_count))]
    chunk_weights = [0 for _ in chunks]
    page_weights = {
        page_idx: _page_content_stream_weight(pdf, page_idx)
        for page_idx in page_rects
    }
    for page_idx, rects in sorted(page_rects.items(), key=lambda item: page_weights[item[0]], reverse=True):
        chunk_index = min(range(len(chunks)), key=lambda index: chunk_weights[index])
        page_policy = (page_execution_policies or {}).get(page_idx)
        chunks[chunk_index].append(
            _PageRewriteTask(
                source_pdf_path=source_pdf_path,
                page_idx=page_idx,
                weight=page_weights[page_idx],
                rects=_rect_tuples(rects),
                protected_rects=_rect_tuples(page_protected_rects.get(page_idx, [])),
                has_execution_policy=page_policy is not None,
                path_removal_rects=_rect_tuples(list((page_policy or PageCleanupExecutionPolicy()).path_removal_rects)),
            )
        )
        chunk_weights[chunk_index] += page_weights[page_idx]
    return [chunk for chunk in chunks if chunk]


def _format_top_chunks(chunk_timings: list[_ChunkTiming]) -> str:
    if not chunk_timings:
        return "-"
    return ",".join(
        f"{timing.page_count}p/{timing.weight}b/{timing.elapsed:.2f}s"
        for timing in sorted(chunk_timings, key=lambda item: item.elapsed, reverse=True)[:5]
    )


def _page_content_stream_weight(pdf: pikepdf.Pdf, page_idx: int) -> int:
    try:
        contents = pdf.pages[page_idx].obj.get(Name("/Contents"))
    except Exception:
        return 1
    total = 0
    for stream in _content_stream_objects(contents):
        try:
            total += len(stream.read_bytes())
        except Exception:
            total += _stream_declared_length(stream)
    return max(total, 1)


def _page_content_stream_bytes(pdf: pikepdf.Pdf, page_idx: int) -> bytes:
    try:
        contents = pdf.pages[page_idx].obj.get(Name("/Contents"))
    except Exception:
        return b""
    streams: list[bytes] = []
    for stream in _content_stream_objects(contents):
        try:
            streams.append(bytes(stream.read_bytes()))
        except Exception:
            continue
    return b"\n".join(streams)


def _content_stream_objects(contents: object) -> list[object]:
    if contents is None:
        return []
    if isinstance(contents, pikepdf.Array):
        return list(contents)
    return [contents]


def _stream_declared_length(stream: object) -> int:
    try:
        return max(int(stream.get(Name("/Length"))), 1)
    except Exception:
        return 1


def _page_has_form_xobjects(pdf: pikepdf.Pdf, page_idx: int) -> bool:
    try:
        page = pdf.pages[page_idx]
        resources = page.obj.get(Name("/Resources"))
        if resources is None:
            return False
        xobjects = resources.get(Name("/XObject"))
        if xobjects is None:
            return False
        for xobject in xobjects.values():
            if str(xobject.get(Name("/Subtype"))) == "/Form":
                return True
    except Exception:
        return True
    return False


def _page_has_form_xobjects_for_page(
    pdf: pikepdf.Pdf,
    page_idx: int,
    page_features: dict[int, dict[str, object]],
) -> bool:
    features = page_features.get(page_idx)
    if isinstance(features, dict) and "has_form_xobjects" in features:
        return bool(features.get("has_form_xobjects"))
    return _page_has_form_xobjects(pdf, page_idx)
