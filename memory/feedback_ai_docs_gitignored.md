---
name: AI docs go in git exclude, not gitignore
description: AI-generated spec/design docs must be excluded via .git/info/exclude, not committed to .gitignore
type: feedback
---

Never commit AI-generated docs (e.g. docs/superpowers/) to .gitignore or to git. Add them to `.git/info/exclude` instead.

**Why:** The user doesn't want to show that AI is used in the github repo.

**How to apply:** After writing any spec/design doc to docs/superpowers/, add the path to `.git/info/exclude` if not already there. Never stage or commit docs/superpowers/ files.