---
description: How to deploy the backend to Hetzner production safely (Nuclear Option).
---

# Deploy Backend to Hetzner (Immutable Strategy)

This workflow enforces the "Nuclear" immutable deployment strategy to prevent state drift and caching issues.

## 1. Prerequisites
- SSH Access to Hetzner (Root)
- `scripts/restore_production.exp` exists locally

## 2. Execute Deployment
Run the automated expect script which handles:
- Stopping all containers
- Pruning Docker system (images, volumes, networks)
- Pulling fresh code
- Rebuilding with `CACHEBUST` (CPU-only PyTorch)
- Restarting services (Backend + Caddy)

```bash
# Wait 10s before auto-running to allow user to check args
# This script is the MANDATORY fix for "stale code" or "false success" deployments.
./scripts/restore_production.exp 46.224.223.172 'StartaProd2026!'
```
// turbo-all

## 3. Verify Deployment
After the script completes, verify SSL and Logic.

```bash
python3 scripts/verify_full_system.py
```
