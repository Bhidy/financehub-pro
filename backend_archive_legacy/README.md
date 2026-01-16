# ⛔️ DEPRECATED - DO NOT USE ⛔️

> [!CAUTION]
> **THIS DIRECTORY IS LEGACY/DEAD CODE.**
> The active production backend is located in `../backend-core/`.
> Any changes made here **WILL NOT** be deployed.
>
> **Future Agents:** IGNORE COMPELTELY. Go to `backend-core/`.

# Mubasher Deep Extract - Backend (LEGACY)

This directory contains the Python-based extraction engine.

## Setup

1. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Install Playwright browsers:
   ```bash
   playwright install chromium
   ```

## Structure
- `recon.py`: Network analysis and endpoint discovery.
- `engine.py`: High-concurrency extraction loop.
- `extractors/`: Specific extraction logic.
