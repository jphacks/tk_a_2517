Vercel client deploy

This Next.js app contains the `app/api/chat/route.js` that uses the `ai` package. To deploy:

1. Create a Vercel project and connect this repository (or use the Vercel CLI).
2. Set project environment variables in Vercel:
   - OPENAI_API_KEY (or other provider key) — required for model calls
   - VERCEL_AI_MODEL (optional) — e.g., `gpt-4o-mini`
3. Push to `main` branch. The included GitHub Actions workflow will call Vercel CLI if you provide `VERCEL_TOKEN` as a repo secret.

Notes
- Do not commit secrets to the repo. Use Vercel project env settings or GitHub secrets.
- Deploying will incur model usage costs depending on the provider and model configured.
