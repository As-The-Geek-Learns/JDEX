# Plan: Gemini AI Code Review Integration

**Session ID:** SESSION-2026-01-19-gemini-code-review  
**Created:** 2026-01-19  
**Status:** In Progress

---

## 1. Problem Statement

### What are we solving?
The current verification workflow relies solely on Claude for code review. Adding a second AI reviewer (Gemini) provides an additional perspective that may catch issues Claude misses, creating a more robust review process.

### Why does it matter?
- Different AI models have different strengths and blind spots
- Security-critical code benefits from multiple review perspectives
- Documented external reviews improve audit trail
- Catches bugs/issues before shipping to production

### Success Criteria
- [ ] Gemini API integration working in verify.js
- [ ] Code review results included in verification state
- [ ] Review prompts focus on security and code quality
- [ ] Graceful handling when API is unavailable
- [ ] Documentation updated in verify-checklist.md

---

## 2. Security Considerations

<!-- Reference: .workflow/checklists/security-review.md -->

### Data Handling
- [ ] API key stored as environment variable, not in code
- [ ] No sensitive project data sent to external API (paths sanitized)
- [ ] API responses validated before use
- [ ] Error messages don't expose API key

### Attack Surface
- [ ] New external dependency (Gemini API) - trusted Google service
- [ ] Network requests use HTTPS only
- [ ] API key has appropriate permissions/scope
- [ ] Timeout handling for API calls

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API key exposure | Low | Medium | Environment variable, .gitignore |
| API unavailable | Medium | Low | Graceful fallback, continue verification |
| Sensitive code exposure | Low | Medium | Only send diff snippets, not full files |
| Rate limiting | Medium | Low | Implement retry logic with backoff |

---

## 3. Approach Selection

### Option A: Inline in verify.js
**Description:** Add Gemini review directly to the existing verify.js script
**Pros:**
- Simple, single-file change
- Runs automatically during verification
**Cons:**
- Makes verify.js more complex
- Adds network dependency to verification
**Effort:** Low

### Option B: Separate geminiReview.js module
**Description:** Create separate module, import into verify.js
**Pros:**
- Clean separation of concerns
- Easier to test independently
- Can be reused elsewhere
**Cons:**
- Additional file to maintain
- Slightly more complex setup
**Effort:** Medium

### Option C: Standalone CLI tool
**Description:** Create separate script called after verify.js
**Pros:**
- Completely decoupled
- Can be run independently
**Cons:**
- Separate command to remember
- Doesn't integrate with verification state
**Effort:** Medium

### Selected Approach
**Choice:** Option B - Separate module  
**Rationale:** Best balance of maintainability and integration. Module can be tested independently but still integrates cleanly with the verification workflow.

---

## 4. Task Breakdown

| # | Task | Files Affected | Dependencies | Status |
|---|------|----------------|--------------|--------|
| 1 | Create geminiReview.js module | scripts/geminiReview.js (new) | - | [ ] |
| 2 | Add Gemini API integration | scripts/geminiReview.js | 1 | [ ] |
| 3 | Implement diff generation | scripts/geminiReview.js | 1 | [ ] |
| 4 | Add review prompt engineering | scripts/geminiReview.js | 1, 2 | [ ] |
| 5 | Integrate into verify.js | scripts/verify.js | 1, 2, 3, 4 | [ ] |
| 6 | Update verify-checklist.md | .workflow/checklists/verify-checklist.md | - | [ ] |
| 7 | Add environment variable documentation | README or docs | 5 | [ ] |
| 8 | Test with real Gemini API | - | 1-5 | [ ] |

---

## 5. Verification Plan

### Automated Tests
- [ ] Unit tests for: diff generation, response parsing
- [ ] Integration tests for: API call with mock

### Visual Verification
- [ ] Verification output shows Gemini review results
- [ ] Error handling displays appropriate messages

### Manual Review
- [ ] Code review checklist completed
- [ ] Security review checklist completed
- [ ] Test with valid API key
- [ ] Test with missing API key (graceful fallback)
- [ ] Test with invalid API key (error handling)

---

## 6. Approval

### Planning Phase Approval
- [x] **Human checkpoint:** Plan reviewed and approved
- Approved by: James Cruce
- Date: 2026-01-19 

---

## Notes

### API Details
- Gemini API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
- Free tier: 60 queries per minute
- API key from: https://aistudio.google.com/app/apikey

### Review Focus Areas
The Gemini review prompt should focus on:
1. Security vulnerabilities (injection, path traversal, etc.)
2. Error handling completeness
3. Input validation coverage
4. Logic errors or edge cases
5. Code quality issues

### Sample Prompt Structure
```
You are a code reviewer. Review the following code changes for:
1. Security vulnerabilities
2. Logic errors
3. Missing error handling
4. Input validation issues
5. Best practice violations

Code changes:
[DIFF CONTENT]

Provide a structured review with:
- CRITICAL issues (must fix before ship)
- WARNING issues (should fix soon)
- INFO suggestions (nice to have)
```
