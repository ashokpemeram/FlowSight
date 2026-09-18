# FlowSight Traffic Predictor

A React single-page traffic-volume forecast UI. Axios retrieves current weather from Open-Meteo and sends all 25 model inputs through a same-origin `/api/predict` proxy. The proxy calls the supplied traffic prediction API server-to-server, avoiding its missing browser CORS headers.

## Develop locally

Requires Node.js 18 or newer.

```powershell
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api/predict` to the model endpoint in development.

## Production build

```powershell
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000). `server.js` serves the compiled `dist` app and forwards only `/api/predict` to the model endpoint. This proxy is required because the supplied API does not return browser CORS headers.

## Deploy to Vercel

Deploy the repository normally as a Vite project. Vercel automatically deploys `api/predict.js` as the `/api/predict` serverless route, so no environment variable or rewrite rule is required. Redeploy after pulling these changes.

The app asks for browser location on demand and uses Minneapolis as a fallback. Date/time fields are created with `Date`, while weather values come from Open-Meteo.
"# FlowSight" 
