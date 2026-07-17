import { BrowserProvider, Contract, formatEther, sha256, toUtf8Bytes } from "./ethers.min.js";

const MAINNET_PROOF = {
  chainId: 677,
  chainHex: "0x2a5",
  networkName: "BOT Chain Mainnet",
  currencySymbol: "BOT",
  rpcUrl: "https://rpc.botchain.ai",
  contractAddress: "0xb6F0efaB84835d52ca4F096EC5A673872d641003",
  receiptTransaction: "pending-bottrace-submit",
  explorerUrl: "https://scan.botchain.ai"
};

const REGISTRY_ABI = [
  "function submitReceipt(string receiptId, bytes32 receiptHash, string agentId, bytes32 policyHash, uint256 costWei, string tool, string decision, string timestamp)"
];

let demoData = null;
let browserProvider = null;
let connectedAccount = null;

async function loadDemo() {
  const response = await fetch("/demo-receipt.json");
  if (!response.ok) {
    throw new Error("Run `npm run demo` to generate the demo receipt.");
  }

  return response.json();
}

function text(id, value) {
  document.getElementById(id).textContent = value;
}

function setHref(id, value) {
  const element = document.getElementById(id);
  element.href = value;
  element.setAttribute("aria-disabled", "false");
}

function formatWei(value) {
  const bot = Number(value) / 1_000_000_000_000_000_000;
  return `${bot.toFixed(4)} BOT`;
}

function shortHash(value, start = 10, end = 8) {
  const input = String(value ?? "");
  if (input.length <= start + end + 3) return input;
  return `${input.slice(0, start)}...${input.slice(-end)}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => JSON.parse(canonicalJson(item))));
  }

  if (value && typeof value === "object") {
    const sorted = Object.keys(value).sort().reduce((result, key) => {
      result[key] = JSON.parse(canonicalJson(value[key]));
      return result;
    }, {});
    return JSON.stringify(sorted);
  }

  return JSON.stringify(value);
}

function hashReceiptBody(receipt) {
  const { receiptHash, ...body } = receipt;
  return sha256(toUtf8Bytes(canonicalJson(body))).slice(2);
}

function setWalletStatus(state, message) {
  const status = document.getElementById("walletState");
  status.dataset.state = state;
  status.textContent = state === "connected" ? "Connected" : state === "pending" ? "Transaction pending" : state === "success" ? "Receipt anchored" : state === "error" ? "Action required" : "Not connected";
  text("walletMessage", message);
}

async function ensureMainnet() {
  const ethereum = window.ethereum;
  const currentChainId = await ethereum.request({ method: "eth_chainId" });
  if (currentChainId.toLowerCase() === MAINNET_PROOF.chainHex) return;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MAINNET_PROOF.chainHex }]
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: MAINNET_PROOF.chainHex,
        chainName: MAINNET_PROOF.networkName,
        nativeCurrency: { name: "BOT", symbol: MAINNET_PROOF.currencySymbol, decimals: 18 },
        rpcUrls: [MAINNET_PROOF.rpcUrl],
        blockExplorerUrls: [MAINNET_PROOF.explorerUrl]
      }]
    });
  }
}

async function refreshWallet(account) {
  connectedAccount = account ?? null;
  const connectButton = document.getElementById("connectWallet");
  const anchorButton = document.getElementById("anchorReceipt");

  if (!connectedAccount) {
    connectButton.textContent = "Connect wallet";
    text("walletAddress", "No wallet connected");
    text("walletNetwork", MAINNET_PROOF.networkName);
    text("walletBalance", "-");
    anchorButton.disabled = true;
    setWalletStatus("idle", "Connect a browser wallet to prepare a new receipt.");
    return;
  }

  browserProvider = new BrowserProvider(window.ethereum);
  const network = await browserProvider.getNetwork();
  const balance = await browserProvider.getBalance(connectedAccount);
  const onMainnet = Number(network.chainId) === MAINNET_PROOF.chainId;

  connectButton.textContent = shortHash(connectedAccount, 6, 4);
  text("walletAddress", connectedAccount);
  text("walletNetwork", onMainnet ? MAINNET_PROOF.networkName : `Wrong network (${network.chainId})`);
  text("walletBalance", `${Number(formatEther(balance)).toFixed(4)} BOT`);
  anchorButton.disabled = !onMainnet || !demoData;
  setWalletStatus(onMainnet ? "connected" : "error", onMainnet ? "Wallet ready. Anchoring creates a fresh receipt and requests one transaction signature." : "Switch to BOT Chain mainnet to anchor a receipt.");
}

async function connectWallet() {
  if (!window.ethereum) {
    setWalletStatus("error", "No browser wallet was detected. Install MetaMask or another EVM wallet, then reload.");
    return;
  }

  const button = document.getElementById("connectWallet");
  button.disabled = true;
  try {
    await ensureMainnet();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    await refreshWallet(accounts[0]);
    document.getElementById("wallet").scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    setWalletStatus("error", error.code === 4001 ? "Wallet connection was cancelled." : (error.shortMessage ?? error.message));
  } finally {
    button.disabled = false;
  }
}

function createFreshReceipt(receipt) {
  const idPart = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const nextReceipt = structuredClone(receipt);
  nextReceipt.receiptId = `bottrace-${idPart}`;
  nextReceipt.timestamp = new Date().toISOString();
  nextReceipt.task.user = connectedAccount;
  nextReceipt.chain = {
    network: MAINNET_PROOF.networkName,
    chainId: MAINNET_PROOF.chainId,
    contractAddress: MAINNET_PROOF.contractAddress,
    blockHash: "pending"
  };
  nextReceipt.receiptHash = hashReceiptBody(nextReceipt);
  return nextReceipt;
}

async function anchorReceipt() {
  const button = document.getElementById("anchorReceipt");
  const txLink = document.getElementById("walletTxLink");
  button.disabled = true;
  txLink.hidden = true;

  try {
    await ensureMainnet();
    await refreshWallet(connectedAccount);
    const receipt = createFreshReceipt(demoData.receipt);
    const signer = await browserProvider.getSigner();
    const contract = new Contract(MAINNET_PROOF.contractAddress, REGISTRY_ABI, signer);

    setWalletStatus("pending", "Confirm the BotTraceRegistry transaction in your wallet.");
    const transaction = await contract.submitReceipt(
      receipt.receiptId,
      `0x${receipt.receiptHash}`,
      receipt.agent.id,
      `0x${receipt.policy.policyHash}`,
      String(receipt.toolCall.costWei),
      receipt.toolCall.tool,
      receipt.policy.decision,
      receipt.timestamp
    );

    txLink.href = explorerTransaction(MAINNET_PROOF.explorerUrl, transaction.hash);
    txLink.hidden = false;
    setWalletStatus("pending", `Transaction ${shortHash(transaction.hash)} submitted. Waiting for confirmation.`);
    const confirmation = await transaction.wait(1);
    setWalletStatus("success", `Receipt ${shortHash(receipt.receiptId, 12, 8)} anchored in block ${confirmation.blockNumber}.`);
    await refreshWallet(connectedAccount);
    document.getElementById("walletState").dataset.state = "success";
    document.getElementById("walletState").textContent = "Receipt anchored";
  } catch (error) {
    const message = error.code === 4001 || error.code === "ACTION_REJECTED" ? "Transaction signature was cancelled." : (error.shortMessage ?? error.reason ?? error.message);
    setWalletStatus("error", message);
  } finally {
    if (connectedAccount) {
      const network = await browserProvider.getNetwork().catch(() => null);
      button.disabled = !network || Number(network.chainId) !== MAINNET_PROOF.chainId;
    }
  }
}

function explorerTransaction(explorerUrl, hash) {
  const baseUrl = explorerUrl.replace(/\/$/, "");
  if (!hash || String(hash).startsWith("pending")) return `${baseUrl}/`;
  return `${baseUrl}/tx/${hash}`;
}

function explorerContract(explorerUrl, address) {
  const baseUrl = explorerUrl.replace(/\/$/, "");
  if (!address || String(address).startsWith("pending")) return `${baseUrl}/`;
  return `${baseUrl}/address/${address}`;
}

function renderTimeline(receipt, transactionResult, proof) {
  const payload = transactionResult.payload ?? {};
  const transactionHash = proof?.transactionHash ?? transactionResult.transactionHash ?? MAINNET_PROOF.receiptTransaction;
  const items = [
    {
      label: "Intent captured",
      body: receipt.task.intent,
      time: new Date(receipt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    },
    {
      label: "Policy checked",
      body: `${receipt.policy.decision} with risk score ${receipt.policy.riskScore}. ${receipt.policy.explanation}`,
      time: "policy"
    },
    {
      label: "Tool called",
      body: `${receipt.toolCall.method} ${receipt.toolCall.target}; request and response hashes recorded.`,
      time: "tool"
    },
    {
      label: "Receipt anchored",
      body: `${payload.functionName ?? "submitReceipt"} on ${payload.network ?? "BOT Chain Mainnet"}; transaction ${shortHash(transactionHash, 12, 10)}.`,
      time: "BOT Chain"
    }
  ];

  const list = document.getElementById("timeline");
  list.innerHTML = items
    .map(
      (item, index) => `
        <li>
          <span class="step-index">${String(index + 1).padStart(2, "0")}</span>
          <time>${escapeHtml(item.time)}</time>
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            <p>${escapeHtml(item.body)}</p>
          </div>
        </li>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(data) {
  demoData = data;
  const { receipt, verification } = data;
  const transactionResult = data.transactionResult ?? data.deployResult ?? {};
  const payload = transactionResult.payload ?? {};
  const contractAddress = payload.contractAddress ?? receipt.chain.contractAddress ?? MAINNET_PROOF.contractAddress;
  const transactionHash = data.proof?.transactionHash ?? transactionResult.transactionHash ?? MAINNET_PROOF.receiptTransaction;
  const explorerUrl = payload.explorerUrl ?? MAINNET_PROOF.explorerUrl;
  const integrity = document.getElementById("integrityState");

  text("integrityState", verification.ok ? "Verified" : "Mismatch");
  integrity.classList.toggle("is-risk", !verification.ok);
  text("receiptHash", receipt.receiptHash);
  text("policyDecision", receipt.policy.decision);
  text("riskScore", `${receipt.policy.riskScore}/100`);
  text("agentName", receipt.agent.name);
  text("toolCost", formatWei(receipt.toolCall.costWei));
  text("transactionMode", transactionResult.mode);
  text("toolName", receipt.toolCall.tool);
  text("receiptId", receipt.receiptId);
  text("agentWallet", receipt.agent.wallet);
  text("intentHash", receipt.task.intentHash);
  text("policyHash", receipt.policy.policyHash);
  text("contractHash", contractAddress);

  setHref("contractLink", explorerContract(explorerUrl, contractAddress));
  setHref("receiptTxLink", explorerTransaction(explorerUrl, transactionHash));

  renderTimeline(receipt, transactionResult, data.proof);
  text("payloadJson", JSON.stringify({
    ...payload,
    proof: data.proof ?? MAINNET_PROOF
  }, null, 2));

  initScrollReveal();
  document.getElementById("anchorReceipt").disabled = !connectedAccount;
}

function initScrollReveal() {
  const targets = [
    ...document.querySelectorAll([
      ".intro-band",
      ".section-heading",
      ".domain-grid article",
      ".guardrail-section",
      ".guardrail-grid article",
      ".proof-stage",
      ".wallet-panel",
      ".metrics article",
      ".workspace",
      ".payload-panel"
    ].join(","))
  ];

  if (!targets.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  targets.forEach((target, index) => {
    target.classList.add("reveal-on-scroll");
    target.style.setProperty("--reveal-delay", "0ms");
    if (target.matches(".proof-stage, .wallet-panel, .workspace, .payload-panel")) {
      target.dataset.reveal = "scale";
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: "0px 0px 35% 0px",
    threshold: 0
  });

  targets.forEach((target) => observer.observe(target));
}

document.getElementById("copyPayload").addEventListener("click", async () => {
  const payload = document.getElementById("payloadJson").textContent;
  await navigator.clipboard.writeText(payload);
  document.getElementById("copyPayload").textContent = "Copied";
  window.setTimeout(() => {
    document.getElementById("copyPayload").textContent = "Copy JSON";
  }, 1200);
});

document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("anchorReceipt").addEventListener("click", anchorReceipt);

if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", (accounts) => refreshWallet(accounts[0]));
  window.ethereum.on?.("chainChanged", () => refreshWallet(connectedAccount));
  window.ethereum.request({ method: "eth_accounts" })
    .then((accounts) => accounts[0] && refreshWallet(accounts[0]))
    .catch(() => {});
}

loadDemo()
  .then(render)
  .catch((error) => {
    const integrity = document.getElementById("integrityState");
    text("integrityState", "Missing demo");
    integrity.classList.add("is-risk");
    text("receiptHash", error.message);
    text("payloadJson", error.stack ?? error.message);
  });
