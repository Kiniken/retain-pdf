from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass
from difflib import SequenceMatcher
import re
from typing import Iterable
from typing import Callable

import fitz

from services.rendering.source.rects import rect_area
from services.rendering.source_cleanup.planning.spatial_index import RectOverlapIndex
from services.rendering.source_cleanup.planning.drawing_classifier import bboxlog_path_blocks_text_strip


BBoxTransform = Callable[[fitz.Page, fitz.Rect], fitz.Rect]
MIN_TEXT_MATCH_SCORE = 0.35
TEXT_MATCH_MARGIN_PT = 1.0
TEXT_MATCH_SAMPLE_CHARS = 360


@dataclass(frozen=True)
class BBoxCoordinateCandidate:
    name: str
    transform: BBoxTransform
    pdf_transform: BBoxTransform


@dataclass(frozen=True)
class BBoxCoordinateScore:
    candidate: BBoxCoordinateCandidate
    rect: fitz.Rect
    text_overlap_count: int
    text_overlap_area: float


@dataclass(frozen=True)
class ItemCoordinateScore:
    candidate: BBoxCoordinateCandidate
    rect: fitz.Rect
    source_match_score: float
    text_overlap_count: int
    text_overlap_area: float


@dataclass(frozen=True)
class ItemCoordinateResolution:
    candidate: BBoxCoordinateCandidate | None
    score: float
    status: str
    reason: str

    @property
    def is_resolved(self) -> bool:
        return self.candidate is not None and self.status == "resolved"


@dataclass(frozen=True)
class TextClipFragment:
    rect: fitz.Rect
    text: str
    order: int


@dataclass(frozen=True)
class TextRectIndex:
    rects: tuple[fitz.Rect, ...]
    y0_sorted: tuple[float, ...]

    @classmethod
    def build(cls, rects: Iterable[fitz.Rect]) -> "TextRectIndex":
        ordered = tuple(sorted(rects, key=lambda rect: rect.y0))
        return cls(rects=ordered, y0_sorted=tuple(float(rect.y0) for rect in ordered))

    def score(self, target_rect: fitz.Rect) -> tuple[int, float]:
        if target_rect.is_empty or not self.rects:
            return 0, 0.0
        count = 0
        area = 0.0
        limit = bisect_right(self.y0_sorted, float(target_rect.y1))
        for index in range(limit):
            text_rect = self.rects[index]
            if text_rect.y1 < target_rect.y0:
                continue
            overlap = rect_area(text_rect & target_rect)
            if overlap <= 0.0:
                continue
            count += 1
            area += overlap
        return count, area

    def overlaps_any(self, target_rects: Iterable[fitz.Rect]) -> bool:
        return any(self.score(target_rect)[0] > 0 for target_rect in target_rects)


@dataclass(frozen=True)
class PageTextClipIndex:
    fragments: tuple[TextClipFragment, ...]
    y0_sorted: tuple[float, ...]

    @classmethod
    def build(cls, page: fitz.Page) -> "PageTextClipIndex":
        try:
            words = page.get_text("words")
        except Exception:
            return cls.empty()
        fragments = tuple(
            fragment
            for order, word in enumerate(words)
            if (fragment := text_clip_fragment_from_word(word, order)) is not None
        )
        ordered = tuple(sorted(fragments, key=lambda fragment: fragment.rect.y0))
        return cls(
            fragments=ordered,
            y0_sorted=tuple(float(fragment.rect.y0) for fragment in ordered),
        )

    @classmethod
    def empty(cls) -> "PageTextClipIndex":
        return cls(fragments=(), y0_sorted=())

    def text_for_rect(self, rect: fitz.Rect) -> str:
        if rect.is_empty or not self.fragments:
            return ""
        clip = expanded_text_match_rect(rect)
        matches: list[TextClipFragment] = []
        limit = bisect_right(self.y0_sorted, float(clip.y1))
        for index in range(limit):
            fragment = self.fragments[index]
            if fragment.rect.y1 < clip.y0:
                continue
            if fragment.rect.x1 < clip.x0 or fragment.rect.x0 > clip.x1:
                continue
            if rect_area(fragment.rect & clip) <= 0.0:
                continue
            matches.append(fragment)
        return " ".join(fragment.text for fragment in sorted(matches, key=lambda value: value.order))


@dataclass(frozen=True)
class PageBBoxResolver:
    page: fitz.Page
    text_rects: tuple[fitz.Rect, ...]
    text_index: TextRectIndex
    text_clip_index: PageTextClipIndex
    image_rects: tuple[fitz.Rect, ...]
    unsafe_vector_rects: tuple[fitz.Rect, ...]
    unsafe_vector_index: RectOverlapIndex
    preferred_candidate: BBoxCoordinateCandidate
    item_candidates: dict[str, BBoxCoordinateCandidate]
    item_resolutions: dict[str, ItemCoordinateResolution]
    bbox_candidates: dict[tuple[float, float, float, float], BBoxCoordinateCandidate]

    @classmethod
    def build(
        cls,
        page: fitz.Page,
        bboxes: Iterable[object] = (),
        items: Iterable[dict] = (),
    ) -> "PageBBoxResolver":
        item_tuple = tuple(item for item in items if isinstance(item, dict))
        bbox_tuple = tuple(bboxes)
        if item_tuple and not bbox_tuple:
            bbox_tuple = tuple(item.get("bbox", []) for item in item_tuple)
        text_rects, image_rects, unsafe_vector_rects = page_bboxlog_rect_groups(page)
        text_index = TextRectIndex.build(text_rects)
        text_clip_index = PageTextClipIndex.build(page) if item_tuple else PageTextClipIndex.empty()
        preferred = choose_page_coordinate_candidate(page, bbox_tuple, text_index)
        item_resolutions = choose_item_coordinate_resolutions(page, item_tuple, text_index, text_clip_index, preferred)
        item_candidates = {
            key: resolution.candidate
            for key, resolution in item_resolutions.items()
            if resolution.candidate is not None
        }
        return cls(
            page=page,
            text_rects=text_rects,
            text_index=text_index,
            text_clip_index=text_clip_index,
            image_rects=image_rects,
            unsafe_vector_rects=unsafe_vector_rects,
            unsafe_vector_index=RectOverlapIndex.build(unsafe_vector_rects),
            preferred_candidate=preferred,
            item_candidates=item_candidates,
            item_resolutions=item_resolutions,
            bbox_candidates={
                key: candidate
                for item in item_tuple
                if (key := bbox_key(item.get("bbox", []))) is not None
                if (candidate := item_candidates.get(item_key(item))) is not None
            },
        )

    def resolve_bbox_rect(self, bbox: object) -> fitz.Rect | None:
        raw_rect = raw_bbox_rect(bbox)
        if raw_rect is None:
            return None
        rect = self.preferred_candidate.transform(self.page, raw_rect)
        return None if rect.is_empty else rect

    def resolve_item_bbox_rect(self, item: dict) -> fitz.Rect | None:
        raw_rect = raw_bbox_rect(item.get("bbox", []))
        if raw_rect is None:
            return None
        rect = self._candidate_for_item(item).transform(self.page, raw_rect)
        return None if rect.is_empty else rect

    def resolve_bbox_probe_rects(self, bbox: object) -> tuple[fitz.Rect, ...]:
        raw_rect = raw_bbox_rect(bbox)
        if raw_rect is None:
            return ()
        rects: dict[tuple[int, int, int, int], fitz.Rect] = {}
        for candidate in BBOX_COORDINATE_CANDIDATES:
            rect = candidate.transform(self.page, raw_rect)
            if not rect.is_empty:
                rects.setdefault(_rect_probe_key(rect), rect)
        return tuple(rects.values())

    def ocr_bbox_to_pdf_rect(self, bbox: object) -> fitz.Rect | None:
        raw_rect = raw_bbox_rect(bbox)
        if raw_rect is None:
            return None
        candidate = self.bbox_candidates.get(bbox_key(bbox)) or self.preferred_candidate
        pdf_rect = candidate.pdf_transform(self.page, raw_rect)
        return None if pdf_rect.is_empty else pdf_rect

    def ocr_item_bbox_to_pdf_rect(self, item: dict) -> fitz.Rect | None:
        raw_rect = raw_bbox_rect(item.get("bbox", []))
        if raw_rect is None:
            return None
        pdf_rect = self._candidate_for_item(item).pdf_transform(self.page, raw_rect)
        return None if pdf_rect.is_empty else pdf_rect

    def _candidate_for_item(self, item: dict) -> BBoxCoordinateCandidate:
        candidate = self.item_candidates.get(item_key(item))
        if candidate is not None:
            return candidate
        key = bbox_key(item.get("bbox", []))
        if key is not None and key in self.bbox_candidates:
            return self.bbox_candidates[key]
        return self.preferred_candidate

    def coordinate_resolution_for_item(self, item: dict) -> ItemCoordinateResolution:
        key = item_key(item)
        if key and key in self.item_resolutions:
            return self.item_resolutions[key]
        candidate = self._candidate_for_item(item)
        return ItemCoordinateResolution(
            candidate=candidate,
            score=0.0,
            status="resolved",
            reason="fallback_page_candidate",
        )

    def has_large_background_image(self, *, coverage_ratio_threshold: float = 0.75) -> bool:
        if not self.image_rects:
            return False
        page_area = max(rect_area(self.page.rect), 1.0)
        if any(rect_area(rect & self.page.rect) / page_area >= coverage_ratio_threshold for rect in self.image_rects):
            return True
        return page_has_tiled_background_images_from_rects(self.page, self.image_rects)


BBOX_COORDINATE_CANDIDATES: tuple[BBoxCoordinateCandidate, ...] = (
    BBoxCoordinateCandidate(
        name="pdf_matrix",
        transform=lambda page, rect: rect * ~page.transformation_matrix,
        pdf_transform=lambda _page, rect: fitz.Rect(rect),
    ),
    BBoxCoordinateCandidate(
        name="raw_top_left",
        transform=lambda _page, rect: fitz.Rect(rect),
        pdf_transform=lambda page, rect: rect * ~page.transformation_matrix,
    ),
)


def choose_page_coordinate_candidate(
    page: fitz.Page,
    bboxes: Iterable[object],
    text_index: TextRectIndex,
) -> BBoxCoordinateCandidate:
    raw_rects = tuple(rect for bbox in bboxes if (rect := raw_bbox_rect(bbox)) is not None)
    if not raw_rects:
        return BBOX_COORDINATE_CANDIDATES[0]
    scores = [
        aggregate_candidate_score(page, candidate, raw_rects, text_index)
        for candidate in BBOX_COORDINATE_CANDIDATES
    ]
    return max(scores, key=lambda score: (score.text_overlap_count, score.text_overlap_area)).candidate


def choose_item_coordinate_candidates(
    page: fitz.Page,
    items: tuple[dict, ...],
    text_index: TextRectIndex,
    text_clip_index: PageTextClipIndex,
    fallback: BBoxCoordinateCandidate,
) -> dict[str, BBoxCoordinateCandidate]:
    return {
        key: resolution.candidate
        for key, resolution in choose_item_coordinate_resolutions(
            page,
            items,
            text_index,
            text_clip_index,
            fallback,
        ).items()
        if resolution.candidate is not None
    }


def choose_item_coordinate_resolutions(
    page: fitz.Page,
    items: tuple[dict, ...],
    text_index: TextRectIndex,
    text_clip_index: PageTextClipIndex,
    fallback: BBoxCoordinateCandidate,
) -> dict[str, ItemCoordinateResolution]:
    result: dict[str, ItemCoordinateResolution] = {}
    for item in items:
        key = item_key(item)
        if not key:
            continue
        raw_rect = raw_bbox_rect(item.get("bbox", []))
        if raw_rect is None:
            continue
        result[key] = choose_item_coordinate_resolution(page, item, raw_rect, text_index, text_clip_index, fallback)
    return result


def choose_item_coordinate_candidate(
    page: fitz.Page,
    item: dict,
    raw_rect: fitz.Rect,
    text_index: TextRectIndex,
    text_clip_index: PageTextClipIndex,
    fallback: BBoxCoordinateCandidate,
) -> BBoxCoordinateCandidate:
    resolution = choose_item_coordinate_resolution(page, item, raw_rect, text_index, text_clip_index, fallback)
    return resolution.candidate or fallback


def choose_item_coordinate_resolution(
    page: fitz.Page,
    item: dict,
    raw_rect: fitz.Rect,
    text_index: TextRectIndex,
    text_clip_index: PageTextClipIndex,
    fallback: BBoxCoordinateCandidate,
) -> ItemCoordinateResolution:
    scores = tuple(
        score_item_coordinate_candidate(page, item, candidate, raw_rect, text_index, text_clip_index)
        for candidate in BBOX_COORDINATE_CANDIDATES
    )
    best = max(scores, key=lambda score: (score.source_match_score, score.text_overlap_count, score.text_overlap_area))
    if best.source_match_score >= MIN_TEXT_MATCH_SCORE:
        return ItemCoordinateResolution(
            candidate=best.candidate,
            score=best.source_match_score,
            status="resolved",
            reason="source_text_match",
        )
    if normalized_text_for_match(item_source_text(item)):
        return ItemCoordinateResolution(
            candidate=None,
            score=best.source_match_score,
            status="unresolved",
            reason="low_source_text_match",
        )
    return ItemCoordinateResolution(
        candidate=fallback,
        score=0.0,
        status="resolved",
        reason="page_coordinate_vote",
    )


def candidate_by_name(name: str) -> BBoxCoordinateCandidate:
    return next(
        candidate
        for candidate in BBOX_COORDINATE_CANDIDATES
        if candidate.name == name
    )


def score_item_coordinate_candidate(
    page: fitz.Page,
    item: dict,
    candidate: BBoxCoordinateCandidate,
    raw_rect: fitz.Rect,
    text_index: TextRectIndex,
    text_clip_index: PageTextClipIndex | None = None,
) -> ItemCoordinateScore:
    rect = candidate.transform(page, raw_rect)
    count, area = text_index.score(rect)
    return ItemCoordinateScore(
        candidate=candidate,
        rect=rect,
        source_match_score=source_text_match_score(page, item, rect, text_clip_index),
        text_overlap_count=count,
        text_overlap_area=area,
    )


def aggregate_candidate_score(
    page: fitz.Page,
    candidate: BBoxCoordinateCandidate,
    raw_rects: tuple[fitz.Rect, ...],
    text_index: TextRectIndex,
) -> BBoxCoordinateScore:
    count = 0
    area = 0.0
    union_rect = fitz.Rect()
    for raw_rect in raw_rects:
        rect = candidate.transform(page, raw_rect)
        if union_rect.is_empty:
            union_rect = fitz.Rect(rect)
        else:
            union_rect.include_rect(rect)
        rect_count, rect_area_sum = text_index.score(rect)
        count += rect_count
        area += rect_area_sum
    return BBoxCoordinateScore(
        candidate=candidate,
        rect=union_rect,
        text_overlap_count=count,
        text_overlap_area=area,
    )


def resolve_bbox_rect(page: fitz.Page, bbox: object) -> fitz.Rect | None:
    raw_rect = raw_bbox_rect(bbox)
    if raw_rect is None:
        return None
    scores = tuple(score_bbox_candidate(page, candidate, raw_rect) for candidate in BBOX_COORDINATE_CANDIDATES)
    best = max(scores, key=lambda score: (score.text_overlap_count, score.text_overlap_area))
    return None if best.rect.is_empty else best.rect


def raw_bbox_rect(bbox: object) -> fitz.Rect | None:
    if not isinstance(bbox, list) or len(bbox) != 4:
        return None
    rect = fitz.Rect(*(to_float(value) for value in bbox))
    return None if rect.is_empty else rect


def item_key(item: dict) -> str:
    explicit = str(item.get("item_id") or item.get("block_id") or item.get("id") or "").strip()
    if explicit:
        return explicit
    key = bbox_key(item.get("bbox", []))
    return "" if key is None else "bbox:" + ",".join(str(value) for value in key)


def bbox_key(bbox: object) -> tuple[float, float, float, float] | None:
    rect = raw_bbox_rect(bbox)
    if rect is None:
        return None
    return (
        round(float(rect.x0), 3),
        round(float(rect.y0), 3),
        round(float(rect.x1), 3),
        round(float(rect.y1), 3),
    )


def source_text_match_score(
    page: fitz.Page,
    item: dict,
    rect: fitz.Rect,
    text_clip_index: PageTextClipIndex | None = None,
) -> float:
    raw_source_text = item_source_text(item)
    source_text = normalized_text_for_match(raw_source_text)
    if not source_text:
        return 0.0
    raw_clip_text = text_clip_index.text_for_rect(rect) if text_clip_index is not None else page_clip_text(page, rect)
    clip_text = normalized_text_for_match(raw_clip_text)
    if not clip_text:
        return 0.0
    source_sample = source_text[:TEXT_MATCH_SAMPLE_CHARS]
    clip_sample = clip_text[:TEXT_MATCH_SAMPLE_CHARS]
    if source_sample in clip_text or clip_sample in source_text:
        shorter = max(min(len(source_sample), len(clip_sample)), 1)
        longer = max(max(len(source_sample), len(clip_sample)), 1)
        return max(0.85, shorter / longer)
    token_score = source_token_match_score(raw_source_text, raw_clip_text)
    if min(len(source_sample), len(clip_sample)) < 40:
        return token_score if token_score >= 0.8 else 0.0
    return SequenceMatcher(None, source_sample, clip_sample).ratio()


def page_clip_text(page: fitz.Page, rect: fitz.Rect) -> str:
    try:
        return page.get_text("text", clip=expanded_text_match_rect(rect))
    except Exception:
        return ""


def expanded_text_match_rect(rect: fitz.Rect) -> fitz.Rect:
    return fitz.Rect(
        rect.x0 - TEXT_MATCH_MARGIN_PT,
        rect.y0 - TEXT_MATCH_MARGIN_PT,
        rect.x1 + TEXT_MATCH_MARGIN_PT,
        rect.y1 + TEXT_MATCH_MARGIN_PT,
    )


def text_clip_fragment_from_word(word: object, order: int) -> TextClipFragment | None:
    try:
        rect = fitz.Rect(float(word[0]), float(word[1]), float(word[2]), float(word[3]))
        text = str(word[4] or "").strip()
    except Exception:
        return None
    if rect.is_empty or not text:
        return None
    return TextClipFragment(rect=rect, text=text, order=order)


def item_source_text(item: dict) -> str:
    return str(
        item.get("translation_unit_protected_source_text")
        or item.get("protected_source_text")
        or item.get("source_text")
        or item.get("text")
        or ""
    )


def normalized_text_for_match(value: str) -> str:
    return "".join(str(value).lower().split())


def source_token_match_score(source_text: str, clip_text: str) -> float:
    source_tokens = text_match_tokens(source_text)
    if not source_tokens:
        return 0.0
    clip_tokens = set(text_match_tokens(clip_text))
    if not clip_tokens:
        return 0.0
    matched = sum(1 for token in source_tokens if token in clip_tokens)
    return matched / max(len(source_tokens), 1)


def text_match_tokens(value: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", str(value).lower())


def _rect_probe_key(rect: fitz.Rect) -> tuple[int, int, int, int]:
    return (
        int(round(rect.x0 * 10)),
        int(round(rect.y0 * 10)),
        int(round(rect.x1 * 10)),
        int(round(rect.y1 * 10)),
    )


def score_bbox_candidate(
    page: fitz.Page,
    candidate: BBoxCoordinateCandidate,
    raw_rect: fitz.Rect,
) -> BBoxCoordinateScore:
    rect = candidate.transform(page, raw_rect)
    count, area = text_overlap_score(page, rect)
    return BBoxCoordinateScore(
        candidate=candidate,
        rect=rect,
        text_overlap_count=count,
        text_overlap_area=area,
    )


def score_bbox_candidate_with_text_rects(
    page: fitz.Page,
    candidate: BBoxCoordinateCandidate,
    raw_rect: fitz.Rect,
    text_rects: tuple[fitz.Rect, ...],
) -> BBoxCoordinateScore:
    rect = candidate.transform(page, raw_rect)
    count, area = TextRectIndex.build(text_rects).score(rect)
    return BBoxCoordinateScore(
        candidate=candidate,
        rect=rect,
        text_overlap_count=count,
        text_overlap_area=area,
    )


def text_overlap_score(page: fitz.Page, target_rect: fitz.Rect) -> tuple[int, float]:
    return text_overlap_score_from_rects(target_rect, page_text_rects(page))


def text_overlap_score_from_rects(target_rect: fitz.Rect, text_rects: tuple[fitz.Rect, ...]) -> tuple[int, float]:
    return TextRectIndex.build(text_rects).score(target_rect)


def page_text_rects(page: fitz.Page) -> tuple[fitz.Rect, ...]:
    return page_bboxlog_rect_groups(page)[0]


def page_bboxlog_rect_groups(page: fitz.Page) -> tuple[tuple[fitz.Rect, ...], tuple[fitz.Rect, ...], tuple[fitz.Rect, ...]]:
    try:
        bboxlog = page.get_bboxlog()
    except Exception:
        return (), (), ()
    rects: list[fitz.Rect] = []
    image_rects: list[fitz.Rect] = []
    unsafe_vector_rects: list[fitz.Rect] = []
    for entry in bboxlog:
        kind = bboxlog_kind(entry)
        rect = bboxlog_rect(entry)
        if rect is None:
            continue
        if "text" in kind:
            rects.append(rect)
            continue
        if "image" in kind:
            image_rects.append(rect)
            continue
        if bboxlog_path_blocks_text_strip(kind, rect):
            unsafe_vector_rects.append(rect)
    return tuple(rects), tuple(image_rects), tuple(unsafe_vector_rects)


def bboxlog_text_rect(entry: object) -> fitz.Rect | None:
    if "text" not in bboxlog_kind(entry):
        return None
    return bboxlog_rect(entry)


def bboxlog_kind(entry: object) -> str:
    try:
        return str(entry[0]).strip().lower()
    except Exception:
        return ""


def bboxlog_rect(entry: object) -> fitz.Rect | None:
    try:
        value = entry[1]
    except Exception:
        return None
    try:
        rect = fitz.Rect(value)
    except Exception:
        return None
    return None if rect.is_empty else rect


def page_has_tiled_background_images_from_rects(
    page: fitz.Page,
    image_rects: tuple[fitz.Rect, ...],
    *,
    coverage_ratio_threshold: float = 0.65,
    min_image_count: int = 8,
    min_width_ratio: float = 0.60,
) -> bool:
    if len(image_rects) < min_image_count:
        return False
    page_area = max(rect_area(page.rect), 1.0)
    page_width = max(float(page.rect.width), 1.0)
    page_wide_rects = [
        rect & page.rect
        for rect in image_rects
        if not (rect & page.rect).is_empty and (rect & page.rect).width / page_width >= min_width_ratio
    ]
    if len(page_wide_rects) < min_image_count:
        return False
    covered_area = sum(rect_area(rect & page.rect) for rect in _merge_vertical_image_bands(page_wide_rects))
    return covered_area / page_area >= coverage_ratio_threshold


def _merge_vertical_image_bands(rects: list[fitz.Rect], *, y_tolerance: float = 1.0) -> list[fitz.Rect]:
    merged: list[fitz.Rect] = []
    for rect in sorted(rects, key=lambda value: (round(value.y0, 3), round(value.x0, 3))):
        if not merged:
            merged.append(fitz.Rect(rect))
            continue
        previous = merged[-1]
        if rect.y0 <= previous.y1 + y_tolerance:
            previous.include_rect(rect)
        else:
            merged.append(fitz.Rect(rect))
    return merged


def to_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default
