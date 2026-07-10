import sys
from pathlib import Path


REPO_SCRIPTS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_SCRIPTS_ROOT))


from services.translation.services.quality import review_translation_batch
from services.translation.services.quality import review_translation_item
from services.translation.services.terms import GlossaryEntry
from services.translation.workflow.phases.repair import _fast_agent_repair_limit


def _body_item(item_id: str, source_text: str, **overrides) -> dict:
    item = {
        "item_id": item_id,
        "block_type": "text",
        "metadata": {"structure_role": "body"},
        "translation_unit_protected_source_text": source_text,
    }
    item.update(overrides)
    return item


def test_quality_checks_collect_placeholder_and_english_issues() -> None:
    item = _body_item(
        "p001-b001",
        (
            "The self-consistent field procedure computes the molecular orbitals <f1-abc/> before "
            "the final energy is evaluated for the system."
        ),
    )

    report = review_translation_batch(
        [item],
        {
            "p001-b001": {
                "decision": "translate",
                "translated_text": (
                    "The self-consistent field procedure computes the molecular orbitals <f2-def/> before "
                    "the final energy is evaluated for the system."
                ),
            }
        },
    )

    kinds = {issue.kind for issue in report.issues}
    assert report.has_errors
    assert "english_residue" in kinds
    assert "unexpected_placeholder" in kinds
    assert "placeholder_inventory_mismatch" in kinds


def test_quality_checks_collect_glossary_issues() -> None:
    item = _body_item(
        "p002-b003",
        "The SCF cycle is initialized from Hartree-Fock orbitals and then iterated.",
    )

    report = review_translation_item(
        item,
        {
            "decision": "translate",
            "translated_text": "该循环由轨道初始化，然后迭代。",
        },
        glossary_entries=[
            GlossaryEntry(source="SCF", target="自洽场", level="preferred"),
            GlossaryEntry(source="Hartree-Fock", target="Hartree-Fock", level="preserve", match_mode="case_insensitive"),
        ],
    )

    glossary_issues = [issue for issue in report.issues if issue.kind == "glossary_term_missing"]
    assert [issue.details["source"] for issue in glossary_issues] == ["Hartree-Fock", "SCF"]


def test_quality_allows_fast_path_short_non_body_empty_translation() -> None:
    item = {
        "item_id": "p004-b002",
        "block_type": "text",
        "block_kind": "text",
        "layout_role": "caption",
        "semantic_role": "metadata",
        "raw_block_type": "figure_title",
        "normalized_sub_type": "figure_caption",
        "policy_translate": True,
        "translation_unit_protected_source_text": "A",
    }

    report = review_translation_item(
        item,
        {
            "decision": "keep_origin",
            "translated_text": "",
            "final_status": "kept_origin",
            "translation_diagnostics": {
                "route_path": ["block_level", "fast_path_keep_origin"],
                "fallback_to": "keep_origin",
                "degradation_reason": "short_non_body_label",
                "final_status": "kept_origin",
            },
        },
    )

    assert not report.has_errors
    assert report.issues == []


def test_quality_still_blocks_body_empty_translation() -> None:
    item = _body_item(
        "p002-b005",
        "To enhance ROS generation, various strategies have been developed to mitigate hypoxia.",
    )

    report = review_translation_item(
        item,
        {
            "decision": "translate",
            "translated_text": "",
        },
    )

    assert report.has_errors
    assert [issue.kind for issue in report.issues] == ["empty_translation"]


def test_long_english_residue_span_skips_data_dense_nmr_segments() -> None:
    from services.translation.llm.validation.english_residue import _has_long_english_residue_span

    # NMR 谱线数据数字密集,是合法保留的数据而非未译散文
    nmr = (
        "NMR (CDCl3, 400 MHz): delta = 7.90 (s, 1H), 7.55 (d, J=8.5 Hz, 1H), "
        "7.49 (t, J=8.0 Hz, 1H), 6.64 (d, J=7.5 Hz, 1H), 4.20 (s, 2H), 3.03 (s, 3H)"
    )
    assert not _has_long_english_residue_span(nmr)
    # 真正的英文散文残留仍然要抓
    prose = "the reaction mixture was stirred at room temperature for several hours before the product was isolated by filtration"
    assert _has_long_english_residue_span(prose)


def test_agent_repair_skips_items_already_repaired_in_flight() -> None:
    from services.translation.services.agents.repair_pipeline import _already_repaired_in_flight

    repaired = {
        "item_id": "p009-b008",
        "translated_text": "已修复的译文",
        "translation_diagnostics": {"degradation_reason": "typst_math_repaired"},
    }
    assert _already_repaired_in_flight(repaired)
    fresh = {"item_id": "p001-b001", "translated_text": "正常译文", "translation_diagnostics": {}}
    assert not _already_repaired_in_flight(fresh)


def test_fast_agent_repair_only_runs_with_blocking_items() -> None:
    # 任务干净时不再按篇幅跑警告级候选
    assert _fast_agent_repair_limit(payload_size=5000, blocking_untranslated_count=0) == 0
    assert _fast_agent_repair_limit(payload_size=5000, blocking_untranslated_count=3) == 3
