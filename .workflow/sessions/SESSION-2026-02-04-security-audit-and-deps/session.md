# Session: Security Audit & Dependency Fixes

**Session ID:** SESSION-2026-02-04-security-audit-and-deps
**Date:** 2026-02-04
**Branch:** `fix/security-alerts`
**PR:** #19 (As-The-Geek-Learns/jdex-premium)
**Phase:** Execute → Verify (awaiting CI)

---

## Overview

Cross-org security audit identified jdex-premium as having the most open alerts (4 Dependabot + 18 CodeQL). This session resolved 3 of 4 dependency vulnerabilities, hardened the CI workflow permissions, and fixed 6 code-level CodeQL findings. Five false-positive alerts were triaged for manual dismissal.

---

## Tasks Completed

| Task # | Description | Status | Notes |
| ------ | ----------- | ------ | ----- |
| 1 | Fix Dependabot alerts (tar, brace-expansion) | Done | `npm audit fix` in app/ |
| 2 | Add workflow permissions to CI | Done | `permissions: contents: read` top-level |
| 3 | Bump actions/checkout and setup-node to v6 | Done | Resolves 2 unpinned-tag alerts |
| 4 | Fix HTML sanitization bypass (validation.js) | Done | Loop regex until stable |
| 5 | Fix insecure randomness (fileScannerService.js) | Done | crypto.getRandomValues() fallback |
| 6 | Fix shell injection (ship.js) | Done | gh --body-file with temp file |
| 7 | Fix command injection (geminiReview.js) | Done | validateGitRef() input validation |
| 8 | Dismiss false-positive alerts (#14-18) | Blocked | Delegated dismissal enabled; needs GitHub UI |
| 9 | Fix electron ASAR bypass | Deferred | Major version bump 28→35+; separate PR |

---

## Changes Made

### Files Modified

```
.github/workflows/ci.yml
app/package-lock.json
app/src/utils/validation.js
app/src/services/fileScannerService.js
scripts/ship.js
scripts/geminiReview.js
```

### Key Code Changes

#### stripHtmlTags() — validation.js

**What:** Extracted HTML stripping into a loop-until-stable function
**Why:** Single-pass `/<[^>]*>/g` can be bypassed with nested tags: `<<script>script>` → after one pass, `<script>` remains
**How:** Loop the replacement until `current === prev`

```javascript
function stripHtmlTags(str) {
  let prev = str;
  let current = str.replace(/<[^>]*>/g, '');
  while (current !== prev) {
    prev = current;
    current = current.replace(/<[^>]*>/g, '');
  }
  return current;
}
```

#### generateSessionId() — fileScannerService.js

**What:** Replaced `Math.random()` fallback with `crypto.getRandomValues()`
**Why:** `Math.random()` is not cryptographically secure; session IDs should be unpredictable
**How:** Three-tier fallback: `crypto.randomUUID()` → `crypto.getRandomValues()` → timestamp-only (no entropy)

#### createPullRequest() — ship.js

**What:** PR body now written to temp file, using `gh --body-file` flag
**Why:** Inline shell escaping (`prBody.replace(/"/g, '\\"')`) was incomplete — didn't handle backslashes before quotes, allowing shell interpretation
**How:** `fs.writeFileSync(tmpFile, prBody)` then `gh pr create --body-file "${tmpFile}"` with `finally` cleanup

#### validateGitRef() — geminiReview.js

**What:** New function validates git ref format before shell execution
**Why:** `--base=` CLI argument was passed unsanitized into `` `git diff ${baseRef}` `` — allows command injection via `--base=";rm -rf /"`
**How:** Regex allowlist: `/^[a-zA-Z0-9._\-/~^@]+$/` — rejects semicolons, pipes, backticks, `$()`, spaces

---

## Issues Encountered

### Issue 1: Delegated Alert Dismissal

**Problem:** Couldn't dismiss false-positive CodeQL alerts (#14-18) via the GitHub API
**Root Cause:** The org has "delegated alert dismissal" enabled — a GitHub Advanced Security governance feature
**Solution:** Must dismiss through the GitHub Security tab UI. Documented in PR description with per-alert justification.

### Issue 2: gh pr edit GraphQL Deprecation

**Problem:** `gh pr edit --body` failed with a Projects Classic deprecation error
**Root Cause:** The gh CLI's GraphQL mutation touches projectCards which GitHub is sunsetting
**Solution:** Used REST API directly: `gh api repos/.../pulls/19 -X PATCH -f body="..."`

---

## Alert Triage Summary

### Fixed by Code Changes (will auto-close on CodeQL re-scan)

| Alert | Severity | Rule | File |
|-------|----------|------|------|
| #1-5 | N/A | missing-workflow-permissions | ci.yml |
| #6-7 | N/A | unpinned-tag | ci.yml |
| #8 | HIGH | insecure-randomness | fileScannerService.js |
| #9, #10 | HIGH | incomplete-multi-character-sanitization | validation.js |
| #11 | HIGH | incomplete-sanitization | ship.js |
| #12, #13 | MEDIUM | indirect-command-line-injection | geminiReview.js |

### Manual Dismissal Required

| Alert | Rule | File | Justification |
|-------|------|------|---------------|
| #14 | http-to-file-access | verify.js | Expected: writes local verification state |
| #15 | file-access-to-http | geminiReview.js | Expected: sends code to Gemini API for review |
| #16, #18 | log-injection | verify.js | CLI tool, not a web application |
| #17 | log-injection | geminiReview.js | CLI tool, not a web application |

### Deferred

| Item | Severity | Reason |
|------|----------|--------|
| electron ASAR bypass | MODERATE | Requires major version bump (28→35+), needs dedicated PR and testing |

---

## Verification Status

### CI Pipeline

- [ ] CI passes on PR #19
- [ ] CodeQL re-scan clears alerts #1-13
- [ ] Dependabot auto-closes dep alerts after merge

### Manual Review

- [x] Code self-reviewed
- [x] Each fix targets the specific vulnerability pattern identified by CodeQL
- [x] No functionality changes — purely security hardening
- [ ] Manually dismiss alerts #14-18 via GitHub Security tab

---

## ASTGL Content Moments

1. **[ASTGL CONTENT] Nested HTML tag bypass** — Single-pass regex tag stripping is a well-known XSS vector. The fix is simple (loop until stable) but the vulnerability is non-obvious. Good example of "security is about what you didn't think of."

2. **[ASTGL CONTENT] Delegated alert dismissal** — GitHub Advanced Security feature that prevents programmatic alert dismissal without review. Great governance for teams, but means you can't bulk-dismiss false positives from the CLI.

3. **[ASTGL CONTENT] Shell injection via CLI args** — Even internal developer tools need input validation. The `--base=` argument in geminiReview.js could inject arbitrary shell commands if someone ran it with a malicious ref name.

4. **[ASTGL CONTENT] gh --body-file pattern** — When passing multi-line content to `gh pr create`, always prefer `--body-file` over inline `--body` with escaping. Eliminates an entire class of shell injection bugs.

---

## Next Steps

1. Monitor CI on PR #19 — merge when green
2. Dismiss alerts #14-18 via GitHub Security tab after merge
3. Plan electron major version upgrade (28→35+) as separate work item
4. Continue cross-org alert remediation (substack-scheduler has a CRITICAL SSRF)

---

## Session Duration

Approximately 2 hours (across two conversation contexts).
