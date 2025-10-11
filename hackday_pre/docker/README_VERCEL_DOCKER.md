Deploying to Vercel from Docker (useful when you don't want to install vercel CLI on host)

Overview
- This helper image installs `vercel` CLI and allows you to mount the `vercel_client` folder and run `vercel --prod` inside a container.
- It expects an environment variable `VERCEL_TOKEN` set (obtain from Vercel dashboard -> Settings -> Tokens -> Create Token).

Build the helper image:
```powershell
cd docker
docker build -f Dockerfile.vercel_cli -t vercel-cli:local .
```

Deploy (non-interactive)
```powershell
# Example: deploy and set the project directory as /work
docker run --rm -it -v C:\Users\Taiga\B4_M2\Programs\Mystudy\1009_JPHacks\hackday_pre\vercel_client:/work -e VERCEL_TOKEN="<your_token>" vercel-cli:local sh -c "cd /work && vercel --prod --token $VERCEL_TOKEN --confirm"
```

Set environment variables on Vercel (interactive)
```powershell
# Example: add OPENAI_API_KEY to production env
docker run --rm -it -v C:\Users\Taiga\B4_M2\Programs\Mystudy\1009_JPHacks\hackday_pre\vercel_client:/work -e VERCEL_TOKEN="<your_token>" vercel-cli:local sh -c "cd /work && vercel env add OPENAI_API_KEY production --token $VERCEL_TOKEN"
```

Notes
- The container mounts the project and runs vercel inside it; VERCEL_TOKEN is required to authenticate non-interactively.
- For interactive login, omit --token and run `vercel login` inside the container (but token is recommended for CI-type deploys).
- After deploy, the CLI prints the assigned URL. Copy/paste it to test endpoints.
