import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { Contract, JsonRpcProvider, ZeroHash } from "ethers";

const root = join(process.cwd(), "apps", "web", "public");
const preferredPort = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";
const network = {
  name: process.env.BOTCHAIN_NETWORK_NAME ?? "BOT Chain Mainnet",
  chainId: Number(process.env.BOTCHAIN_CHAIN_ID ?? 677),
  rpcUrl: process.env.BOTCHAIN_RPC_URL ?? "https://rpc.botchain.ai",
  explorerUrl: process.env.BOTCHAIN_EXPLORER_URL ?? "https://scan.botchain.ai",
  currencySymbol: "BOT"
};
const contractAddress = process.env.BOTTRACE_CONTRACT_ADDRESS ?? "0xb6F0efaB84835d52ca4F096EC5A673872d641003";
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGIN ?? "http://localhost:4173,http://127.0.0.1:4173")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean)
);
const provider = new JsonRpcProvider(network.rpcUrl, network.chainId, { staticNetwork: true });
const registry = new Contract(contractAddress, [
  "function getReceipt(string receiptId) view returns (tuple(bytes32 receiptHash,string agentId,bytes32 policyHash,uint256 costWei,string tool,string decision,string timestamp,address submitter,uint256 blockNumber))",
  "function receiptCount() view returns (uint256)"
], provider);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  try {
    if (url.pathname === "/health") {
      return sendJson(response, 200, {
        ok: true,
        service: "bottrace-api",
        network: network.name,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname.startsWith("/api/")) {
      if (!applyCors(request, response)) return;
      if (request.method === "OPTIONS") {
        response.writeHead(204);
        return response.end();
      }
      if (request.method !== "GET") {
        return sendJson(response, 405, { error: "Method not allowed" });
      }

      if (url.pathname === "/api/config") {
        return sendJson(response, 200, {
          apiVersion: "bottrace.api.v1",
          network: { ...network, rpcUrl: undefined },
          contractAddress
        }, { "cache-control": "public, max-age=300" });
      }

      if (url.pathname === "/api/status") {
        const [blockNumber, receiptCount] = await Promise.all([
          provider.getBlockNumber(),
          registry.receiptCount()
        ]);
        return sendJson(response, 200, {
          ok: true,
          network: network.name,
          chainId: network.chainId,
          blockNumber,
          receiptCount: receiptCount.toString(),
          contractAddress
        }, { "cache-control": "public, max-age=5" });
      }

      const receiptMatch = url.pathname.match(/^\/api\/receipts\/([^/]+)$/);
      if (receiptMatch) {
        const receiptId = decodeURIComponent(receiptMatch[1]);
        if (!receiptId || receiptId.length > 160) {
          return sendJson(response, 400, { error: "Invalid receipt ID" });
        }

        const record = await registry.getReceipt(receiptId);
        if (record.receiptHash === ZeroHash) {
          return sendJson(response, 404, { error: "Receipt not found", receiptId });
        }

        return sendJson(response, 200, {
          receiptId,
          receiptHash: record.receiptHash,
          agentId: record.agentId,
          policyHash: record.policyHash,
          costWei: record.costWei.toString(),
          tool: record.tool,
          decision: record.decision,
          timestamp: record.timestamp,
          submitter: record.submitter,
          blockNumber: Number(record.blockNumber),
          contractAddress,
          explorerUrl: `${network.explorerUrl.replace(/\/$/, "")}/address/${contractAddress}`
        }, { "cache-control": "public, max-age=15" });
      }

      return sendJson(response, 404, { error: "API route not found" });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      return response.end("Method not allowed");
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, requestedPath));
    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      return response.end("Forbidden");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      path: url.pathname,
      message: error.shortMessage ?? error.message
    }));
    if (url.pathname.startsWith("/api/")) {
      return sendJson(response, 502, { error: "BOT Chain RPC request failed" });
    }
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

function applyCors(request, response) {
  const origin = request.headers.origin?.replace(/\/$/, "");
  if (origin && !allowedOrigins.has(origin)) {
    sendJson(response, 403, { error: "Origin not allowed" });
    return false;
  }

  if (origin) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
  }
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "Content-Type");
  response.setHeader("access-control-max-age", "86400");
  return true;
}

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && !process.env.PORT) {
    const nextPort = Number(server.requestedPort ?? preferredPort) + 1;
    if (nextPort <= preferredPort + 10) {
      server.requestedPort = nextPort;
      server.listen(nextPort, host);
      return;
    }
  }
  throw error;
});

server.requestedPort = preferredPort;
server.listen(preferredPort, host, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : preferredPort;
  console.log(`BotTrace API listening on ${host}:${port}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
