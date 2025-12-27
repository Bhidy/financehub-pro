---
description: Deploy backend API to HuggingFace Spaces
---

# Backend Deployment Workflow

The backend is deployed on HuggingFace Spaces and auto-deploys on push.

## Prerequisites
- You are in the `hf-space/` directory
- Changes are committed

## Steps

// turbo-all

1. Navigate to the backend directory:
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract/hf-space
```

2. Check git status:
```bash
git status
```

3. Add and commit changes:
```bash
git add . && git commit -m "your commit message"
```

4. Push to HuggingFace Spaces:
```bash
git push origin main
```

5. Wait 2-3 minutes for HuggingFace to rebuild the Docker container

6. Verify the deployment is live:
```bash
curl https://bhidy-financehub-api.hf.space/health
```

7. Verify database connection:
```bash
curl https://bhidy-financehub-api.hf.space/api/v1/dashboard/summary
```

## Expected Response
```json
{"status":"healthy","database":"healthy","version":"1.0.0","environment":"production"}
```

## If Deployment Fails
1. Check HuggingFace Space logs: https://huggingface.co/spaces/Bhidy/financehub-api/logs
2. Verify DATABASE_URL secret is set in HF Space settings
3. Check Dockerfile for syntax errors

## Key URLs
- **API Base**: https://bhidy-financehub-api.hf.space
- **Health Check**: https://bhidy-financehub-api.hf.space/health
- **OpenAPI Docs**: https://bhidy-financehub-api.hf.space/docs
- **HF Space Dashboard**: https://huggingface.co/spaces/Bhidy/financehub-api
