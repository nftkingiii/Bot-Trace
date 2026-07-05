import { createHash, randomUUID } from "node:crypto";

export const RECEIPT_VERSION = "bottrace.receipt.v1";

export function canonicalJson(value) {
  return JSON.stringify(sortForCanonicalJson(value));
}

function sortForCanonicalJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortForCanonicalJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortForCanonicalJson(value[key]);
        return acc;
      }, {});
  }

  return value;
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashObject(value) {
  return sha256Hex(canonicalJson(value));
}

export function createReceipt(input) {
  const now = input.timestamp ?? new Date().toISOString();
  const receipt = {
    version: RECEIPT_VERSION,
    receiptId: input.receiptId ?? randomUUID(),
    timestamp: now,
    agent: {
      id: input.agent.id,
      name: input.agent.name,
      wallet: input.agent.wallet,
      model: input.agent.model
    },
    task: {
      intent: input.task.intent,
      intentHash: sha256Hex(input.task.intent),
      user: input.task.user
    },
    policy: {
      policyHash: input.policy.policyHash,
      decision: input.policy.decision,
      rules: input.policy.rules,
      riskScore: input.policy.riskScore,
      explanation: input.policy.explanation
    },
    toolCall: {
      tool: input.toolCall.tool,
      target: input.toolCall.target,
      method: input.toolCall.method,
      requestHash: hashObject(input.toolCall.request),
      responseHash: hashObject(input.toolCall.response),
      costWei: input.toolCall.costWei,
      status: input.toolCall.status
    },
    chain: {
      network: input.chain.network,
      chainId: input.chain.chainId,
      contractAddress: input.chain.contractAddress,
      blockHash: input.chain.blockHash
    },
    evidence: input.evidence.map((item) => ({
      label: item.label,
      uri: item.uri,
      hash: item.hash ?? hashObject(item)
    }))
  };

  return {
    ...receipt,
    receiptHash: hashObject(receipt)
  };
}

export function verifyReceipt(receipt) {
  const { receiptHash, ...body } = receipt;
  const recomputedHash = hashObject(body);
  return {
    ok: receiptHash === recomputedHash,
    expected: receiptHash,
    actual: recomputedHash
  };
}

export function toContractRuntimeArgs(receipt) {
  return {
    receiptId: receipt.receiptId,
    receiptHash: `0x${receipt.receiptHash}`,
    agentId: receipt.agent.id,
    policyHash: `0x${receipt.policy.policyHash}`,
    costWei: String(receipt.toolCall.costWei),
    tool: receipt.toolCall.tool,
    decision: receipt.policy.decision,
    timestamp: receipt.timestamp
  };
}
