# BotTrace

Verifiable execution trails for autonomous AI agents on BOT Chain.

BotTrace is a flight recorder for AI agents. Every important agent action becomes a signed receipt containing the task intent, policy decision, tool call, cost, transaction hash, and result hash. The receipt body can stay off-chain while BOT Chain stores a tamper-evident digest and emits registry events for dashboards, monitors, and future dispute resolution.

## BOT Chain Challenge Fit

- Track: AI Agent
- Network: BOT Chain Testnet
- Chain ID: 968
- RPC: `https://rpc.bohr.life`
- Explorer: `https://scan.bohr.life`
- Contract source: `contracts/BotTraceRegistry.sol`

## BOT Chain Testnet Deployment

- Deployer: `0xC6CFa54eDA215a62fD5495A9B6555Bd85b6B7ddB`
- Registry contract: `0xb6F0efaB84835d52ca4F096EC5A673872d641003`
- Contract deploy transaction: `0xe5c785a6fc613702c88ba3ef6d359ca4fb3d0bd622ae61093b6664f729545c1c`
- Demo receipt ID: `bottrace-demo-0001`
- Demo receipt hash: `7411080f39d199162256f356cc19a61892adfca8f774ccfdceca03df4884621a`
- Demo receipt transaction: `0xc9c15fcc932c26ed6199121b846eadd92b87b3604d25e351f85151b21bacdece`
- Contract link: `https://scan.bohr.life/address/0xb6F0efaB84835d52ca4F096EC5A673872d641003`
- Receipt transaction link: `https://scan.bohr.life/tx/0xc9c15fcc932c26ed6199121b846eadd92b87b3604d25e351f85151b21bacdece`

Read-back verification confirmed `receiptCount = 1` and the stored `receiptHash` matches the local demo receipt hash.

## Why this matters

Autonomous agents are starting to call APIs, spend tokens, sign transactions, and trigger contract execution. When something goes wrong, users need more than a chat transcript. They need cryptographic receipts that show what the agent was allowed to do, what it actually did, and what evidence exists for the result.

BotTrace gives users, teams, and auditors a shared record of agent behavior without exposing private prompts or raw documents on-chain.

## Prototype scope

- Receipt canonicalization and SHA-256 hashing.
- Agent simulator that produces realistic BOT Chain execution receipts.
- BOT Chain adapter that prepares `BotTraceRegistry.submitReceipt(...)` payloads.
- Solidity smart contract for receipt registry storage and events.
- Web dashboard for replaying agent decisions and inspecting receipt integrity.
- BOTScan-ready transaction and contract links.

## Project layout

```text
apps/agent/              Agent simulator and demo runner
apps/web/                Dependency-light dashboard and local server
contracts/               Solidity BotTrace registry
packages/botchain/       BOT Chain adapter and payload preparation
packages/core/           Receipt schema, hashing, validation
scripts/                 Payload helper scripts
docs/                    Architecture, deployment, and product notes
tests/                   Node test suite
```

## Run locally

```bash
npm test
npm run demo
npm run dev
```

Then open `http://localhost:4173`.

## BOT Chain integration

BotTrace produces deterministic receipt hashes locally, prepares EVM contract call arguments, and anchors receipt metadata through `BotTraceRegistry` on BOT Chain testnet.

Required on-chain action:

```solidity
submitReceipt(receiptId, receiptHash, agentId, policyHash, costWei, tool, decision, timestamp)
```

The contract stores compact receipt records and emits `ReceiptSubmitted` events so dashboards and explorers can verify submitted receipts.

## Demo narrative

1. A user gives an autonomous agent a task.
2. The agent checks policy before spending or calling a tool.
3. The agent calls a BOT Chain product/tool such as DEX or explorer data.
4. BotTrace creates a signed execution receipt.
5. A hash of that receipt is anchored to BOT Chain.
6. The dashboard verifies that the visible receipt still matches the on-chain digest.

## Positioning

BotTrace is not a yield bot, oracle, or wallet. It is accountability infrastructure for the agent economy: a verifiable audit layer that any BOT Chain AI agent can use before it spends, trades, deploys, or calls paid services.
