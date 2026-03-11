/**
 * Tests for validation.js
 * Phase 1: Foundation (Pure Functions)
 * Target: 90% coverage
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  sanitizeText,
  sanitizeDescription,
  validateRequiredString,
  validateOptionalString,
  validateFilePath,
  isPathWithinBase,
  validateNumber,
  validateOptionalNumber,
  validatePositiveInteger,
  validateJDFolderNumber,
  validateJDItemNumber,
  validateJDCategoryNumber,
  validateFileExtension,
} from './validation.js';

// =============================================================================
// ValidationError Class
// =============================================================================

describe('ValidationError', () => {
  it('should create error with message', () => {
    const error = new ValidationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ValidationError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should store field name', () => {
    const error = new ValidationError('Test error', 'username');
    expect(error.field).toBe('username');
  });

  it('should default field to unknown', () => {
    const error = new ValidationError('Test error');
    expect(error.field).toBe('unknown');
  });

  it('should track whether value was provided (hasValue = true)', () => {
    const error = new ValidationError('Test error', 'field', 'some value');
    expect(error.hasValue).toBe(true);
  });

  it('should track whether value was provided (hasValue = false)', () => {
    const error = new ValidationError('Test error', 'field');
    expect(error.hasValue).toBe(false);
  });

  it('should handle null value as having value', () => {
    const error = new ValidationError('Test error', 'field', null);
    expect(error.hasValue).toBe(true);
  });
});

// =============================================================================
// Text Sanitization
// =============================================================================

describe('sanitizeText', () => {
  it('should return empty string for null', () => {
    expect(sanitizeText(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(sanitizeText(undefined)).toBe('');
  });

  it('should return empty string for non-string types', () => {
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText({})).toBe('');
    expect(sanitizeText([])).toBe('');
    expect(sanitizeText(true)).toBe('');
  });

  it('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('should normalize multiple spaces to single space', () => {
    expect(sanitizeText('hello    world')).toBe('hello world');
  });

  it('should remove HTML angle brackets', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('should remove lone angle brackets', () => {
    expect(sanitizeText('test < > test')).toBe('test test');
  });

  it('should remove control characters', () => {
    expect(sanitizeText('hello\x00world')).toBe('helloworld');
    expect(sanitizeText('test\x1Fvalue')).toBe('testvalue');
  });

  it('should preserve normal text', () => {
    expect(sanitizeText('Hello World 123!')).toBe('Hello World 123!');
  });

  it('should handle empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should handle string with only spaces', () => {
    expect(sanitizeText('   ')).toBe('');
  });
});

describe('sanitizeDescription', () => {
  it('should return empty string for null', () => {
    expect(sanitizeDescription(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(sanitizeDescription(undefined)).toBe('');
  });

  it('should return empty string for non-string types', () => {
    expect(sanitizeDescription(123)).toBe('');
    expect(sanitizeDescription({})).toBe('');
  });

  it('should preserve single line breaks', () => {
    expect(sanitizeDescription('line1\nline2')).toBe('line1\nline2');
  });

  it('should preserve double line breaks', () => {
    expect(sanitizeDescription('para1\n\npara2')).toBe('para1\n\npara2');
  });

  it('should reduce triple+ line breaks to double', () => {
    expect(sanitizeDescription('para1\n\n\npara2')).toBe('para1\n\npara2');
    expect(sanitizeDescription('para1\n\n\n\n\npara2')).toBe('para1\n\npara2');
  });

  it('should remove HTML angle brackets', () => {
    expect(sanitizeDescription('<p>Hello</p>')).toBe('pHello/p');
  });

  it('should remove control characters except newlines', () => {
    expect(sanitizeDescription('hello\x00world')).toBe('helloworld');
  });

  it('should normalize multiple spaces to single', () => {
    expect(sanitizeDescription('hello    world')).toBe('hello world');
  });

  it('should trim the input', () => {
    expect(sanitizeDescription('  hello  ')).toBe('hello');
  });
});

// =============================================================================
// String Validation
// =============================================================================

describe('validateRequiredString', () => {
  it('should return sanitized string for valid input', () => {
    expect(validateRequiredString('hello', 'name')).toBe('hello');
  });

  it('should trim whitespace', () => {
    expect(validateRequiredString('  hello  ', 'name')).toBe('hello');
  });

  it('should throw for null', () => {
    expect(() => validateRequiredString(null, 'name')).toThrow(ValidationError);
    expect(() => validateRequiredString(null, 'name')).toThrow('name is required');
  });

  it('should throw for undefined', () => {
    expect(() => validateRequiredString(undefined, 'name')).toThrow(ValidationError);
    expect(() => validateRequiredString(undefined, 'name')).toThrow('name is required');
  });

  it('should throw for non-string types', () => {
    expect(() => validateRequiredString(123, 'age')).toThrow('age must be a string');
    expect(() => validateRequiredString({}, 'obj')).toThrow('obj must be a string');
  });

  it('should throw for empty string', () => {
    expect(() => validateRequiredString('', 'name')).toThrow('name cannot be empty');
  });

  it('should throw for whitespace-only string', () => {
    expect(() => validateRequiredString('   ', 'name')).toThrow('name cannot be empty');
  });

  it('should throw for string exceeding max length', () => {
    const longString = 'a'.repeat(501);
    expect(() => validateRequiredString(longString, 'bio')).toThrow(
      'bio cannot exceed 500 characters'
    );
  });

  it('should allow custom max length', () => {
    const string10 = 'a'.repeat(10);
    const string11 = 'a'.repeat(11);

    expect(validateRequiredString(string10, 'code', 10)).toBe(string10);
    expect(() => validateRequiredString(string11, 'code', 10)).toThrow(
      'code cannot exceed 10 characters'
    );
  });

  it('should sanitize the output', () => {
    expect(validateRequiredString('<b>test</b>', 'name')).toBe('btest/b');
  });
});

describe('validateOptionalString', () => {
  it('should return null for null', () => {
    expect(validateOptionalString(null, 'name')).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(validateOptionalString(undefined, 'name')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(validateOptionalString('', 'name')).toBeNull();
  });

  it('should return null for whitespace-only string', () => {
    expect(validateOptionalString('   ', 'name')).toBeNull();
  });

  it('should return sanitized string for valid input', () => {
    expect(validateOptionalString('hello', 'name')).toBe('hello');
  });

  it('should throw for non-string types', () => {
    expect(() => validateOptionalString(123, 'age')).toThrow('age must be a string');
  });

  it('should throw for string exceeding max length', () => {
    const longString = 'a'.repeat(501);
    expect(() => validateOptionalString(longString, 'bio')).toThrow(
      'bio cannot exceed 500 characters'
    );
  });

  it('should allow custom max length', () => {
    expect(validateOptionalString('short', 'code', 10)).toBe('short');
  });
});

// =============================================================================
// File Path Validation
// =============================================================================

describe('validateFilePath', () => {
  it('should return trimmed path for valid input', () => {
    expect(validateFilePath('/Users/test/file.txt')).toBe('/Users/test/file.txt');
  });

  it('should trim whitespace', () => {
    expect(validateFilePath('  /Users/test  ')).toBe('/Users/test');
  });

  it('should throw for null', () => {
    expect(() => validateFilePath(null)).toThrow('Path is required');
  });

  it('should throw for undefined', () => {
    expect(() => validateFilePath(undefined)).toThrow('Path is required');
  });

  it('should throw for empty string', () => {
    expect(() => validateFilePath('')).toThrow('Path is required');
  });

  it('should throw for whitespace-only string', () => {
    expect(() => validateFilePath('   ')).toThrow('Path cannot be empty');
  });

  it('should throw for path with parent directory traversal', () => {
    expect(() => validateFilePath('/Users/../etc/passwd')).toThrow('dangerous');
    expect(() => validateFilePath('../../../etc/passwd')).toThrow('dangerous');
  });

  it('should throw for path with null byte', () => {
    expect(() => validateFilePath('/Users/test\x00.txt')).toThrow('dangerous');
  });

  it('should throw for system paths', () => {
    expect(() => validateFilePath('/etc/passwd')).toThrow('dangerous');
    expect(() => validateFilePath('/var/log/syslog')).toThrow('dangerous');
    expect(() => validateFilePath('/usr/bin/bash')).toThrow('dangerous');
    expect(() => validateFilePath('/bin/sh')).toThrow('dangerous');
    expect(() => validateFilePath('/sbin/init')).toThrow('dangerous');
    expect(() => validateFilePath('/root/.bashrc')).toThrow('dangerous');
    expect(() => validateFilePath('/private/var/db')).toThrow('dangerous');
  });

  it('should throw for home directory by default', () => {
    expect(() => validateFilePath('~/Documents')).toThrow('dangerous');
  });

  it('should allow home directory when allowHome is true', () => {
    expect(validateFilePath('~/Documents', { allowHome: true })).toBe('~/Documents');
  });

  it('should validate against allowed roots', () => {
    const options = { allowedRoots: ['/Users/test', '/tmp'] };

    expect(validateFilePath('/Users/test/file.txt', options)).toBe('/Users/test/file.txt');
    expect(validateFilePath('/tmp/cache', options)).toBe('/tmp/cache');
    expect(() => validateFilePath('/opt/data', options)).toThrow('not within an allowed directory');
  });

  it('should allow exact match with allowed root', () => {
    const options = { allowedRoots: ['/Users/test'] };
    expect(validateFilePath('/Users/test', options)).toBe('/Users/test');
  });
});

describe('isPathWithinBase', () => {
  it('should return true for path within base', () => {
    expect(isPathWithinBase('/Users/test/docs/file.txt', '/Users/test')).toBe(true);
    expect(isPathWithinBase('/Users/test/a/b/c', '/Users/test')).toBe(true);
  });

  it('should return true for exact match', () => {
    expect(isPathWithinBase('/Users/test', '/Users/test')).toBe(true);
  });

  it('should return false for path outside base', () => {
    expect(isPathWithinBase('/Users/other/file.txt', '/Users/test')).toBe(false);
  });

  it('should return false for similar prefix but not child', () => {
    expect(isPathWithinBase('/Users/testuser/file.txt', '/Users/test')).toBe(false);
  });

  it('should return false for null path', () => {
    expect(isPathWithinBase(null, '/Users/test')).toBe(false);
  });

  it('should return false for null base', () => {
    expect(isPathWithinBase('/Users/test/file.txt', null)).toBe(false);
  });

  it('should handle trailing slashes', () => {
    expect(isPathWithinBase('/Users/test/file.txt/', '/Users/test/')).toBe(true);
    expect(isPathWithinBase('/Users/test/', '/Users/test')).toBe(true);
  });
});

// =============================================================================
// Numeric Validation
// =============================================================================

describe('validateNumber', () => {
  it('should return number for valid input', () => {
    expect(validateNumber(42, 'age')).toBe(42);
    expect(validateNumber(0, 'count')).toBe(0);
    expect(validateNumber(3.14, 'pi')).toBe(3.14);
  });

  it('should parse string numbers', () => {
    expect(validateNumber('42', 'age')).toBe(42);
    expect(validateNumber('3.14', 'pi')).toBe(3.14);
  });

  it('should throw for null', () => {
    expect(() => validateNumber(null, 'age')).toThrow('age is required');
  });

  it('should throw for undefined', () => {
    expect(() => validateNumber(undefined, 'age')).toThrow('age is required');
  });

  it('should throw for non-numeric string', () => {
    expect(() => validateNumber('abc', 'age')).toThrow('must be a valid number');
  });

  it('should throw for NaN', () => {
    expect(() => validateNumber(NaN, 'age')).toThrow('must be a valid number');
  });

  it('should throw for Infinity', () => {
    expect(() => validateNumber(Infinity, 'age')).toThrow('must be a valid number');
    expect(() => validateNumber(-Infinity, 'age')).toThrow('must be a valid number');
  });

  it('should throw for value below minimum', () => {
    expect(() => validateNumber(-1, 'count', 0)).toThrow('must be at least 0');
  });

  it('should throw for value above maximum', () => {
    expect(() => validateNumber(101, 'percentage', 0, 100)).toThrow('cannot exceed 100');
  });

  it('should allow custom min and max', () => {
    expect(validateNumber(50, 'score', 1, 100)).toBe(50);
    expect(validateNumber(1, 'score', 1, 100)).toBe(1);
    expect(validateNumber(100, 'score', 1, 100)).toBe(100);
  });
});

describe('validateOptionalNumber', () => {
  it('should return null for null', () => {
    expect(validateOptionalNumber(null, 'age')).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(validateOptionalNumber(undefined, 'age')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(validateOptionalNumber('', 'age')).toBeNull();
  });

  it('should return number for valid input', () => {
    expect(validateOptionalNumber(42, 'age')).toBe(42);
    expect(validateOptionalNumber('42', 'age')).toBe(42);
  });

  it('should validate within bounds', () => {
    expect(validateOptionalNumber(50, 'score', 0, 100)).toBe(50);
    expect(() => validateOptionalNumber(-1, 'count', 0)).toThrow('must be at least 0');
  });
});

describe('validatePositiveInteger', () => {
  it('should return integer for valid input', () => {
    expect(validatePositiveInteger(1, 'id')).toBe(1);
    expect(validatePositiveInteger(42, 'count')).toBe(42);
    expect(validatePositiveInteger('100', 'quantity')).toBe(100);
  });

  it('should throw for zero', () => {
    expect(() => validatePositiveInteger(0, 'id')).toThrow('must be at least 1');
  });

  it('should throw for negative numbers', () => {
    expect(() => validatePositiveInteger(-1, 'id')).toThrow('must be at least 1');
  });

  it('should throw for decimals', () => {
    expect(() => validatePositiveInteger(1.5, 'count')).toThrow('must be a whole number');
  });

  it('should throw for null', () => {
    expect(() => validatePositiveInteger(null, 'id')).toThrow('id is required');
  });
});

// =============================================================================
// Johnny Decimal Validation
// =============================================================================

describe('validateJDFolderNumber', () => {
  it('should return valid folder numbers', () => {
    expect(validateJDFolderNumber('11.01')).toBe('11.01');
    expect(validateJDFolderNumber('99.99')).toBe('99.99');
    expect(validateJDFolderNumber('00.00')).toBe('00.00');
  });

  it('should trim whitespace', () => {
    expect(validateJDFolderNumber('  11.01  ')).toBe('11.01');
  });

  it('should throw for null', () => {
    expect(() => validateJDFolderNumber(null)).toThrow('Folder number is required');
  });

  it('should throw for undefined', () => {
    expect(() => validateJDFolderNumber(undefined)).toThrow('Folder number is required');
  });

  it('should throw for empty string', () => {
    expect(() => validateJDFolderNumber('')).toThrow('Folder number is required');
  });

  it('should throw for non-string', () => {
    expect(() => validateJDFolderNumber(1101)).toThrow('Folder number is required');
  });

  it('should throw for invalid format - single digit', () => {
    expect(() => validateJDFolderNumber('1.01')).toThrow('XX.XX format');
  });

  it('should throw for invalid format - three digits', () => {
    expect(() => validateJDFolderNumber('111.01')).toThrow('XX.XX format');
  });

  it('should throw for invalid format - missing dot', () => {
    expect(() => validateJDFolderNumber('1101')).toThrow('XX.XX format');
  });

  it('should throw for invalid format - item number format', () => {
    expect(() => validateJDFolderNumber('11.01.01')).toThrow('XX.XX format');
  });

  it('should throw for letters', () => {
    expect(() => validateJDFolderNumber('AA.BB')).toThrow('XX.XX format');
  });
});

describe('validateJDItemNumber', () => {
  it('should return valid item numbers', () => {
    expect(validateJDItemNumber('11.01.01')).toBe('11.01.01');
    expect(validateJDItemNumber('99.99.99')).toBe('99.99.99');
    expect(validateJDItemNumber('00.00.00')).toBe('00.00.00');
  });

  it('should trim whitespace', () => {
    expect(validateJDItemNumber('  11.01.01  ')).toBe('11.01.01');
  });

  it('should throw for null', () => {
    expect(() => validateJDItemNumber(null)).toThrow('Item number is required');
  });

  it('should throw for undefined', () => {
    expect(() => validateJDItemNumber(undefined)).toThrow('Item number is required');
  });

  it('should throw for empty string', () => {
    expect(() => validateJDItemNumber('')).toThrow('Item number is required');
  });

  it('should throw for non-string', () => {
    expect(() => validateJDItemNumber(110101)).toThrow('Item number is required');
  });

  it('should throw for folder number format', () => {
    expect(() => validateJDItemNumber('11.01')).toThrow('XX.XX.XX format');
  });

  it('should throw for invalid format - single digit segments', () => {
    expect(() => validateJDItemNumber('1.1.1')).toThrow('XX.XX.XX format');
  });

  it('should throw for letters', () => {
    expect(() => validateJDItemNumber('AA.BB.CC')).toThrow('XX.XX.XX format');
  });
});

describe('validateJDCategoryNumber', () => {
  it('should return valid category numbers', () => {
    expect(validateJDCategoryNumber(0)).toBe(0);
    expect(validateJDCategoryNumber(42)).toBe(42);
    expect(validateJDCategoryNumber(99)).toBe(99);
  });

  it('should parse string numbers', () => {
    expect(validateJDCategoryNumber('42')).toBe(42);
  });

  it('should throw for negative numbers', () => {
    expect(() => validateJDCategoryNumber(-1)).toThrow('must be at least 0');
  });

  it('should throw for numbers over 99', () => {
    expect(() => validateJDCategoryNumber(100)).toThrow('cannot exceed 99');
  });

  it('should throw for decimals', () => {
    expect(() => validateJDCategoryNumber(42.5)).toThrow('must be a whole number');
  });

  it('should throw for null', () => {
    expect(() => validateJDCategoryNumber(null)).toThrow('is required');
  });
});

// =============================================================================
// File Extension Validation
// =============================================================================

describe('validateFileExtension', () => {
  it('should return normalized extension with dot', () => {
    expect(validateFileExtension('pdf')).toBe('.pdf');
    expect(validateFileExtension('PDF')).toBe('.pdf');
    expect(validateFileExtension('.pdf')).toBe('.pdf');
  });

  it('should lowercase the extension', () => {
    expect(validateFileExtension('TXT')).toBe('.txt');
    expect(validateFileExtension('.JPG')).toBe('.jpg');
  });

  it('should trim whitespace', () => {
    expect(validateFileExtension('  pdf  ')).toBe('.pdf');
  });

  it('should return empty string for null', () => {
    expect(validateFileExtension(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(validateFileExtension(undefined)).toBe('');
  });

  it('should return empty string for non-string', () => {
    expect(validateFileExtension(123)).toBe('');
  });

  it('should throw for extension with special characters', () => {
    expect(() => validateFileExtension('test!')).toThrow('only letters and numbers');
    expect(() => validateFileExtension('.test-file')).toThrow('only letters and numbers');
    expect(() => validateFileExtension('.test_file')).toThrow('only letters and numbers');
  });

  it('should throw for extension that is too long', () => {
    expect(() => validateFileExtension('verylongext')).toThrow('too long');
  });

  it('should allow reasonable length extensions', () => {
    expect(validateFileExtension('docx')).toBe('.docx');
    expect(validateFileExtension('xlsx')).toBe('.xlsx');
  });

  it('should allow numeric extensions', () => {
    expect(validateFileExtension('mp3')).toBe('.mp3');
    expect(validateFileExtension('7z')).toBe('.7z');
  });
});
