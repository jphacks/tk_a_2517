Vercel AI SDK integration (example)

Goal

Use Vercel AI SDK (Vercel-managed model) as the MCP client in a Next.js route so you don't need to manage external LLM API keys yourself. When deployed on Vercel, the platform can automatically provide access to a model (via the `ai` package and Vercel environment), simplifying demo deployments.

What this example contains

- `next_chat_route.js` — Example Next.js route handler (app router) that creates an MCP client and streams text using the Vercel `ai` package. This mirrors the Qiita tutorial but shows where to plug in the CrowdRescue MCP server.

How to use

1. Create a Next.js app (if you don't have one):

   ```bash
   npx create-next-app@latest client
   cd client
   npm install ai @modelcontextprotocol/sdk
   ```

2. Copy `next_chat_route.js` into your Next.js project as `app/api/chat/route.js` (or `route.ts`).

3. Configure MCP SSE transport in the route (the example uses `http://localhost:3001/sse` for the MCP server running locally — change to your MCP server URL when deploying).

4. Deploy to Vercel. Vercel will provide model access; you can set `VERCEL_AI_MODEL` or use the defaults from Vercel AI.

Notes and caveats

- This file is an example/starting point. For production, verify CORS, authentication, and rate limits.
- The `ai` APIs evolve; use the Vercel docs if the API surface changes.
- When running locally (not on Vercel), you may still need an API key or local SDK configuration for the `ai` package.

References

- Qiita MCP tutorial: https://qiita.com/Sicut_study/items/e0fbbbf51cdd54d76b1a
- Vercel AI docs: https://vercel.com/docs/ai

