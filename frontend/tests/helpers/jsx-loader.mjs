// node --test 的 .jsx 转换钩子:esbuild 即时编译,组件可直接单测
//
// resolve 钩子(阶段 B 新增):shadcn/ui 组件源码(src/components/ui/**)和
// src/lib/utils.js 内部用 "@/..." 引用彼此(components.json 的 aliases 约定,
// esbuild 侧已在 scripts/build-js-bundle.mjs 用原生 alias 选项声明同一份映射)。
// node --test 走的是这个自定义 loader,不会读 jsconfig.json/esbuild alias——
// 裸跑会报 "Cannot find package '@/lib'"。这里补一个等价的 resolve 钩子,
// 把 "@/xxx" 映射到 <frontend>/src/xxx(无扩展名时依次尝试 .js/.jsx)。
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transform } from "esbuild";

const SRC_ROOT = new URL("../../src/", import.meta.url);
const RESOLVE_EXTENSIONS = [".js", ".jsx"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const basePath = fileURLToPath(new URL(specifier.slice(2), SRC_ROOT));
    const candidates = extname(basePath)
      ? [basePath]
      : RESOLVE_EXTENSIONS.map((ext) => `${basePath}${ext}`);
    const hit = candidates.find((candidate) => existsSync(candidate));
    if (hit) {
      return { url: pathToFileURL(hit).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const source = await readFile(new URL(url), "utf8");
    const { code } = await transform(source, {
      loader: "jsx",
      jsx: "automatic",
      format: "esm",
      sourcefile: url,
    });
    return { format: "module", source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
