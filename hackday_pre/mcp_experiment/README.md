MCP Experiment

Minimal MCP experiment with two endpoints:

- GET /mcp/fetch?url=...&apiKey=devkey123
  - Returns a naive HTML->text conversion as { markdown }
- POST /mcp/stepify (header x-api-key: devkey123)
  - Body: { text: '...' }
  - Returns: { tasks: [...] }

How to run:

1. cd hackday_pre/mcp_experiment
2. npm install
3. MCP_API_KEY=devkey123 npm start

Then open http://localhost:3001

Notes:
- This is a demo scaffold. For production, add input validation, rate-limiting, auth, and proper HTML parsing.

How to run with Docker

1. cd hackday_pre/mcp_experiment
2. docker build -t mcp-experiment .
3. docker run -p 3001:3001 -e MCP_API_KEY=devkey123 mcp-experiment

Or with docker-compose:

1. cd hackday_pre/mcp_experiment
2. docker-compose up --build

Notes:
- The default API key in dev is `devkey123`. Change it by setting the `MCP_API_KEY` env var.

Frontend demo pages:

- Management UI: http://localhost:3001/management.html
- Participant UI: http://localhost:3001/participant.html?room=room-XXXXX

These pages use Socket.IO for real-time updates. If running behind Docker, map port 3001.
