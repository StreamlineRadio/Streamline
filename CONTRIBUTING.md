# Contributing to Streamline

Thanks for your interest in contributing! Streamline is a pnpm monorepo — read through this guide before opening a PR.

---

## Getting Started

**Prerequisites:**

- Node 24 — use [nvm](https://github.com/nvm-sh/nvm) with the `.nvmrc` in the repo root (`nvm use`)
- pnpm 11 or later — `npm install -g pnpm` (the repo pins `pnpm@11.9.0` via `packageManager`)

**Install dependencies:**

```bash
pnpm install
```

**Start the development environment:**

```bash
pnpm dev
```

This starts Electron Forge, which spins up the Vite dev server for the renderer and launches Electron — all in one command.

---

## Project Structure

| Package | Purpose |
|---|---|
| `packages/streamline` | Electron main process + plain Svelte renderer (Vite) |
| `packages/shared` | Shared TypeScript types and IPC channel definitions |
| `packages/modules` | Built-in modules (deck, queue, mic, encoders, etc.) |
| `packages/audio-worklet` | AudioWorklet processors (compiled separately, run in their own context) |

---

## Code Style

Prettier and ESLint are configured per-package. Before submitting:

```bash
pnpm lint    # ESLint across all packages
pnpm check   # type checking across all packages (svelte-check, tsc)
```

Formatting is enforced by the linter. Don't spend time on manual formatting debates — just run `pnpm lint:fix` and commit.

---

## Submitting Changes

`main` is protected — you can't push to it directly. **All changes go through a pull request**, and every PR is **squash-merged**: your branch collapses into a single commit on `main`.

- Branch off `main` and open a PR — no issue required first
- Your PR description should explain **what** changed and **why**
- If applicable, add tests and update documentation

### PR titles must follow Conventional Commits

Because every PR is squashed into one commit, **the PR title becomes that commit's message** and is what drives the changelog. So the title — not your individual commits — must follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
feat: add crossfade support
fix(ipc): handle null device on reconnect
chore!: drop support for Node 22
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `perf`, `revert`. A CI check enforces this on the PR title.

Your **commit messages on the branch don't need to follow this format** — they're discarded when the PR is squashed, so commit however helps you work. (They still need a DCO sign-off — see below.)

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

By adding `Signed-off-by` to a commit, you make two commitments:

1. You certify the contribution is your own work or that you have the right to submit it (per [DCO 1.1](https://developercertificate.org/)).
2. You grant the project owner the right to use your contribution under the commercial license terms in addition to AGPLv3. This is required because Streamline is dual-licensed.

**PRs with unsigned commits will not be merged.**

---

## AI Contributions

Using AI tools to help write code is fine. A few rules:

- **Disclose AI use in your PR description.** Describe what you wrote yourself and what the AI generated or significantly assisted with.
- **No fully automated submissions.** PRs must involve a human who has reviewed, understood, and tested the code. A PR that is entirely AI-generated with no meaningful human involvement will be closed.
- **You are responsible for everything you submit**, regardless of how it was produced. If the AI wrote something incorrect, insecure, or misaligned with the project — that's on you to catch before opening the PR.
