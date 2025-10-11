MCP Todo Server (minimal)

This folder contains a minimal MCP server that exposes an SSE transport for MCP clients and a single tool `addTasks` which will POST tasks to the CrowdRescue demo server at `http://localhost:3003/api/tasks`.

Quick start:

1. cd mcp_todo
2. npm install
3. npm run dev

Then, configure your MCP client (Cursor/Windsurf/Next.js ai-sdk) to use SSE transport at `http://localhost:3001/sse` and call the `addTasks` tool when needed.

Notes:
- This is a minimal scaffold used to demonstrate MCP tooling integration with CrowdRescue. Adjust CORS/host/ports for your environment.
 
Tools provided
- `addTasks`: add arbitrary tasks to CrowdRescue by POSTing to `/api/tasks`.
- `scrapeAndStepify`: fetch a URL using CrowdRescue's `/scrape`, attempt to call a local Next.js route at `http://localhost:3000/api/chat` (Vercel AI SDK) to refine/extract tasks, fall back to rule-based splitting, and finally add tasks to the specified room.

Note: For `scrapeAndStepify` to use a Vercel-managed model, deploy the Next.js `app/api/chat/route` that uses the Vercel `ai` SDK, or run a local equivalent. If the AI route is unavailable, the tool will fall back to simple sentence splitting.
