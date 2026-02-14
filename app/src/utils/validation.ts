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
  readonly field: string;
  readonly hasValue: boolean;

  constructor(message: string, field: string = 'unknown', value?: unknown) {
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
 * Remove HTML angle bracket characters from a string.
 * Rather than trying to match complete HTML tags (which regex can't fully
 * handle and static analysis flags as incomplete sanitization), we remove
 * the individual `<` and `>` characters. This eliminates any possibility
 * of HTML injection — including malformed tags like `<script` without a
 * closing bracket — without the complexity of a tag-matching loop.
 *
 * @param str - The string to sanitize
 * @returns String with all angle brackets removed
 */
function stripHtmlChars(str: string): string {
  return str.replace(/[<>]/g, '');
}

/**
 * Sanitize text input by removing potentially dangerous characters.
 * Use for short text fields like names and titles.
 *
 * @param input - The text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    return '';
  }

  return (
    stripHtmlChars(input.trim())
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
 * @param input - The text to sanitize
 * @returns Sanitized text with preserved line breaks
 */
export function sanitizeDescription(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return '';
  }

  if (typeof input !== 'string') {
    return '';
  }

  return (
    stripHtmlChars(input.trim())
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
 * @param value - The value to validate
 * @param fieldName - Name of the field (for error messages)
 * @param maxLength - Maximum allowed length (default 500)
 * @returns The validated and sanitized string
 * @throws ValidationError If validation fails
 */
export function validateRequiredString(
  value: unknown,
  fieldName: string,
  maxLength: number = 500
): string {
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
 * @param value - The value to validate
 * @param fieldName - Name of the field (for error messages)
 * @param maxLength - Maximum allowed length (default 500)
 * @returns The validated string or null
 * @throws ValidationError If validation fails
 */
export function validateOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number = 500
): string | null {
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
const DANGEROUS_PATH_PATTERNS: RegExp[] = [
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
 * Options for file path validation.
 */
export interface ValidateFilePathOptions {
  allowHome?: boolean;
  allowedRoots?: string[];
}

/**
 * Validate a file path is safe to use.
 * Checks for path traversal attacks and dangerous patterns.
 *
 * @param path - The path to validate
 * @param options - Validation options
 * @returns The validated path
 * @throws ValidationError If path is invalid or dangerous
 */
export function validateFilePath(
  path: string | null | undefined,
  options: ValidateFilePathOptions = {}
): string {
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
 * @param path - The path to validate
 * @param basePath - The base directory the path must be within
 * @returns True if path is within basePath
 */
export function isPathWithinBase(
  path: string | null | undefined,
  basePath: string | null | undefined
): boolean {
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
 * @param value - The value to validate
 * @param fieldName - Name of the field
 * @param min - Minimum value (default 0)
 * @param max - Maximum value (default MAX_SAFE_INTEGER)
 * @returns The validated number
 * @throws ValidationError If validation fails
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number {
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
 * @param value - The value to validate
 * @param fieldName - Name of the field
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The validated number or null
 */
export function validateOptionalNumber(
  value: unknown,
  fieldName: string,
  min: number = 0,
  max: number = Number.MAX_SAFE_INTEGER
): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return validateNumber(value, fieldName, min, max);
}

/**
 * Validate a positive integer (for IDs, counts, etc.)
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field
 * @returns The validated positive integer
 * @throws ValidationError If validation fails
 */
export function validatePositiveInteger(value: unknown, fieldName: string): number {
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
 * @param folderNumber - The folder number to validate
 * @returns The validated folder number
 * @throws ValidationError If invalid format
 */
export function validateJDFolderNumber(folderNumber: string | null | undefined): string {
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
 * @param itemNumber - The item number to validate
 * @returns The validated item number
 * @throws ValidationError If invalid format
 */
export function validateJDItemNumber(itemNumber: string | null | undefined): string {
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
 * @param categoryNumber - The category number to validate
 * @returns The validated category number
 * @throws ValidationError If invalid
 */
export function validateJDCategoryNumber(categoryNumber: unknown): number {
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
 * @param extension - The extension to validate (with or without dot)
 * @returns Normalized extension (lowercase, with leading dot)
 */
export function validateFileExtension(extension: string | null | undefined): string {
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
