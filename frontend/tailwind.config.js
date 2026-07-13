/** @type {import('tailwindcss').Config} */
// 颜色/字体的唯一真值在 src/styles/tokens.css,这里只做引用。
// 注意:var() 形式的颜色不支持透明度修饰符(如 bg-accent/50),
// 需要半透明时用 tokens.css 里的 *-weak 变量或新增 token。
export default {
  content: [
    "./index.html",
    "./detail.html",
    "./reader.html",
    "./src/js/**/*.js",
    "./src/js/**/*.jsx",
    "./src/pages/**/*.js",
    "./src/pages/**/*.jsx",
    "./src/shared/**/*.js",
    "./src/partials/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        paper: "var(--paper)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        "accent-weak": "var(--accent-weak)",
        danger: "var(--danger)",
        "danger-weak": "var(--danger-weak)",
        ok: "var(--ok)",
        "ok-weak": "var(--ok-weak)",
        warn: "var(--warn)",
        "warn-weak": "var(--warn-weak)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(80, 66, 40, 0.08)",
        panel: "0 18px 48px rgba(37, 31, 20, 0.22)",
      },
    },
  },
  plugins: [],
};
