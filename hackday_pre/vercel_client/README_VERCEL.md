Vercel deployment notes

This app (`vercel_client`) is a Next.js App Router project configured to run on Vercel.

Required environment variables (examples):
- VERCEL_AI_MODEL (optional) — when deploying on Vercel to use Vercel-managed model
- OPENAI_API_KEY (optional) — fallback if Vercel AI not used
- HUGGINGFACE_API_TOKEN (optional) — if you choose Hugging Face Inference API

Recommended steps (CLI):
1. Install Vercel CLI and login:
   npm i -g vercel
   vercel login

2. From project root (this repo), deploy the vercel_client folder:
   cd vercel_client
   vercel --prod

3. Set environment variables via the Vercel dashboard or CLI:
   # example using vercel env add
   vercel env add VERCEL_AI_MODEL production
   vercel env add OPENAI_API_KEY production
   vercel env add HUGGINGFACE_API_TOKEN production

Notes:
- When deployed on Vercel, if `VERCEL_AI_MODEL` is set and Vercel provides the `ai` package, the `app/api/chat` route will use it. Otherwise it will fall back to OpenAI (requires `OPENAI_API_KEY`).
- Protect keys and do not commit them to source control.

Troubleshooting:
- If you see build errors about native modules, ensure any server-only dependencies are not imported at module top-level in files used by Next.js routes. Use dynamic imports where necessary.
