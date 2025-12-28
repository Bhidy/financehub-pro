---
description: Deploy backend API to HuggingFace Spaces
---

# Deploy Backend to HuggingFace Spaces

This workflow deploys the backend API to HuggingFace Spaces.

// turbo-all

## Steps

1. Navigate to hf-space directory:
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract/hf-space
```

2. Stage all changes:
```bash
git add -A
```

3. Commit changes (skip if nothing to commit):
```bash
git commit -m "deploy: $(date +%Y%m%d-%H%M%S)" || echo "Nothing to commit"
```

4. Push to HuggingFace:
```bash
git push origin main
```

5. Wait for deployment (60 seconds):
```bash
echo "Waiting 60 seconds for HuggingFace to rebuild..." && sleep 60
```

6. Verify health:
```bash
curl -s https://bhidy-financehub-api.hf.space/health | jq
```

## Notes

- HuggingFace Spaces takes 1-3 minutes to rebuild after push
- The `/health` endpoint returns version, database status, and environment
- If deployment fails, check logs at https://huggingface.co/spaces/Bhidy/financehub-api
