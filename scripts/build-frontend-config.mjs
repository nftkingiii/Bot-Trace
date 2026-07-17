import { writeFile } from "node:fs/promises";

const apiUrl = (process.env.BOTTRACE_API_URL ?? "").trim().replace(/\/$/, "");
const output = `window.BOTTRACE_CONFIG = ${JSON.stringify({ apiUrl })};\n`;

await writeFile("apps/web/public/runtime-config.js", output);
console.log(`Frontend API URL: ${apiUrl || "same origin / not configured"}`);
