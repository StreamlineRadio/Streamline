# CONTRIBUTING.md Design

**Date:** 2026-05-01  
**Status:** Approved

## Summary

A structured contributor guide for the Streamline core codebase. Covers environment setup, project structure, code style, submitting changes, DCO sign-off, and AI contribution policy.

## Scope

- Target audience: core contributors (people contributing to the Streamline app itself)
- Plugin/module authors are out of scope — plugins are external and not part of the official ecosystem
- Contribution process: relaxed (no issue required before opening a PR)

## Sections

### 1. Getting Started

Step-by-step from clone to running the app:

- Prerequisites: Node 24 (use `.nvmrc` / nvm), pnpm 10.4.1+
- `pnpm install`
- Gotcha: native modules must be rebuilt against Electron's Node ABI — `pnpm --filter streamline-electron rebuild`
- `pnpm dev` starts both SvelteKit (port 5173) and Electron in parallel

### 2. Project Structure

Brief map of the five packages so contributors know where to look:

| Package | Purpose |
|---|---|
| `packages/ui` | SvelteKit app — all UI, Svelte 5 with runes |
| `packages/electron` | Electron main process — window management, encoding, streaming |
| `packages/shared` | Shared TypeScript types and IPC channel definitions |
| `packages/modules` | Built-in modules (deck, queue, mic, encoders, etc.) |
| `packages/audio-worklet` | AudioWorklet processors (compiled separately, run in their own context) |

### 3. Code Style

- Prettier + ESLint configured per-package
- Run `pnpm lint` and `pnpm check` before submitting
- Formatting is enforced by the linter — no manual debates

### 4. Submitting Changes

- Branch off `main`
- Keep commits focused
- No issue required before opening a PR
- PR description should explain what changed and why

### 5. Licensing

Explain the dual-license model in plain, honest language:

- Streamline is free and open source under AGPLv3 — use it, modify it, share it
- A commercial license exists for businesses or individuals who profit from Streamline but can't or don't want to comply with AGPLv3 (e.g. closed-source integrations, OEM bundling, internal modifications at a commercial radio station)
- The spirit: the project isn't about extracting money from hobbyists or open-source users — AGPLv3 covers those cases for free. The commercial license is specifically for cases where someone is making money using this project; in that case, the project owner wants to see something in return for the work that went into it
- Plugin authors who only use the public module API are not considered derivatives and don't need a commercial license; those who fork or bundle Streamline internals do

### 6. DCO (Developer Certificate of Origin)

Streamline is dual-licensed (AGPLv3 + commercial). A DCO sign-off is required on every commit so the project owner can legally offer contributions under the commercial license.

- Each commit must include: `Signed-off-by: Your Name <your@email.com>`Yes
- Use `git commit -s` to add this automatically
- PRs without sign-off on all commits will not be merged
- By signing off, you certify the contribution is your own work or that you have the right to submit it (per [DCO 1.1](https://developercertificate.org/)), **and** you grant the project owner the right to use your contribution under the commercial license terms in addition to AGPLv3

### 7. AI Contributions

- AI-assisted work is welcome
- Disclose AI use in the PR description: what you wrote yourself and what the AI generated or significantly assisted with
- Fully automated submissions (no human review or involvement) are not accepted
- You are responsible for all code you submit, regardless of how it was produced

## Decisions

- **DCO over full CLA**: lower friction for contributors; legally sufficient for the dual-license model when combined with an explicit relicensing-grant in the sign-off wording
- **Relaxed process**: project is early-stage, maintainer reviews and decides what fits
- **Structured guide (not lean)**: the monorepo + native modules + parallel dev setup has real gotchas worth documenting once