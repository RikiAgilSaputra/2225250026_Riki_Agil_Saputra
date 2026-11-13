// Supabase Edge Function entry point (Deno). Deploy: npm run api:deploy (see docs/DEPLOYMENT.md).
import { app } from "./app.ts";

Deno.serve(app.fetch);
