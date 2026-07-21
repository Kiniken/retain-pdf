// 主题注册表：后期加皮肤 = 追加一项 + 对应 CSS 文件。
// 组件只读 listThemes() / setTheme()，不要 hardcode 皮肤 id 列表。
// 设计：docs/theme-system/THEME_SYSTEM.md · ADDING_A_THEME.md

export const THEME_STORAGE_KEY = "retainpdf.theme";
export const DEFAULT_THEME_ID = "classic";

/** 设置页色块预览（与 CSS 皮肤主色一致，仅用于 UI 缩略） */
export type ThemePreview = {
  bg: string;
  paper: string;
  accent: string;
  ink: string;
  danger: string;
};

export type ThemeGroup = "light" | "dark" | "accent";

export type ThemeDefinition = {
  /** 与 html[data-theme] / 文件名 themes/<id>.css 一致 */
  id: string;
  label: string;
  description: string;
  /** 设置页分组 */
  group: ThemeGroup;
  /** 列表排序，越小越靠前 */
  order: number;
  preview: ThemePreview;
};

/**
 * 注册表真值。
 * 新增皮肤步骤见 docs/theme-system/ADDING_A_THEME.md
 */
export const THEME_REGISTRY: readonly ThemeDefinition[] = [
  {
    id: "classic",
    label: "经典",
    description: "黑白灰克制，默认观感",
    group: "light",
    order: 10,
    preview: {
      bg: "#f5f5f7",
      paper: "#ffffff",
      accent: "#1d1d1f",
      ink: "#1d1d1f",
      danger: "#ff3b30",
    },
  },
  {
    id: "jiangnan",
    label: "素纸",
    description: "冷石灰底 · 冷青绿强调（去土黄）",
    group: "accent",
    order: 20,
    preview: {
      bg: "#f1f0ed",
      paper: "#fbfaf8",
      accent: "#2a5f57",
      ink: "#1b1b1d",
      danger: "#c23b32",
    },
  },
  {
    id: "seacliff",
    label: "雾青",
    description: "冷灰蓝底 · 青灰强调",
    group: "accent",
    order: 30,
    preview: {
      bg: "#eef1f4",
      paper: "#f8f9fb",
      accent: "#2d5f6e",
      ink: "#1a1d21",
      danger: "#c23b32",
    },
  },
  {
    id: "night",
    label: "黛瓦夜色",
    description: "深底阅读 · 黛瓦墨黑",
    group: "dark",
    order: 40,
    preview: {
      bg: "#141618",
      paper: "#1e2226",
      accent: "#5aa88e",
      ink: "#e8e6e3",
      danger: "#e07068",
    },
  },
] as const;

export type ThemeId = (typeof THEME_REGISTRY)[number]["id"] | string;

const GROUP_LABEL: Record<ThemeGroup, string> = {
  light: "浅色",
  dark: "深色",
  accent: "意境",
};

export function themeGroupLabel(group: ThemeGroup): string {
  return GROUP_LABEL[group] || group;
}

export function listThemes(): ThemeDefinition[] {
  return [...THEME_REGISTRY].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function listThemesByGroup(): { group: ThemeGroup; label: string; themes: ThemeDefinition[] }[] {
  const order: ThemeGroup[] = ["light", "accent", "dark"];
  const map = new Map<ThemeGroup, ThemeDefinition[]>();
  for (const t of listThemes()) {
    const list = map.get(t.group) || [];
    list.push(t);
    map.set(t.group, list);
  }
  return order
    .filter((g) => (map.get(g) || []).length > 0)
    .map((group) => ({
      group,
      label: themeGroupLabel(group),
      themes: map.get(group) || [],
    }));
}

export function getThemeDefinition(id: string): ThemeDefinition | undefined {
  return THEME_REGISTRY.find((t) => t.id === id);
}

export function isThemeId(value: unknown): value is string {
  return typeof value === "string" && THEME_REGISTRY.some((t) => t.id === value);
}
