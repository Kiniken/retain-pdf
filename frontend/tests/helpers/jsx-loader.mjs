// node --test 的 .jsx 转换钩子:esbuild 即时编译,组件可直接单测
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

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
