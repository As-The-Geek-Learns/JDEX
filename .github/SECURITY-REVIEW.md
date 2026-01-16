# Security Review Checklist for JDex

Use this checklist when reviewing PRs that touch sensitive areas of the codebase.

## Input Validation & Sanitization

- [ ] All user inputs are validated before use
- [ ] Text inputs are sanitized (HTML brackets, control characters removed)
- [ ] JD numbers are validated against expected patterns (XX, XX.XX, XX.XX.XX)
- [ ] Numeric inputs have reasonable bounds checking
- [ ] File paths are validated when handling imports/exports

## Database Operations (db.js)

- [ ] All queries use parameterized statements (no string concatenation)
- [ ] User inputs are never directly interpolated into SQL
- [ ] Database errors are caught and sanitized before display
- [ ] Transactions are used for multi-step operations

**Warning Areas in db.js:**
```javascript
// GOOD - Parameterized
db.run('INSERT INTO items (name) VALUES (?)', [name]);

// BAD - String interpolation (avoid!)
db.run(`SELECT * FROM items WHERE name LIKE '%${query}%'`);
```

## Error Handling

- [ ] Error messages don't expose sensitive information in production
- [ ] Stack traces are only shown in development mode
- [ ] Errors are logged appropriately
- [ ] Failed operations don't leave system in inconsistent state

## Data Protection

- [ ] Sensitive data flags are respected
- [ ] Exports don't leak internal implementation details
- [ ] Storage paths don't expose sensitive usernames unintentionally

## Dependencies

- [ ] New dependencies are from trusted sources
- [ ] Dependencies don't have known high/critical vulnerabilities
- [ ] Dependency versions are pinned appropriately

## Secrets & Configuration

- [ ] No secrets, API keys, or credentials in code
- [ ] `.gitignore` covers all sensitive files
- [ ] No hardcoded paths that should be configurable

## JDex-Specific Security

- [ ] JD number validation prevents injection in searches
- [ ] Import functions validate file format before processing
- [ ] Export functions don't include internal IDs unnecessarily
- [ ] Sensitivity levels are enforced in data handling

---

## Quick Reference

### Safe Search Pattern

```javascript
// Use parameterized search with LIKE
const searchTerm = `%${sanitizeInput(query)}%`;
db.prepare(`
  SELECT * FROM items 
  WHERE name LIKE ? OR description LIKE ?
`).bind([searchTerm, searchTerm]);
```

### JD Number Validation

```javascript
// Validate JD number format before use
const patterns = {
  category: /^\d{2}$/,           // XX
  folder: /^\d{2}\.\d{2}$/,      // XX.XX
  item: /^\d{2}\.\d{2}\.\d{2}$/  // XX.XX.XX
};

function validateJDNumber(number, level) {
  return patterns[level]?.test(number) ?? false;
}
```

### Error Handling Pattern

```javascript
try {
  // Database operation
} catch (error) {
  console.error('Operation failed:', error);
  // Return safe message to user
  throw new Error('Unable to complete operation. Please try again.');
}
```

---

## Files to Review Carefully

| File | Security Concern |
|------|------------------|
| `app/src/db.js` | SQL injection, data validation |
| `app/src/App.jsx` | Input handling, state management |
| `electron/main.js` | File system access, IPC |
| `scripts/notarize.js` | Signing credentials |
