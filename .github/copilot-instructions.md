# Copilot Code Review Instructions — JDEX

## Project context

JDex File Management System — a Johnny Decimal index manager.
Stack: JavaScript, Node.js.

## Review priorities

1. **Security first** — flag hardcoded secrets. Validate all file paths to prevent path traversal.
2. **File system safety** — flag destructive file operations without confirmation. Validate paths are within expected directories.
3. **Error handling** — never suppress errors. File operations must handle ENOENT, EACCES, etc.
4. **Input validation** — validate user input (index numbers, file paths) before processing.

## Code style

- Conventional commits: feat:, fix:, docs:, refactor:, test:, chore:.
- Comments explain *why*, never *what*.
- Prefer async/await over raw Promises. Use fs/promises over callback fs.

## Patterns to flag

- Path traversal risks (unsanitized user paths joined with fs operations).
- Synchronous file operations in async contexts.
- Missing error handling on fs operations.
