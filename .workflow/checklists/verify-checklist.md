# Verification Checklist

Complete this checklist during the VERIFY phase before proceeding to SHIP.

---

## Pre-Verification Gate

- [ ] EXECUTE phase completed
- [ ] All planned tasks marked done in plan.md
- [ ] Session documentation up to date

---

## 1. Automated Tests

### Unit Tests
- [ ] All existing tests passing
- [ ] New tests written for new functionality
- [ ] Edge cases covered
- [ ] Error conditions tested

### Integration Tests
- [ ] Component interactions tested
- [ ] API endpoints tested (if applicable)
- [ ] Database operations tested

### Test Commands
```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm run test:watch          # Watch mode for development
```

### Test Results
- **Total Tests:** ___
- **Passing:** ___
- **Failing:** ___
- **Coverage:** ___%

---

## 2. Visual Verification

### Manual UI Testing
- [ ] Feature works as expected in browser
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Accessibility basics checked (keyboard nav, contrast)
- [ ] Error states display correctly
- [ ] Loading states display correctly

### Screenshot Evidence
Capture screenshots for:
- [ ] Main feature view
- [ ] Edge cases / error states
- [ ] Before/after comparison (if UI changed)

**Evidence Location:** `.workflow/evidence/SESSION-ID/`

### Visual Test Commands (MCP Browser Extension)
```
# Navigate to test URL
# Capture screenshot
# Verify expected elements present
```

---

## 3. Code Quality

### Linting
- [ ] ESLint passes with no errors
- [ ] No new warnings introduced

```bash
npm run lint
```

### Formatting
- [ ] Prettier formatting applied
- [ ] Consistent code style

```bash
npm run format:check
```

### Build
- [ ] Production build succeeds
- [ ] No build warnings

```bash
npm run build
```

---

## 4. Security Review

- [ ] Security checklist completed (see security-review.md)
- [ ] `npm audit` shows no high/critical issues
- [ ] No secrets in committed code
- [ ] Input validation in place

```bash
npm audit --audit-level=high
```

---

## 5. External AI Code Review (Gemini)

An external AI reviewer (Google Gemini) provides a second perspective on code changes, catching issues that may be missed by the primary AI or human reviewers.

### Setup
Requires `GEMINI_API_KEY` environment variable. Get a free API key from:
https://aistudio.google.com/app/apikey

```bash
export GEMINI_API_KEY="your-api-key-here"
```

### Running the Review
The Gemini review runs automatically as part of `verify.js`:

```bash
node scripts/verify.js                    # Includes Gemini review
node scripts/verify.js --skip-gemini      # Skip Gemini review
node scripts/verify.js --gemini-base=HEAD~5  # Review last 5 commits
```

Or run standalone:
```bash
node scripts/geminiReview.js              # Review last commit
node scripts/geminiReview.js --full       # Full codebase security audit
node scripts/geminiReview.js --staged     # Review staged changes
node scripts/geminiReview.js --base=main  # Review against main branch
```

### Review Criteria
Gemini reviews code for:
- **CRITICAL**: Security vulnerabilities (injection, XSS, path traversal, exposed secrets)
- **WARNING**: Missing validation, error handling, logic errors, race conditions
- **INFO**: Style improvements, performance, documentation suggestions

### Verification
- [ ] Gemini review completed (or documented reason for skip)
- [ ] No CRITICAL issues found
- [ ] WARNING issues addressed or documented
- [ ] Review summary included in verification state

### Results
- **Status:** Pass / Fail / Skipped
- **Issues Found:** ___
- **Critical:** ___
- **Security Score:** ___/10
- **Quality Score:** ___/10

---

## 6. File Integrity

### Generate Verification State
Run the verify script to generate file hashes:

```bash
node scripts/verify.js
```

This creates `.workflow/state/verify-state.json` containing:
- SHA256 hashes of all modified files
- Timestamp of verification
- Test results summary
- Gemini review results
- Verification checklist status

### Verify Output
- [ ] `verify-state.json` generated successfully
- [ ] All file hashes recorded
- [ ] No unexpected files modified

---

## 7. Documentation

- [ ] Code comments added where needed
- [ ] README updated (if public API changed)
- [ ] Session documentation complete
- [ ] Plan.md verification section updated

---

## Verification Summary

| Check | Status | Notes |
|-------|--------|-------|
| Automated Tests | Pass/Fail | |
| Visual Verification | Pass/Fail | |
| Code Quality | Pass/Fail | |
| Security Review | Pass/Fail | |
| Gemini AI Review | Pass/Fail/Skip | |
| File Integrity | Pass/Fail | |
| Documentation | Pass/Fail | |

---

## Human Checkpoint

**STOP:** Do not proceed to SHIP until this verification is complete.

- [ ] All checks above are passing
- [ ] Any failures have been addressed or documented
- [ ] Human has reviewed verification results

**Verified by:** _______________  
**Date:** _______________  
**Decision:** APPROVED FOR SHIP / NEEDS WORK / APPROVED WITH CAVEATS

**Notes:**

---

## Proceeding to Ship

If verification passes:
1. Ensure `verify-state.json` is committed
2. Run `node scripts/ship.js` to validate integrity and create PR
3. Complete PR template with verification evidence
