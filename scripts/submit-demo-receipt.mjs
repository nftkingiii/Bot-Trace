import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { ethers } from "ethers";
import { createBotChainBlackboxClient, transactionUrl } from "../packages/botchain/blackboxClient.mjs";

const RPC_URL = process.env.BOTCHAIN_RPC_URL ?? "https://rpc.bohr.life";
const EXPECTED_CHAIN_ID = 968n;
const contractAddress = process.argv[2] ?? process.env.BOTTRACE_CONTRACT_ADDRESS;

if (!contractAddress) {
  throw new Error("Usage: node scripts/submit-demo-receipt.mjs <contract-address>");
}

const privateKey = await readPrivateKey();
const provider = new ethers.JsonRpcProvider(RPC_URL);
const network = await provider.getNetwork();

if (network.chainId !== EXPECTED_CHAIN_ID) {
  throw new Error(`Unexpected chain id ${network.chainId}; expected ${EXPECTED_CHAIN_ID}.`);
}

const wallet = new ethers.Wallet(privateKey, provider);
const dataPath = "apps/web/public/demo-receipt.json";
const data = JSON.parse(await readFile(dataPath, "utf8"));
const client = createBotChainBlackboxClient({ contractAddress });
const payload = client.prepareSubmitReceipt(data.receipt);
const contract = new ethers.Contract(contractAddress, payload.abi, wallet);
const tx = await contract.submitReceipt(...payload.args);

console.log(JSON.stringify({
  mode: "submit-sent",
  wallet: wallet.address,
  contractAddress,
  transactionHash: tx.hash
}, null, 2));

const receipt = await tx.wait(1);
data.receipt.chain.contractAddress = contractAddress;
data.proof = {
  transactionHash: tx.hash,
  blockNumber: receipt.blockNumber,
  blockHash: receipt.blockHash,
  explorerUrl: transactionUrl(payload.explorerUrl, tx.hash)
};
data.transactionResult = {
  mode: "submitted-botchain-testnet",
  transactionHash: tx.hash,
  payload,
  explorerUrl: transactionUrl(payload.explorerUrl, tx.hash),
  message: "Receipt submitted to BotTraceRegistry on BOT Chain testnet."
};

await writeFile(dataPath, JSON.stringify(data, null, 2));

console.log(JSON.stringify({
  mode: "submitted",
  contractAddress,
  transactionHash: tx.hash,
  blockNumber: receipt.blockNumber,
  explorerUrl: transactionUrl(payload.explorerUrl, tx.hash)
}, null, 2));

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
