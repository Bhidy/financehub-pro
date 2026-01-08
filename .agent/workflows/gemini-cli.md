---
description: How to use Gemini CLI for AI-assisted development
---

# Gemini CLI Workflow

## What is Gemini CLI?
Gemini CLI is an official Google open-source tool that brings Gemini AI directly into your terminal. It can read your entire codebase, answer questions, generate code, and execute commands.

## Prerequisites
- Gemini CLI is installed globally: `npm install -g @google/gemini-cli`
- You have authenticated (run `gemini` once and follow the prompts to log in with Google)

## Basic Usage

### Start an Interactive Session
// turbo
```bash
cd /Users/home/Documents/Info\ Site/mubasher-deep-extract && gemini
```

### Ask a Question (Non-Interactive)
```bash
gemini -p "Explain what frontend/lib/api.ts does"
```

## Example Use Cases

### 1. Understand Code
```
> Explain the data flow from backend/api.py to frontend/components/Screener.tsx
```

### 2. Debug an Issue
```
> Analyze ingestion.log and tell me why the COMI ticker failed
```

### 3. Generate Code
```
> Create a new API endpoint in hf-space/app/api/v1/endpoints that returns mutual fund performance data
```

### 4. Refactor
```
> Refactor FundsTable.tsx to use TanStack Table v8 patterns
```

## Context File
The `GEMINI.md` file at the project root provides context to the CLI. You can edit this file to update project rules or add new information that the AI should know.

## Tips
- Use `/help` in an interactive session to see available commands
- Use `/sandbox` to run commands in a safe Docker container
- The CLI respects `.gitignore` when reading the codebase
