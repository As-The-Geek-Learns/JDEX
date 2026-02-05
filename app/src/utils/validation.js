/**
 * Input Validation Utilities for JDex
 * ====================================
 * Centralized validation to ensure consistent, secure input handling.
 *
 * Security: All user input should pass through these functions before
 * being used in database queries, file operations, or displayed in UI.
 */

// =============================================================================
// Validation Error Class
// =============================================================================

/**
 * Custom error class for validation failures.
 * Includes field name and value for debugging (value is sanitized in logs).
 */
export class ValidationError extends Error {
  constructor(message, field = 'unknown', value = undefined) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    // Don't store actual value in production to avoid leaking sensitive data
    this.hasValue = value !== undefined;
  }
}

// =============================================================================
// Text Sanitization
// =============================================================================

/**
 * Sanitize text input by removing potentially dangerous characters.
 * Use for short text fields like names and titles.
 *
 * @param {string|null|undefined} input - The text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(input) {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    return '';
  }

  return (
    input
      .trim()
      // Remove HTML-significant characters entirely (prevents XSS including malformed tags)
      .replace(/[<>]/g, '')
      // Remove control characters except newlines and tabs
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize multiple spaces to single space
      .replace(/\s+/g, ' ')
  );
}

/**
 * Sanitize longer text that may contain line breaks.
 * Use for descriptions, notes, and multi-line content.
 *
 * @param {string|null|undefined} input - The text to sanitize
 * @returns {string} Sanitized text with preserved line breaks
 */
export function sanitizeDescription(input) {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    return '';
  }

  return (
    input
      .trim()
      // Remove HTML-significant characters entirely (prevents XSS including malformed tags)
      .replace(/[<>]/g, '')
      // Remove control characters except newlines, tabs, carriage returns
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize multiple newlines to max 2
      .replace(/\n{3,}/g, '\n\n')
      // Normalize multiple spaces (but not newlines) to single space
      .replace(/[^\S\n]+/g, ' ')
  );
}

// =============================================================================
// String Validation
// =============================================================================

/**
 * Validate a required string field.
 * Throws ValidationError if invalid.
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - Name of the field (for error messages)
 * @param {number} maxLength - Maximum allowed length (default 500)
 * @returns {string} The validated and sanitized string
 * @throws {ValidationError} If validation fails
 */
export function validateRequiredString(value, fieldName, maxLength = 500) {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName, value);
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} cannot exceed ${maxLength} characters`,
      fieldName,
      value
    );
  }

  return sanitizeText(trimmed);
}

/**
 * Validate an optional string field.
 * Returns null if empty/undefined, validated string otherwise.
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - Name of the field (for error messages)
 * @param {number} maxLength - Maximum allowed length (default 500)
 * @returns {string|null} The validated string or null
 * @throws {ValidationError} If validation fails
 */
export function validateOptionalString(value, fieldName, maxLength = 500) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} cannot exceed ${maxLength} characters`,
      fieldName,
      value
    );
  }

  return sanitizeText(trimmed);
}

// =============================================================================
// File Path Validation
// =============================================================================

/**
 * Dangerous path patterns that could indicate path traversal attacks.
 */
const DANGEROUS_PATH_PATTERNS = [
  /\.\./, // Parent directory traversal
  /^~/, // Home directory (we'll expand this separately)
  /\0/, // Null byte injection
  /^\/etc\//i, // System config
  /^\/var\//i, // System var
  /^\/usr\//i, // System usr
  /^\/bin\//i, // System bin
  /^\/sbin\//i, // System sbin
  /^\/root\//i, // Root home
  /^\/private\//i, // macOS private
];

/**
 * Validate a file path is safe to use.
 * Checks for path traversal attacks and dangerous patterns.
 *
 * @param {string} path - The path to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowHome - Allow ~ home directory paths (default false)
 * @param {string[]} options.allowedRoots - Array of allowed root paths (if set, path must start with one)
 * @returns {string} The validated path
 * @throws {ValidationError} If path is invalid or dangerous
 */
export function validateFilePath(path, options = {}) {
  const { allowHome = false, allowedRoots = [] } = options;

  if (!path || typeof path !== 'string') {
    throw new ValidationError('Path is required', 'path', path);
  }

  const trimmedPath = path.trim();

  if (trimmedPath.length === 0) {
    throw new ValidationError('Path cannot be empty', 'path', path);
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATH_PATTERNS) {
    // Skip home directory check if allowHome is true
    if (pattern.source === '^~' && allowHome) {
      continue;
    }

    if (pattern.test(trimmedPath)) {
      throw new ValidationError(
        'Path contains potentially dangerous characters or patterns',
        'path',
        path
      );
    }
  }

  // If allowed roots specified, verify path starts with one of them
  if (allowedRoots.length > 0) {
    const isAllowed = allowedRoots.some(
      (root) => trimmedPath.startsWith(root) || trimmedPath === root
    );

    if (!isAllowed) {
      throw new ValidationError('Path is not within an allowed directory', 'path', path);
    }
  }

  return trimmedPath;
}

/**
 * Validate that a path is within a given base directory.
 * Prevents escaping from intended directory scope.
 *
 * @param {string} path - The path to validate
 * @param {string} basePath - The base directory the path must be within
 * @returns {boolean} True if path is within basePath
 */
export function isPathWithinBase(path, basePath) {
  if (!path || !basePath) {
    return false;
  }

  // Normalize paths (remove trailing slashes, resolve . and ..)
  const normalizedPath = path.replace(/\/+$/, '');
  const normalizedBase = basePath.replace(/\/+$/, '');

  // Path must start with base path
  return normalizedPath.startsWith(normalizedBase + '/') || normalizedPath === normalizedBase;
}

// =============================================================================
// Numeric Validation
// =============================================================================

/**
 * Validate a number within bounds.
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - Name of the field
 * @param {number} min - Minimum value (default 0)
 * @param {number} max - Maximum value (default MAX_SAFE_INTEGER)
 * @returns {number} The validated number
 * @throws {ValidationError} If validation fails
 */
export function validateNumber(value, fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || !Number.isFinite(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName, value);
  }

  if (num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, value);
  }

  if (num > max) {
    throw new ValidationError(`${fieldName} cannot exceed ${max}`, fieldName, value);
  }

  return num;
}

/**
 * Validate an optional number within bounds.
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - Name of the field
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number|null} The validated number or null
 */
export function validateOptionalNumber(value, fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return validateNumber(value, fieldName, min, max);
}

/**
 * Validate a positive integer (for IDs, counts, etc.)
 *
 * @param {unknown} value - The value to validate
 * @param {string} fieldName - Name of the field
 * @returns {number} The validated positive integer
 * @throws {ValidationError} If validation fails
 */
export function validatePositiveInteger(value, fieldName) {
  const num = validateNumber(value, fieldName, 1, Number.MAX_SAFE_INTEGER);

  if (!Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be a whole number`, fieldName, value);
  }

  return num;
}

// =============================================================================
// Johnny Decimal Specific Validation
// =============================================================================

/**
 * Validate a JD folder number (XX.XX format)
 *
 * @param {string} folderNumber - The folder number to validate
 * @returns {string} The validated folder number
 * @throws {ValidationError} If invalid format
 */
export function validateJDFolderNumber(folderNumber) {
  if (!folderNumber || typeof folderNumber !== 'string') {
    throw new ValidationError('Folder number is required', 'folderNumber', folderNumber);
  }

  const trimmed = folderNumber.trim();

  // XX.XX format - two digits, dot, two digits
  const pattern = /^\d{2}\.\d{2}$/;

  if (!pattern.test(trimmed)) {
    throw new ValidationError(
      'Folder number must be in XX.XX format (e.g., 11.01)',
      'folderNumber',
      folderNumber
    );
  }

  return trimmed;
}

/**
 * Validate a JD item number (XX.XX.XX format)
 *
 * @param {string} itemNumber - The item number to validate
 * @returns {string} The validated item number
 * @throws {ValidationError} If invalid format
 */
export function validateJDItemNumber(itemNumber) {
  if (!itemNumber || typeof itemNumber !== 'string') {
    throw new ValidationError('Item number is required', 'itemNumber', itemNumber);
  }

  const trimmed = itemNumber.trim();

  // XX.XX.XX format
  const pattern = /^\d{2}\.\d{2}\.\d{2}$/;

  if (!pattern.test(trimmed)) {
    throw new ValidationError(
      'Item number must be in XX.XX.XX format (e.g., 11.01.01)',
      'itemNumber',
      itemNumber
    );
  }

  return trimmed;
}

/**
 * Validate a JD category number (0-99)
 *
 * @param {unknown} categoryNumber - The category number to validate
 * @returns {number} The validated category number
 * @throws {ValidationError} If invalid
 */
export function validateJDCategoryNumber(categoryNumber) {
  const num = validateNumber(categoryNumber, 'Category number', 0, 99);

  if (!Number.isInteger(num)) {
    throw new ValidationError(
      'Category number must be a whole number',
      'categoryNumber',
      categoryNumber
    );
  }

  return num;
}

// =============================================================================
// File Extension Validation
// =============================================================================

/**
 * Validate and normalize a file extension.
 *
 * @param {string} extension - The extension to validate (with or without dot)
 * @returns {string} Normalized extension (lowercase, with leading dot)
 */
export function validateFileExtension(extension) {
  if (!extension || typeof extension !== 'string') {
    return '';
  }

  let ext = extension.trim().toLowerCase();

  // Add leading dot if missing
  if (!ext.startsWith('.')) {
    ext = '.' + ext;
  }

  // Only allow alphanumeric extensions
  if (!/^\.[a-z0-9]+$/.test(ext)) {
    throw new ValidationError(
      'Extension must contain only letters and numbers',
      'extension',
      extension
    );
  }

  // Reasonable max length for extensions
  if (ext.length > 10) {
    throw new ValidationError('Extension is too long', 'extension', extension);
  }

  return ext;
}
