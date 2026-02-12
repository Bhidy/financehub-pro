---
description: How to deploy the backend to Hetzner production using the Smart Deployment protocol.
---

# Deploy Backend to Hetzner (Smart Strategy)

This workflow uses the "Smart Deployment" protocol (`scripts/deploy_smart.sh`) to safely and quickly update the backend service.

## 1. Prerequisites
- SSH Access to Hetzner (Root)
- `scripts/deploy_smart.sh` exists locally
- You have committed your changes (the script pushes to git)

## 2. Execute Deployment
Run the automated smart deployment script which handles:
- Pushing local changes to GitHub
- SSHing into the server
- Pulling the latest code
- Rebuilding only changed layers
- Rolling update of the `backend` service

```bash
# Wait 10s before auto-running to allow user to check args
./scripts/deploy_smart.sh
```
// turbo-all

## 3. Verify Deployment
After the script completes, verify SSL and Logic using the 7-layer verification script.

```bash
python3 scripts/verify_live_7layer.py
```
