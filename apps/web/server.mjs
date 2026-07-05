import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "apps", "web", "public");
const preferredPort = Number(process.env.PORT ?? 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, requestedPath));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const nextPort = Number(server.requestedPort ?? preferredPort) + 1;
    if (nextPort <= preferredPort + 10) {
      server.requestedPort = nextPort;
      server.listen(nextPort);
      return;
    }
  }

  throw error;
});

server.requestedPort = preferredPort;
server.listen(preferredPort, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : preferredPort;
  console.log(`BotTrace dashboard running at http://localhost:${port}`);
});
