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

## BOT Chain mainnet

```text
Network: BOT Chain Mainnet
Chain ID: 677
RPC: https://rpc.botchain.ai
Explorer: https://scan.botchain.ai
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

## Current mainnet deployment

BotTrace is deployed on BOT Chain mainnet.

```text
Deployer: 0xC6CFa54eDA215a62fD5495A9B6555Bd85b6B7ddB
Registry contract: 0xb6F0efaB84835d52ca4F096EC5A673872d641003
Contract deploy transaction: 0xae1d8db6c24f3bce68acf38b7304026fc5efee546ed505e95d7144e60d2f8448
Demo receipt ID: bottrace-demo-0001
Demo receipt hash: 7411080f39d199162256f356cc19a61892adfca8f774ccfdceca03df4884621a
Demo receipt transaction: 0x985e0da4e2bb202cdb695a3f085f58b104f2031094096d8aba65319210ab306a
Demo receipt block: 16289943
```

Links:

- Contract: `https://scan.botchain.ai/address/0xb6F0efaB84835d52ca4F096EC5A673872d641003`
- Receipt transaction: `https://scan.botchain.ai/tx/0x985e0da4e2bb202cdb695a3f085f58b104f2031094096d8aba65319210ab306a`

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
BOTCHAIN_CHAIN_ID=968
BOTCHAIN_NETWORK_NAME=BOT Chain Testnet
BOTCHAIN_EXPLORER_URL=https://scan.bohr.life
```

For mainnet, set:

```text
BOTCHAIN_RPC_URL=https://rpc.botchain.ai
BOTCHAIN_CHAIN_ID=677
BOTCHAIN_NETWORK_NAME=BOT Chain Mainnet
BOTCHAIN_EXPLORER_URL=https://scan.botchain.ai
```
