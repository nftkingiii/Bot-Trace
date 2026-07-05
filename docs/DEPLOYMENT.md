# Deployment Notes

## Local verification

```bash
npm test
npm run check
npm run demo
npm run dev
```

## BOT Chain testnet

```text
Network: BOT Chain Testnet
Chain ID: 968
RPC: https://rpc.bohr.life
Explorer: https://scan.bohr.life
Currency: BOT
```

## Contract

The registry contract is `contracts/BotTraceRegistry.sol`.

Main entry point:

```solidity
submitReceipt(
  string receiptId,
  bytes32 receiptHash,
  string agentId,
  bytes32 policyHash,
  uint256 costWei,
  string tool,
  string decision,
  string timestamp
)
```

## Current deployment status

BotTrace is deployed on BOT Chain testnet.

```text
Deployer: 0xC6CFa54eDA215a62fD5495A9B6555Bd85b6B7ddB
Registry contract: 0xb6F0efaB84835d52ca4F096EC5A673872d641003
Contract deploy transaction: 0xe5c785a6fc613702c88ba3ef6d359ca4fb3d0bd622ae61093b6664f729545c1c
Demo receipt ID: bottrace-demo-0001
Demo receipt hash: 7411080f39d199162256f356cc19a61892adfca8f774ccfdceca03df4884621a
Demo receipt transaction: 0xc9c15fcc932c26ed6199121b846eadd92b87b3604d25e351f85151b21bacdece
Demo receipt block: 15190810
```

Links:

- Contract: `https://scan.bohr.life/address/0xb6F0efaB84835d52ca4F096EC5A673872d641003`
- Receipt transaction: `https://scan.bohr.life/tx/0xc9c15fcc932c26ed6199121b846eadd92b87b3604d25e351f85151b21bacdece`

Read-back verification confirmed `receiptCount = 1` and the stored `receiptHash` matches the local demo receipt hash.

Repeat deployment steps:

1. Fund a test wallet from the BOT Chain faucet.
2. Compile and deploy `BotTraceRegistry.sol` to BOT Chain testnet with `npm run deploy:registry`, Hardhat, Foundry, Remix, or another EVM deployer.
3. Save the deployed address as `BOTTRACE_CONTRACT_ADDRESS`.
4. Run `npm run demo` again to regenerate the dashboard payload with the real contract address.
5. Submit a demo receipt transaction and record the transaction hash.
6. Update the README with the contract address and BOTScan transaction link.

## Payload helper

```bash
npm run demo
node scripts/prepare-submit.mjs
```

This prints the prepared `submitReceipt` payload for the generated demo receipt.

## Environment variables

```text
BOTTRACE_CONTRACT_ADDRESS=0x...
BOTCHAIN_RPC_URL=https://rpc.bohr.life
```
