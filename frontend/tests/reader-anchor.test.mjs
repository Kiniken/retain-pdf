import test from "node:test";
import assert from "node:assert/strict";
import { resolveReaderAnchor } from "../src/js/reader/page-config.js";
import { buildReaderPageUrl } from "../src/js/job/action-model.js";

test("resolveReaderAnchor 解析 page_idx/block_id,两者皆缺返回 null", () => {
  assert.deepEqual(resolveReaderAnchor({ search: "?job_id=j&page_idx=3&block_id=b-9" }), {
    pageIdx: 3,
    blockId: "b-9",
  });
  assert.deepEqual(resolveReaderAnchor({ search: "?page_idx=0" }), { pageIdx: 0, blockId: "" });
  assert.deepEqual(resolveReaderAnchor({ search: "?block_id=b-1" }), { pageIdx: null, blockId: "b-1" });
  assert.equal(resolveReaderAnchor({ search: "?job_id=j" }), null);
  assert.equal(resolveReaderAnchor({ search: "?page_idx=abc" }), null);
});

test("buildReaderPageUrl 透传锚点参数,page_idx=0 不丢失", () => {
  const url = new URL(buildReaderPageUrl("job-1", { pageIdx: 0, blockId: "b-intro-3" }));
  assert.equal(url.searchParams.get("job_id"), "job-1");
  assert.equal(url.searchParams.get("page_idx"), "0");
  assert.equal(url.searchParams.get("block_id"), "b-intro-3");
  const plain = new URL(buildReaderPageUrl("job-1"));
  assert.equal(plain.searchParams.get("page_idx"), null);
  assert.equal(plain.searchParams.get("block_id"), null);
});
