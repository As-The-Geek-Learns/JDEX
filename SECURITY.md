# Security Policy

## Supported Versions

We actively support the latest version of JDex. Security updates are provided for the current release.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

1. **Do not** open a public GitHub issue
2. Email security concerns to: james@astgl.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

### For Users

- Keep JDex updated to the latest version
- Use strong system-level encryption for your device
- Be cautious when sharing database export files
- Review exported data before sharing
- Backup your JDex database regularly

### For Developers

See [SECURITY-REVIEW.md](.github/SECURITY-REVIEW.md) for our security review checklist.

## Secure Coding Guidelines

### Input Validation

- Always validate and sanitize user inputs
- Use centralized validation functions
- Sanitize values before storing in database
- Validate JD numbers match expected patterns

### Error Handling

- Never expose sensitive information in error messages
- Use structured logging instead of `console.*` in production
- Hide stack traces in production builds
- Provide user-friendly error messages

### Database Operations

- Always use parameterized queries
- Never concatenate user input into SQL strings
- Use the centralized database functions in `db.js`

### Dependencies

- Keep dependencies up to date
- Review security advisories regularly
- Use `npm audit` before releases

## Security Features

- **Input Sanitization**: Text inputs are sanitized to remove HTML and control characters
- **SQL Injection Protection**: Queries use parameterized statements
- **XSS Prevention**: React's default escaping prevents XSS attacks
- **Error Sanitization**: Production error messages are generic
- **Dependency Scanning**: Automated vulnerability scanning in CI/CD
- **Secrets Scanning**: Gitleaks prevents accidental credential commits

## Threat Model

### Desktop Application Threats

JDex is a local-first desktop application. Primary threats include:

- **Local data tampering**: Mitigated by browser localStorage isolation
- **Memory inspection**: Data is not persisted in memory beyond session
- **Malicious file imports**: Database imports are validated

### Mitigations

- Input validation at all entry points
- Parameterized database queries
- Secure error handling

## Data Handling

JDex handles potentially sensitive organizational data:

| Data Type | Storage | Sensitivity |
|-----------|---------|-------------|
| JD Index entries | localStorage/SQLite | Standard |
| File paths | Database | May contain usernames |
| Notes/descriptions | Database | User-defined |

### Data Protection Recommendations

- Use the "Sensitive" flag for entries containing PII
- Store sensitive items in encrypted cloud storage (ProtonDrive)
- Review exports before sharing
- Regularly backup and verify database integrity

## Security Updates

Security updates are released as needed. We recommend:

- Checking for updates regularly
- Reviewing release notes for security fixes
- Reporting any security concerns promptly

## Disclosure Policy

- Vulnerabilities are disclosed after a fix is available
- We credit security researchers who responsibly disclose issues
- Critical vulnerabilities may be disclosed immediately if already exploited

## CI/CD Security Improvements (Feb 2026)

### Semgrep Action Pinning
- Semgrep v1 action pinned to commit SHA `713efdd345f3035192eaa63f56867b88e63e4e5d` for reproducibility
- Prevents supply chain attacks via floating version tags
- Ensures deterministic security scanning across all CI runs

### Gitleaks Enforcement
- Gitleaks `continue-on-error` removed to fail CI on secret detection
- Added `.gitleaks.toml` allowlist configuration to reduce false positives
- Secrets scanning now blocks merges instead of silently passing
- Review `.gitleaks.toml` and customize allowlist rules for your repository

## Contact

For security concerns: james@astgl.com

For general questions: Open an issue on GitHub
