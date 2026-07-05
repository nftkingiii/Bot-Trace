import { writeFile } from "node:fs/promises";
import { createReceipt, sha256Hex, verifyReceipt } from "../../packages/core/receipt.mjs";
import { createBotChainBlackboxClient } from "../../packages/botchain/blackboxClient.mjs";

const BOTTRACE_CONTRACT_ADDRESS = process.env.BOTTRACE_CONTRACT_ADDRESS ?? null;

const demoReceipt = createReceipt({
  receiptId: "bottrace-demo-0001",
  timestamp: "2026-07-05T09:30:00.000Z",
  agent: {
    id: "agent-bot-ops-01",
    name: "BOT Ops Autopilot",
    wallet: "0xB07700000000000000000000000000000000A117",
    model: "gpt-5-botchain-policy-runner"
  },
  task: {
    user: "0xB077000000000000000000000000000000005AFE",
    intent: "Check BOT Chain DEX liquidity, approve the action only under the configured spend cap, and anchor the execution receipt for audit."
  },
  policy: {
    policyHash: sha256Hex("max_daily_spend_wei=1000000000000000000;allowed_tools=bot-dex,bot-scan,risk-api;human_review_above_wei=250000000000000000"),
    decision: "approved",
    rules: ["allowed_tool", "under_single_call_limit", "under_daily_budget"],
    riskScore: 18,
    explanation: "The agent used approved BOT Chain tools and stayed below the configured single-call threshold."
  },
  toolCall: {
    tool: "bot-dex-risk-check",
    target: "https://dex.botchain.ai/",
    method: "POST",
    request: {
      asset: "BOT",
      window: "24h",
      checks: ["liquidity", "volatility", "swap-route-health"]
    },
    response: {
      score: 31,
      level: "moderate",
      signals: ["normal liquidity movement", "no abnormal swap burst"]
    },
    costWei: 12000000000000000,
    status: "ok"
  },
  chain: {
    network: "BOT Chain Testnet",
    chainId: 968,
    contractAddress: BOTTRACE_CONTRACT_ADDRESS ?? "pending-bottrace-deploy",
    blockHash: "pending"
  },
  evidence: [
    {
      label: "policy snapshot",
      uri: "ipfs://demo/policy-snapshot.json"
    },
    {
      label: "tool response",
      uri: "ipfs://demo/risk-response.json"
    }
  ]
});

const client = createBotChainBlackboxClient({
  contractAddress: BOTTRACE_CONTRACT_ADDRESS
});

const transactionResult = await client.submitReceipt(demoReceipt);
const verification = verifyReceipt(demoReceipt);
const demoOutput = {
  receipt: demoReceipt,
  transactionResult,
  verification
};

await writeFile("apps/web/public/demo-receipt.json", JSON.stringify(demoOutput, null, 2));

console.log("BotTrace demo receipt generated.");
console.log(`Receipt ID: ${demoReceipt.receiptId}`);
console.log(`Receipt hash: ${demoReceipt.receiptHash}`);
console.log(`Transaction mode: ${transactionResult.mode}`);
console.log(`Integrity check: ${verification.ok ? "passed" : "failed"}`);
