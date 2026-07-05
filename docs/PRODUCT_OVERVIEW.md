# Product Overview

## Project name

BotTrace

## One-liner

Verifiable execution trails for autonomous AI agents on BOT Chain.

## Problem

AI agents are beginning to spend funds, call paid APIs, sign transactions, and operate blockchain tools. Today, users often cannot prove what an agent was asked to do, which policy approved the action, what tool was called, how much it cost, or whether the visible result matches the original execution.

## Solution

BotTrace creates cryptographic receipts for agent actions and anchors their hashes on BOT Chain testnet. The receipt trail helps users audit agent behavior, teams debug failures, and future protocols resolve disputes.

## Current status

- Receipt generation with `npm run demo`.
- Receipt verification in the dashboard.
- Prepared `BotTraceRegistry.submitReceipt(...)` payload.
- Solidity registry contract in `contracts/BotTraceRegistry.sol`.
- BOT Chain adapter in `packages/botchain/blackboxClient.mjs`.
- Deployed BOT Chain testnet registry: `0xb6F0efaB84835d52ca4F096EC5A673872d641003`.
- Submitted demo receipt transaction: `0xc9c15fcc932c26ed6199121b846eadd92b87b3604d25e351f85151b21bacdece`.

## Product strengths

- Deterministic receipt hashing.
- Compact on-chain receipt registry.
- Dashboard replay for intent, policy, tool call, and anchoring state.
- Useful for agent wallets, paid APIs, MCP tools, DeFi agents, and DePIN automation.
- EVM-native contract entry point for anchoring receipts on BOT Chain.
