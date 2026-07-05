# BotTrace Architecture

## Core idea

BotTrace turns agent actions into verifiable execution receipts. A receipt is a canonical JSON object with a deterministic hash. Private or bulky evidence can stay off-chain, while BOT Chain stores the receipt digest and enough metadata to make the action discoverable.

## Components

### Agent runtime

The agent runtime wraps high-risk operations:

- paid API calls
- MCP tool calls
- wallet signing
- contract deploys
- DEX or bridge interactions
- policy decisions

Before execution, the runtime checks policy. After execution, it creates a receipt and passes it to the BOT Chain adapter.

### Receipt core

`packages/core/receipt.mjs` owns:

- canonical JSON sorting
- SHA-256 hashing
- receipt creation
- integrity verification
- EVM contract argument conversion

### BOT Chain adapter

`packages/botchain/blackboxClient.mjs` prepares the `submitReceipt` payload for `BotTraceRegistry`. In local mode, it creates a deterministic mock transaction hash so the dashboard can be demoed before wallet signing is connected.

### Smart contract

`contracts/BotTraceRegistry.sol` exposes `submitReceipt` and stores receipt records keyed by `receiptId`. The stored value includes:

- receipt hash
- agent id
- policy hash
- cost
- tool
- decision
- timestamp
- submitter
- block number

This keeps on-chain state compact while preserving auditability.

### Dashboard

The dashboard presents the receipt as a replayable timeline:

1. intent captured
2. policy checked
3. tool called
4. receipt anchored

It also shows the prepared BOT Chain payload so operators can inspect the transaction-producing component.

## Next integrations

- Add Hardhat or Foundry deployment scripts for BOT Chain testnet.
- Connect a browser wallet for live `submitReceipt` calls.
- Read `ReceiptSubmitted` events from BOTScan or an RPC log query.
- Store large evidence blobs on IPFS, Walrus, or a simple object store.
- Add policy templates for spending caps and approved MCP servers.
