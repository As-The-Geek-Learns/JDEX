/**
 * Error Handling Utilities for JDex
 * ==================================
 * Custom error classes and sanitization for safe error handling.
 *
 * Security: Never expose raw error messages to users. They can contain
 * sensitive information like file paths, database queries, or system details.
 * Always use sanitizeErrorForUser() before displaying errors in the UI.
 */

// =============================================================================
// Custom Error Classes
// =============================================================================

/**
 * Base class for all JDex application errors.
 * Provides consistent structure and safe serialization.
 */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Convert to a safe object for logging (excludes sensitive data).
   */
  toLogObject() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      // Don't include details in logs by default - may contain sensitive data
    };
  }
}

/**
 * Error for file system operations.
 * Use when file read/write/move operations fail.
 */
export class FileSystemError extends AppError {
  constructor(message, operation = 'unknown', path = null) {
    super(message, 'FILE_SYSTEM_ERROR');
    this.name = 'FileSystemError';
    this.operation = operation; // 'read', 'write', 'move', 'delete', 'scan'
    // Don't store the actual path - it might be sensitive
    this.hasPath = path !== null;
  }

  /**
   * Get a user-friendly message based on the operation.
   */
  getUserMessage() {
    const messages = {
      read: 'Unable to read the file. Please check if it exists and you have permission.',
      write: 'Unable to save the file. Please check if you have write permission.',
      move: 'Unable to move the file. The destination may not be accessible.',
      delete: 'Unable to delete the file. It may be in use or protected.',
      scan: 'Unable to scan the folder. Please check if it exists and you have permission.',
      create: 'Unable to create the file or folder. Please check permissions.',
      unknown: 'A file operation failed. Please try again.',
    };
    return messages[this.operation] || messages.unknown;
  }
}

/**
 * Error for database operations.
 * Use when SQL queries or database connections fail.
 */
export class DatabaseError extends AppError {
  constructor(message, operation = 'unknown') {
    super(message, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
    this.operation = operation; // 'query', 'insert', 'update', 'delete', 'connect'
  }

  getUserMessage() {
    const messages = {
      query: 'Unable to retrieve data. Please try again.',
      insert: 'Unable to save the new item. Please try again.',
      update: 'Unable to update the item. Please try again.',
      delete: 'Unable to delete the item. Please try again.',
      connect: 'Unable to connect to the database. Please restart the app.',
      migrate: 'Database update failed. Please contact support.',
      unknown: 'A database error occurred. Please try again.',
    };
    return messages[this.operation] || messages.unknown;
  }
}

/**
 * Error for validation failures.
 * Re-exported from validation.js for convenience.
 */
export { ValidationError } from './validation.js';

/**
 * Error for cloud drive operations.
 * Use when cloud storage operations fail.
 */
export class CloudDriveError extends AppError {
  constructor(message, driveName = 'unknown', operation = 'unknown') {
    super(message, 'CLOUD_DRIVE_ERROR');
    this.name = 'CloudDriveError';
    this.driveName = driveName; // 'icloud', 'dropbox', 'onedrive', etc.
    this.operation = operation; // 'detect', 'connect', 'sync', 'read', 'write'
  }

  getUserMessage() {
    const driveDisplay = this.driveName === 'unknown' ? 'cloud drive' : this.driveName;
    const messages = {
      detect: `Unable to detect ${driveDisplay}. Please ensure it's installed and running.`,
      connect: `Unable to connect to ${driveDisplay}. Please check your connection.`,
      sync: `${driveDisplay} sync may be incomplete. Please check its status.`,
      read: `Unable to read from ${driveDisplay}. Please check permissions.`,
      write: `Unable to write to ${driveDisplay}. Please check if you have space and permissions.`,
      unknown: `An error occurred with ${driveDisplay}. Please try again.`,
    };
    return messages[this.operation] || messages.unknown;
  }
}

/**
 * Error for organization/matching operations.
 * Use when file organization logic fails.
 */
export class OrganizationError extends AppError {
  constructor(message, operation = 'unknown') {
    super(message, 'ORGANIZATION_ERROR');
    this.name = 'OrganizationError';
    this.operation = operation; // 'match', 'move', 'rule', 'scan'
  }

  getUserMessage() {
    const messages = {
      match: 'Unable to find a matching folder for this file.',
      move: 'Unable to organize the file. The destination may not be available.',
      rule: 'Unable to apply the organization rule.',
      scan: 'Unable to complete the file scan.',
      conflict: 'A file with this name already exists in the destination.',
      unknown: 'An organization error occurred. Please try again.',
    };
    return messages[this.operation] || messages.unknown;
  }
}

// =============================================================================
// Error Sanitization
// =============================================================================

/**
 * Patterns that indicate sensitive information in error messages.
 * These will be redacted before showing to users.
 */
const SENSITIVE_PATTERNS = [
  // File paths
  /\/Users\/[^/\s]+/gi, // macOS user paths
  /C:\\Users\\[^\\\s]+/gi, // Windows user paths
  /\/home\/[^/\s]+/gi, // Linux user paths

  // Database details
  /sqlite/gi,
  /sql syntax/gi,
  /query failed/gi,
  /constraint/gi,

  // System details
  /ENOENT/gi, // Node.js file not found
  /EACCES/gi, // Node.js permission denied
  /EPERM/gi, // Node.js operation not permitted
  /errno/gi,
  /syscall/gi,

  // Stack traces
  /at\s+\S+\s+\([^)]+\)/g, // Stack trace lines
  /\s+at\s+.+:\d+:\d+/g, // More stack traces
];

/**
 * Sanitize an error for safe display to users.
 * Removes sensitive information like paths, system details, and stack traces.
 *
 * @param {Error|string} error - The error to sanitize
 * @returns {string} A safe, user-friendly error message
 */
export function sanitizeErrorForUser(error) {
  // Handle null/undefined
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // If it's one of our custom errors, use the user message
  if (error instanceof FileSystemError) {
    return error.getUserMessage();
  }
  if (error instanceof DatabaseError) {
    return error.getUserMessage();
  }
  if (error instanceof CloudDriveError) {
    return error.getUserMessage();
  }
  if (error instanceof OrganizationError) {
    return error.getUserMessage();
  }

  // For ValidationError, the message is usually safe to show
  // (we control what goes into it)
  if (error.name === 'ValidationError') {
    return error.message;
  }

  // For generic errors, sanitize the message
  let message = typeof error === 'string' ? error : error.message || '';

  // Remove sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, '[redacted]');
  }

  // If the message is now empty or just redactions, use generic message
  if (!message.trim() || message.replace(/\[redacted\]/g, '').trim().length < 10) {
    return 'An error occurred. Please try again.';
  }

  // Limit length
  if (message.length > 200) {
    message = message.substring(0, 200) + '...';
  }

  return message;
}

// =============================================================================
// Error Logging (Development/Debug)
// =============================================================================

/**
 * Log level constants.
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * Log an error for debugging purposes.
 * In development, logs full details. In production, logs sanitized version.
 *
 * @param {Error} error - The error to log
 * @param {string} context - Where the error occurred (e.g., 'FileScanner.scan')
 * @param {string} level - Log level (default 'error')
 */
export function logError(error, context = 'unknown', level = LogLevel.ERROR) {
  const isDev = process.env.NODE_ENV === 'development';

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    context,
    errorName: error?.name || 'Error',
    errorCode: error?.code || 'UNKNOWN',
  };

  if (isDev) {
    // In development, log full details for debugging
    logEntry.message = error?.message;
    logEntry.stack = error?.stack;
    console.error('[JDex Error]', logEntry);
  } else {
    // In production, log sanitized version
    logEntry.message = sanitizeErrorForUser(error);
    console.error('[JDex Error]', JSON.stringify(logEntry));
  }
}

// =============================================================================
// Error Boundary Helper
// =============================================================================

/**
 * Wrap an async function to catch and handle errors consistently.
 *
 * @param {Function} fn - The async function to wrap
 * @param {string} context - Context for error logging
 * @returns {Function} Wrapped function that handles errors
 *
 * @example
 * const safeScan = withErrorHandling(scanDirectory, 'FileScanner.scan');
 * const result = await safeScan('/some/path');
 */
export function withErrorHandling(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, context);
      throw error; // Re-throw so caller can handle
    }
  };
}

/**
 * Create a result object for operations that may fail.
 * Use this pattern instead of throwing errors for expected failures.
 *
 * @example
 * function tryParseFile(path) {
 *   try {
 *     const data = parseFile(path);
 *     return Result.ok(data);
 *   } catch (e) {
 *     return Result.error(e);
 *   }
 * }
 *
 * const result = tryParseFile('/path/to/file');
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   showError(result.userMessage);
 * }
 */
export const Result = {
  ok(data) {
    return {
      success: true,
      data,
      error: null,
      userMessage: null,
    };
  },

  error(error, userMessage = null) {
    return {
      success: false,
      data: null,
      error,
      userMessage: userMessage || sanitizeErrorForUser(error),
    };
  },
};
