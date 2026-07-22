import test from "node:test";
import assert from "node:assert/strict";
import {
  clearStoredConversationId,
  conversationStorageKey,
  loadStoredConversationId,
  saveStoredConversationId,
} from "../src/js/reader/ai/conversation-store.ts";

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

test("conversationStorageKey prefers job over document", () => {
  assert.equal(
    conversationStorageKey({ jobId: "j1", documentId: "d1" }),
    "retainpdf.reader.ai.conversation.v1:job:j1",
  );
  assert.equal(
    conversationStorageKey({ documentId: "d1" }),
    "retainpdf.reader.ai.conversation.v1:doc:d1",
  );
});

test("save/load/clear conversation id via localStorage", () => {
  const mem = new MemoryStorage();
  globalThis.localStorage = mem;
  const scope = { jobId: "job-x" };
  clearStoredConversationId(scope);
  assert.equal(loadStoredConversationId(scope), "");
  saveStoredConversationId(scope, "conv-1");
  assert.equal(loadStoredConversationId(scope), "conv-1");
  clearStoredConversationId(scope);
  assert.equal(loadStoredConversationId(scope), "");
});
