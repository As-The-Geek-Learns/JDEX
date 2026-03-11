# Security Review Checklist

Use this checklist during the VERIFY phase and before shipping any code changes.

---

## Input Validation & Sanitization

- [ ] All user inputs are validated before use
- [ ] Text inputs are sanitized (HTML tags, control characters removed)
- [ ] Numeric inputs have bounds checking
- [ ] File paths are validated (no path traversal `../`)
- [ ] URLs are validated if accepting external links
- [ ] JSON/data imports are validated before processing

### Validation Patterns

```javascript
// GOOD - Centralized validation
import { sanitizeText, validateFilePath } from './utils/validation.js';
const safeName = sanitizeText(userInput);
const safePath = validateFilePath(filePath);

// BAD - No validation
const name = userInput; // Raw input used directly
```

---

## Database Operations

- [ ] All queries use parameterized statements (no string concatenation)
- [ ] User inputs are never interpolated into SQL
- [ ] Database errors are caught and sanitized before display
- [ ] Transactions used for multi-step operations
- [ ] No raw SQL visible in error messages

### Database Patterns

```javascript
// GOOD - Parameterized query
db.run('INSERT INTO items (name) VALUES (?)', [sanitizedName]);

// BAD - String interpolation (SQL injection risk!)
db.run(`SELECT * FROM items WHERE name = '${userInput}'`);
```

---

## Error Handling

- [ ] Error messages don't expose sensitive information
- [ ] Stack traces only shown in development mode
- [ ] File paths redacted from user-facing errors
- [ ] Database details hidden from users
- [ ] Errors are logged appropriately for debugging

### Error Patterns

```javascript
// GOOD - Safe error handling
try {
  await operation();
} catch (error) {
  console.error('[Context]', error); // Full error for logs
  throw new Error('Operation failed. Please try again.'); // Safe for users
}

// BAD - Exposing internals
catch (error) {
  throw error; // Might contain paths, SQL, etc.
}
```

---

## Authentication & Authorization

- [ ] Protected routes require authentication
- [ ] Sensitive operations require re-authentication
- [ ] Session tokens are not exposed in URLs
- [ ] API keys are not hardcoded or logged
- [ ] Role-based access is enforced server-side

---

## Data Protection

- [ ] Sensitive data is not stored in localStorage/cookies unnecessarily
- [ ] Exports don't include internal implementation details
- [ ] PII is handled according to privacy requirements
- [ ] Data at rest is encrypted where required
- [ ] Backup files don't contain unencrypted secrets

---

## Dependencies

- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] New dependencies are from trusted sources
- [ ] Dependencies are pinned to specific versions
- [ ] No unnecessary dependencies added
- [ ] Dependency licenses are compatible

### Audit Command
```bash
npm audit --audit-level=high
```

---

## Secrets & Configuration

- [ ] No secrets, API keys, or credentials in code
- [ ] `.gitignore` covers all sensitive files
- [ ] Environment variables used for configuration
- [ ] No hardcoded paths that should be configurable
- [ ] Production secrets are not in development configs

### Files to Check
- `.env` files (should be gitignored)
- Configuration files
- Test fixtures (may contain real data)

---

## Network Security

- [ ] HTTPS used for all external requests
- [ ] No mixed content (HTTP resources on HTTPS pages)
- [ ] CORS configured appropriately
- [ ] Rate limiting considered for public endpoints
- [ ] Timeouts set for external requests

---

## File System Security

- [ ] File uploads validated (type, size, content)
- [ ] Uploaded files stored outside web root
- [ ] Generated filenames don't include user input
- [ ] Temporary files are cleaned up
- [ ] File permissions are restrictive

### Path Validation Pattern
```javascript
// GOOD - Path traversal protection
const DANGEROUS_PATTERNS = [/\.\./, /\0/];
function isPathSafe(path) {
  return !DANGEROUS_PATTERNS.some(p => p.test(path));
}
```

---

## Quick Reference: Risk Levels

| Finding | Risk | Action |
|---------|------|--------|
| SQL injection possible | CRITICAL | Block ship, fix immediately |
| Secrets in code | CRITICAL | Block ship, rotate secrets |
| Path traversal possible | HIGH | Block ship, add validation |
| Missing input validation | MEDIUM | Fix before ship |
| Verbose error messages | LOW | Fix in next iteration |

---

## Sign-off

**Reviewer:** _______________  
**Date:** _______________  
**Result:** PASS / FAIL / PASS WITH NOTES

**Notes:**
