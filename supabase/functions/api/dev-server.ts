// Local development server on Node (no Deno needed): npm run api:dev → http://localhost:8000/api/v1/health
// Reads DATABASE_URL etc. from .env.local. The web app's dev server proxies /api to this port.
import { serve } from "@hono/node-server";
import { app } from "./app.ts";

const port = Number(process.env.PORT ?? 8000);
serve({ fetch: app.fetch, port }, () => console.log(`LangkahKu API on http://localhost:${port}/api/v1`));
