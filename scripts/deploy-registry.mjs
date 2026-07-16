import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import solc from "solc";
import { ethers } from "ethers";

const RPC_URL = process.env.BOTCHAIN_RPC_URL ?? "https://rpc.bohr.life";
const EXPECTED_CHAIN_ID = BigInt(process.env.BOTCHAIN_CHAIN_ID ?? "968");
const NETWORK_NAME = process.env.BOTCHAIN_NETWORK_NAME ?? "BOT Chain Testnet";
const EXPLORER_URL = process.env.BOTCHAIN_EXPLORER_URL ?? "https://scan.bohr.life";

const privateKey = await readPrivateKey();
const provider = new ethers.JsonRpcProvider(RPC_URL);
const network = await provider.getNetwork();

if (network.chainId !== EXPECTED_CHAIN_ID) {
  throw new Error(`Unexpected chain id ${network.chainId}; expected ${EXPECTED_CHAIN_ID}.`);
}

const wallet = new ethers.Wallet(privateKey, provider);
const balance = await provider.getBalance(wallet.address);

if (balance === 0n) {
  throw new Error(`Wallet ${wallet.address} has no ${NETWORK_NAME} gas.`);
}

const { abi, bytecode } = await compileContract();
const factory = new ethers.ContractFactory(abi, bytecode, wallet);
const contract = await factory.deploy();
const deployTx = contract.deploymentTransaction();

console.log(JSON.stringify({
  mode: "deploy-sent",
  wallet: wallet.address,
  network: NETWORK_NAME,
  chainId: Number(network.chainId),
  transactionHash: deployTx.hash
}, null, 2));

const receipt = await deployTx.wait(1);
const address = await contract.getAddress();

console.log(JSON.stringify({
  mode: "deployed",
  wallet: wallet.address,
  contractAddress: address,
  transactionHash: deployTx.hash,
  blockNumber: receipt.blockNumber,
  explorerUrl: `${EXPLORER_URL.replace(/\/$/, "")}/address/${address}`
}, null, 2));

async function compileContract() {
  const source = await readFile("contracts/BotTraceRegistry.sol", "utf8");
  const input = {
    language: "Solidity",
    sources: {
      "BotTraceRegistry.sol": { content: source }
    },
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((item) => item.severity === "error") ?? [];

  if (errors.length) {
    throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
  }

  const contract = output.contracts["BotTraceRegistry.sol"].BotTraceRegistry;
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`
  };
}

async function readPrivateKey() {
  if (process.env.BOTTRACE_PRIVATE_KEY) {
    return process.env.BOTTRACE_PRIVATE_KEY.trim();
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const key = (await rl.question("")).trim();
  rl.close();

  if (!key) {
    throw new Error("Provide the burner private key on stdin or BOTTRACE_PRIVATE_KEY.");
  }

  return key;
}
