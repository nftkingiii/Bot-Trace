const TESTNET_PROOF = {
  chainId: 968,
  contractAddress: "pending-bottrace-deploy",
  receiptTransaction: "pending-bottrace-submit",
  explorerUrl: "https://scan.bohr.life"
};

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

function explorerTransaction(hash) {
  if (!hash || String(hash).startsWith("pending")) return "https://scan.bohr.life/";
  return `https://scan.bohr.life/tx/${hash}`;
}

function explorerContract(address) {
  if (!address || String(address).startsWith("pending")) return "https://scan.bohr.life/";
  return `https://scan.bohr.life/address/${address}`;
}

function renderTimeline(receipt, transactionResult, proof) {
  const payload = transactionResult.payload ?? {};
  const transactionHash = proof?.transactionHash ?? transactionResult.transactionHash ?? TESTNET_PROOF.receiptTransaction;
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
      body: `${payload.functionName ?? "submitReceipt"} on ${payload.network ?? "BOT Chain Testnet"}; transaction ${shortHash(transactionHash, 12, 10)}.`,
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
  const { receipt, verification } = data;
  const transactionResult = data.transactionResult ?? data.deployResult ?? {};
  const payload = transactionResult.payload ?? {};
  const contractAddress = payload.contractAddress ?? receipt.chain.contractAddress ?? TESTNET_PROOF.contractAddress;
  const transactionHash = data.proof?.transactionHash ?? transactionResult.transactionHash ?? TESTNET_PROOF.receiptTransaction;
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

  setHref("contractLink", explorerContract(contractAddress));
  setHref("receiptTxLink", explorerTransaction(transactionHash));

  renderTimeline(receipt, transactionResult, data.proof);
  text("payloadJson", JSON.stringify({
    ...payload,
    proof: data.proof ?? TESTNET_PROOF
  }, null, 2));

  initScrollReveal();
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
    if (target.matches(".proof-stage, .workspace, .payload-panel")) {
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

loadDemo()
  .then(render)
  .catch((error) => {
    const integrity = document.getElementById("integrityState");
    text("integrityState", "Missing demo");
    integrity.classList.add("is-risk");
    text("receiptHash", error.message);
    text("payloadJson", error.stack ?? error.message);
  });
