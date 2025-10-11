Run the CrowdRescue + MCP + Vercel client stack inside Docker to avoid installing node_modules locally.

Prerequisites
- Docker and docker-compose installed on your machine.

Quick start
1. Copy the example env file and update keys if needed:

   cp docker/.env.example docker/.env

2. From the `hackday_pre` directory run:

   docker-compose -f docker/docker-compose.yml up --build

This will build three containers:
- crowdrescue -> http://localhost:3003
- mcp_todo    -> http://localhost:3001 (SSE)
- vercel_client -> http://localhost:3000

Notes
- To allow the Next.js `vercel_client` to call external model providers, set `OPENAI_API_KEY` in `docker/.env` before starting.
- The `vercel_client` image runs the production start after attempting a build. Watch logs for build errors if you change the app code.
