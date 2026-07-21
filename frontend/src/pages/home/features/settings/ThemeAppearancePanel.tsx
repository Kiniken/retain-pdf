// 设置 · 外观：主题皮肤切换（注册表驱动，后期加皮肤无需改本文件）
// 真值：html[data-theme] + localStorage（shared/theme）

import { useEffect, useState } from "react";
import {
  getTheme,
  listThemesByGroup,
  setTheme,
  type ThemeId,
} from "../../../../shared/theme/theme.js";

export function ThemeAppearancePanel() {
  const [active, setActive] = useState<ThemeId>(() => getTheme());
  const groups = listThemesByGroup();

  useEffect(() => {
    setActive(getTheme());
  }, []);

  function choose(id: ThemeId) {
    setTheme(id);
    setActive(id);
  }

  return (
    <div className="theme-appearance" id="theme-appearance-panel">
      <p className="theme-appearance-hint">
        选择界面配色。立即生效，并记住本机选择。后期可继续添加更多皮肤。
      </p>
      {groups.map(({ group, label, themes }) => (
        <div key={group} className="theme-appearance-group">
          <h3 className="theme-appearance-group-title">{label}</h3>
          <div
            className="theme-appearance-grid"
            role="radiogroup"
            aria-label={`${label}主题`}
          >
            {themes.map((meta) => {
              const swatch = meta.preview;
              const selected = active === meta.id;
              return (
                <button
                  key={meta.id}
                  id={`theme-option-${meta.id}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`theme-option${selected ? " is-selected" : ""}`}
                  data-theme-option={meta.id}
                  data-theme-group={meta.group}
                  onClick={() => choose(meta.id)}
                >
                  <span
                    className="theme-option-swatch"
                    style={{ background: swatch.bg }}
                    aria-hidden="true"
                  >
                    <span
                      className="theme-option-swatch-paper"
                      style={{ background: swatch.paper }}
                    >
                      <span
                        className="theme-option-swatch-bar"
                        style={{ background: swatch.accent }}
                      />
                      <span
                        className="theme-option-swatch-dot"
                        style={{ background: swatch.danger }}
                      />
                    </span>
                  </span>
                  <span className="theme-option-copy">
                    <strong>{meta.label}</strong>
                    <span>{meta.description}</span>
                  </span>
                  {selected ? (
                    <span className="theme-option-check" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
