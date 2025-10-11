Vercel client scaffold

This minimal Next.js scaffold provides an API route that uses the Vercel AI SDK to act as an MCP client and call MCP servers via SSE.

Purpose
- Enable local verification of the pipeline: CrowdRescue `/scrape` -> Vercel AI SDK `app/api/chat` -> MCP server `mcp_todo` -> CrowdRescue `/api/tasks`.

Setup (local dev)
1. Install dependencies:
   ```powershell
   cd hackday_pre\vercel_client
   npm install
   ```
2. Start Next.js dev server:
   ```powershell
   npm run dev
   ```
3. Ensure `hackday_pre\mcp_todo` is running on port 3001 and CrowdRescue on 3003.
4. Test by POSTing to `http://localhost:3000/api/chat` with JSON body `{ "messages": [{ "role":"user","content":"Extract 3 action items from: ..." }] }`.

Additional utilities
- Verification route: `POST /api/verify` accepts JSON `{ "prompt": "...", "expected": "optional expected text" }` and returns `{ ok, model, output, pass }`.
- Test harness: a small Node script is provided at `scripts/verify_test.js`. Run it after `npm run dev` to exercise `/api/verify` locally.

Example (PowerShell):
```powershell
cd hackday_pre\vercel_client
npm install
npm run dev
# in another shell:
node scripts/verify_test.js
```

Cost & value considerations
- Vercel AI uses managed model infrastructure and may incur usage charges on deployment. For a demo at JPHacks, consider:
  - Using the local fallback in CrowdRescue (rule-based stepify) as the baseline.
  - Reserving Vercel AI calls for a small subset of premium flows (e.g., organizer-only summarization) to limit costs.
  - Precompute or cache AI outputs for repeated demos.

Next steps
- Deploy `vercel_client` to Vercel and set `VERCEL_AI_MODEL` if needed.
- Optionally, add authentication to the `app/api/chat` route for safer operation in production.
