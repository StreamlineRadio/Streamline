# CONTRIBUTING.md Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write a `CONTRIBUTING.md` at the repo root that guides core contributors through setup, code style, submitting changes, the DCO sign-off requirement, and the AI contribution policy.

**Architecture:** A single markdown file at the repo root. No code changes. No tests. Commit it.

**Tech Stack:** Markdown, Git DCO (`git commit -s`)

---

### Task 1: Write CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create the file with the following content**

```markdown
# Contributing to Streamline

Thanks for your interest in contributing! Streamline is a pnpm monorepo — read through this guide before opening a PR.

---

## Getting Started

**Prerequisites:**

- Node 24 — use [nvm](https://github.com/nvm-sh/nvm) with the `.nvmrc` in the repo root (`nvm use`)
- pnpm 10.4.1 or later — `npm install -g pnpm`

**Install dependencies:**

```bash
pnpm install
```

**Rebuild native modules against Electron's Node ABI:**

```bash
pnpm --filter streamline-electron rebuild
```

This step is required because Electron bundles its own Node runtime. Native modules (like `better-sqlite3`) must be compiled against that ABI, not the system Node. If you skip this step the app will fail to start with a "was compiled against a different Node.js version" error.

**Start the development environment:**

```bash
pnpm dev
```

This starts the SvelteKit UI (port 5173) and Electron in parallel. Electron waits for the UI dev server to be ready before launching.

---

## Project Structure

| Package | Purpose |
|---|---|
| `packages/ui` | SvelteKit app — all UI, Svelte 5 with runes |
| `packages/electron` | Electron main process — window management, encoding, streaming |
| `packages/shared` | Shared TypeScript types and IPC channel definitions |
| `packages/modules` | Built-in modules (deck, queue, mic, encoders, etc.) |
| `packages/audio-worklet` | AudioWorklet processors (compiled separately, run in their own context) |

---

## Code Style

Prettier and ESLint are configured per-package. Before submitting:

```bash
pnpm lint    # ESLint across all packages
pnpm check   # svelte-check + TypeScript type checking
```

Formatting is enforced by the linter. Don't spend time on manual formatting debates — just run `pnpm lint --fix` and commit.

---

## Submitting Changes

- Branch off `main`
- Keep commits focused — one logical change per commit
- No issue required before opening a PR
- Your PR description should explain **what** changed and **why**

---

## Licensing

Streamline is dual-licensed:

- **AGPLv3** (default) — free for everyone. Use it, modify it, share it. If you build something on top of Streamline and distribute it, your changes must also be open source under AGPLv3.
- **Commercial license** — for cases where someone is making money using Streamline but can't or doesn't want to comply with AGPLv3 (e.g. closed-source integrations, OEM bundling, internal modifications at a commercial radio station).

The spirit of this model: Streamline isn't about extracting money from hobbyists or open-source projects — AGPLv3 covers those for free. The commercial license exists specifically for situations where someone profits from this project. In that case, it's fair to see something in return for the work that went into it.

**Plugin authors:** plugins that only use the public module API are not considered derivatives and don't need a commercial license. Plugins that fork or bundle Streamline internals are derivatives and must comply with AGPLv3 or obtain a commercial license.

---

## Developer Certificate of Origin (DCO)

Because Streamline uses a dual-license model, every contribution needs a DCO sign-off. This grants the project the right to include your contribution under both the AGPLv3 and commercial license terms.

Add a `Signed-off-by` line to every commit:

```bash
git commit -s -m "your commit message"
```

This adds:

```
Signed-off-by: Your Name <your@email.com>
```

By signing off, you certify that:

1. The contribution is your own work, or you have the right to submit it.
2. You grant the project owner the right to use your contribution under the commercial license terms in addition to AGPLv3.

This is based on the [Developer Certificate of Origin v1.1](https://developercertificate.org/).

**PRs with unsigned commits will not be merged.**

---

## AI Contributions

Using AI tools to help write code is fine. A few rules:

- **Disclose AI use in your PR description.** Describe what you wrote yourself and what the AI generated or significantly assisted with.
- **No fully automated submissions.** PRs must involve a human who has reviewed, understood, and tested the code. A PR that is entirely AI-generated with no meaningful human involvement will be closed.
- **You are responsible for everything you submit**, regardless of how it was produced. If the AI wrote something incorrect, insecure, or misaligned with the project — that's on you to catch before opening the PR.
```

- [ ] **Step 2: Verify the file looks correct**

```bash
cat CONTRIBUTING.md
```

Read through and confirm all 7 sections are present and render correctly.

- [ ] **Step 3: Commit**

```bash
git add CONTRIBUTING.md
git commit -s -m "docs: Add CONTRIBUTING.md"
```