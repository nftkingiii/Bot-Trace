import { readFile } from "node:fs/promises";
import { createBotChainBlackboxClient } from "../packages/botchain/blackboxClient.mjs";

const receiptPath = process.argv[2] ?? "apps/web/public/demo-receipt.json";
const body = JSON.parse(await readFile(receiptPath, "utf8"));
const client = createBotChainBlackboxClient({
  contractAddress: process.env.BOTTRACE_CONTRACT_ADDRESS
});

console.log(JSON.stringify(client.prepareSubmitReceipt(body.receipt), null, 2));
