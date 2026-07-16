import { createHash } from "node:crypto";
import { toContractRuntimeArgs } from "../core/receipt.mjs";

export const BOT_CHAIN_TESTNET = {
  name: "BOT Chain Testnet",
  chainId: 968,
  rpcUrl: "https://rpc.bohr.life",
  explorerUrl: "https://scan.bohr.life",
  nativeCurrency: "BOT"
};

export const BOT_CHAIN_MAINNET = {
  name: "BOT Chain Mainnet",
  chainId: 677,
  rpcUrl: "https://rpc.botchain.ai",
  explorerUrl: "https://scan.botchain.ai",
  nativeCurrency: "BOT"
};

export function createBotChainBlackboxClient(config = {}) {
  const network = {
    ...BOT_CHAIN_TESTNET,
    ...(config.network ?? {})
  };

  return {
    network,
    contractAddress: config.contractAddress ?? null,

    prepareSubmitReceipt(receipt) {
      const args = toContractRuntimeArgs(receipt);

      return {
        network: network.name,
        chainId: network.chainId,
        rpcUrl: network.rpcUrl,
        explorerUrl: network.explorerUrl,
        contractAddress: this.contractAddress,
        contract: "BotTraceRegistry",
        functionName: "submitReceipt",
        abi: [
          "function submitReceipt(string receiptId, bytes32 receiptHash, string agentId, bytes32 policyHash, uint256 costWei, string tool, string decision, string timestamp)"
        ],
        args: [
          args.receiptId,
          args.receiptHash,
          args.agentId,
          args.policyHash,
          args.costWei,
          args.tool,
          args.decision,
          args.timestamp
        ],
        namedArgs: args
      };
    },

    async submitReceipt(receipt) {
      const payload = this.prepareSubmitReceipt(receipt);

      if (!this.contractAddress) {
        return createMockTransactionResult(payload);
      }

      return {
        mode: "prepared",
        message: "Connect an EVM signer to send this BotTraceRegistry transaction on BOT Chain.",
        payload,
        explorerUrl: contractUrl(network.explorerUrl, this.contractAddress)
      };
    }
  };
}

function createMockTransactionResult(payload) {
  const hash = createHash("sha256")
    .update(JSON.stringify(payload.namedArgs))
    .digest("hex");

  return {
    mode: "mock-botchain-testnet",
    transactionHash: `0x${hash}`,
    payload,
    explorerUrl: null,
    message: "No BOTTRACE_CONTRACT_ADDRESS configured; generated a deterministic mock transaction hash for local demo."
  };
}

export function transactionUrl(explorerUrl, hash) {
  return `${explorerUrl.replace(/\/$/, "")}/tx/${hash}`;
}

export function contractUrl(explorerUrl, address) {
  return `${explorerUrl.replace(/\/$/, "")}/address/${address}`;
}
