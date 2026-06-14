from __future__ import annotations

import time

from services.rendering.layout.text_analysis import analyze_text
from services.rendering.layout.text_analysis import formula_texts_for_render
from services.rendering.layout.text_analysis import strip_formula_tokens
from services.rendering.layout.text_analysis import tokenize_text


def test_text_analysis_exposes_stable_formula_segments() -> None:
    text = r"根据Stewart展开，$^{70}$$ \phi_{\kappa} $指的是轨道，指数为$ \zeta_{\kappa} $。"

    analysis = analyze_text(text)

    assert [segment.body for segment in analysis.formula_segments] == [
        "^{70}",
        r"\phi_{\kappa}",
        r"\zeta_{\kappa}",
    ]
    assert analysis.formula_count == 3
    assert analysis.raw_math_count == 3
    assert "指的是轨道" in analysis.plain_text
    assert not any("指的是轨道" in segment.value for segment in analysis.formula_segments)


def test_text_analysis_handles_malformed_math_linearly() -> None:
    text = ("正文 $" + r"\lambda_{\parallel} " * 200 + " 后续正文") * 20
    started = time.perf_counter()

    analysis = analyze_text(text)

    assert time.perf_counter() - started < 0.5
    assert analysis.formula_count == 0
    assert "后续正文" in analysis.plain_text


def test_text_analysis_counts_unwrapped_latex_commands() -> None:
    analysis = analyze_text(r"ratio \frac{a}{b} remains in source")

    assert analysis.raw_math_count == 0
    assert analysis.latex_command_count == 1


def test_text_analysis_keeps_dense_inline_math_linear() -> None:
    dense = (
        r"其中 $\lambda_{\parallel}$ 和 $\lambda_{\perp}$ 分别表示层内和层间耦合，"
        r"$\Omega_{n+1,l}^{\parallel} = \kappa_{n+1,l} [(\sin \theta_n \cos \varphi_{nl}"
        r" \sin \Psi_n - \sin \varphi_{nl} \cos \Psi_n) \sigma_x +"
        r"(\sin \theta_n \sin \varphi_{nl} \sin \Psi_n + \cos \varphi_{nl} \cos \Psi_n)"
        r" \sigma_y + \cos \theta_n \sin \Psi_n \sigma_z]$。"
    )
    started = time.perf_counter()

    analysis = analyze_text(dense)

    assert time.perf_counter() - started < 0.5
    assert len(analysis.inline_math_segments) == 3
    assert analysis.has_complex_inline_math
    assert r"\sigma_x" in analysis.formula_segments[-1].body


def test_text_analysis_compat_helpers_use_same_contract() -> None:
    text = r"文字 $x_i$ [[FORMULA_12]] <f1-abc/>"

    assert tokenize_text(text) == [token.value for token in analyze_text(text).tokens]
    assert strip_formula_tokens(text).strip() == "文字"
    assert formula_texts_for_render(text, [{"formula_text": "y_j"}]) == [
        "y_j",
        "x_i",
        "[[FORMULA_12]]",
        "<f1-abc/>",
    ]
