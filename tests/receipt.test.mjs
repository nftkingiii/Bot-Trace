import assert from "node:assert/strict";
import test from "node:test";
import { canonicalJson, createReceipt, sha256Hex, verifyReceipt } from "../packages/core/receipt.mjs";

const input = {
  agent: {
    id: "agent-1",
    name: "Test Agent",
    wallet: "0x0000000000000000000000000000000000000001",
    model: "test-model"
  },
  task: {
    user: "0x0000000000000000000000000000000000000002",
    intent: "Spend below the policy cap and record the result."
  },
  policy: {
    policyHash: sha256Hex("policy"),
    decision: "approved",
    rules: ["under_cap"],
    riskScore: 9,
    explanation: "Within cap."
  },
  toolCall: {
    tool: "mock-api",
    target: "https://example.test",
    method: "POST",
    request: { b: 2, a: 1 },
    response: { ok: true },
    costWei: 10,
    status: "ok"
  },
  chain: {
    network: "BOT Chain Testnet",
    chainId: 968,
    contractAddress: "0x0000000000000000000000000000000000000003",
    transactionHash: "0xabc",
    blockHash: "block"
  },
  evidence: [{ label: "fixture", uri: "memory://fixture" }]
};

test("canonicalJson sorts object keys recursively", () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, b: 3 } }), '{"a":{"b":3,"y":2},"z":1}');
});

test("createReceipt generates a verifiable receipt hash", () => {
  const receipt = createReceipt(input);
  assert.equal(verifyReceipt(receipt).ok, true);
  assert.equal(receipt.task.intentHash, sha256Hex(input.task.intent));
});

test("verifyReceipt detects tampering", () => {
  const receipt = createReceipt(input);
  const tampered = {
    ...receipt,
    policy: {
      ...receipt.policy,
      decision: "denied"
    }
  };
  assert.equal(verifyReceipt(tampered).ok, false);
});
