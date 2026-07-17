# Railway Backend Deployment

BotTrace uses Railway for its read-only API and Vercel for the static frontend. Wallet signatures stay in the browser. Do not add a private key to either deployment.

## Backend endpoints

- `GET /health` - deployment healthcheck; does not depend on RPC availability.
- `GET /api/config` - public BOT Chain and registry configuration.
- `GET /api/status` - current block and registry receipt count.
- `GET /api/receipts/:receiptId` - reads and returns a receipt directly from `BotTraceRegistry`.

## Railway variables

```text
BOTCHAIN_RPC_URL=https://rpc.botchain.ai
BOTCHAIN_CHAIN_ID=677
BOTCHAIN_NETWORK_NAME=BOT Chain Mainnet
BOTCHAIN_EXPLORER_URL=https://scan.botchain.ai
BOTTRACE_CONTRACT_ADDRESS=0xb6F0efaB84835d52ca4F096EC5A673872d641003
FRONTEND_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
```

Do not set `PORT`; Railway injects it. For multiple allowed frontend domains, use a comma-separated `FRONTEND_ORIGIN` value with no paths.

## Railway dashboard steps

1. Create a Railway project and choose **Deploy from GitHub repo**.
2. Select `nftkingiii/Bot-Trace` and deploy the `main` branch.
3. Add the variables above under the service's **Variables** tab.
4. Railway reads `railway.json`, runs `npm ci`, starts with `npm start`, and checks `/health`.
5. Open **Settings > Networking** and click **Generate Domain**.
6. Verify these URLs:

```text
https://YOUR-RAILWAY-DOMAIN.up.railway.app/health
https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/status
https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/receipts/bottrace-demo-0001
```

## Connect the Vercel frontend

1. Copy the generated Railway URL without a trailing slash.
2. In Vercel, open the BotTrace project and go to **Settings > Environment Variables**.
3. Add this variable to Production and Preview:

```text
BOTTRACE_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
```

4. Redeploy the frontend. The value is written into `runtime-config.js` during the static build, so existing deployments cannot see a newly added variable.
5. Return to Railway and confirm `FRONTEND_ORIGIN` exactly matches the Vercel production origin. Add preview origins as comma-separated values if previews also need API access.
6. Open the frontend. The wallet panel's **Backend** field should show `On-chain match` for the demo receipt.

## Local integration check

The frontend and API use the same local server by default:

```powershell
npm install
npm run dev
```

Open `http://localhost:4173`. To test against Railway locally, set `BOTTRACE_API_URL` and run `npm run build` before starting the server.
