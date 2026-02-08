/**
 * Tests for errors.js
 * Phase 1: Foundation (Pure Functions)
 * Target: 85% coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  FileSystemError,
  DatabaseError,
  CloudDriveError,
  OrganizationError,
  sanitizeErrorForUser,
  LogLevel,
  logError,
  withErrorHandling,
  Result,
} from './errors.js';

// =============================================================================
// AppError Class
// =============================================================================

describe('AppError', () => {
  it('should create error with message', () => {
    const error = new AppError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('AppError');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have default code', () => {
    const error = new AppError('Test error');
    expect(error.code).toBe('APP_ERROR');
  });

  it('should accept custom code', () => {
    const error = new AppError('Test error', 'CUSTOM_CODE');
    expect(error.code).toBe('CUSTOM_CODE');
  });

  it('should accept details', () => {
    const error = new AppError('Test error', 'CODE', { extra: 'info' });
    expect(error.details).toEqual({ extra: 'info' });
  });

  it('should have timestamp', () => {
    const before = new Date().toISOString();
    const error = new AppError('Test error');
    const after = new Date().toISOString();

    expect(error.timestamp).toBeDefined();
    expect(error.timestamp >= before).toBe(true);
    expect(error.timestamp <= after).toBe(true);
  });

  it('should provide safe log object', () => {
    const error = new AppError('Test error', 'CODE', { sensitive: 'data' });
    const logObj = error.toLogObject();

    expect(logObj.name).toBe('AppError');
    expect(logObj.code).toBe('CODE');
    expect(logObj.message).toBe('Test error');
    expect(logObj.timestamp).toBeDefined();
    expect(logObj.details).toBeUndefined(); // Should not include details
  });
});

// =============================================================================
// FileSystemError Class
// =============================================================================

describe('FileSystemError', () => {
  it('should create error with message', () => {
    const error = new FileSystemError('File not found');
    expect(error.message).toBe('File not found');
    expect(error.name).toBe('FileSystemError');
    expect(error.code).toBe('FILE_SYSTEM_ERROR');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should store operation type', () => {
    const error = new FileSystemError('Error', 'read');
    expect(error.operation).toBe('read');
  });

  it('should default operation to unknown', () => {
    const error = new FileSystemError('Error');
    expect(error.operation).toBe('unknown');
  });

  it('should track whether path was provided', () => {
    const errorWithPath = new FileSystemError('Error', 'read', '/some/path');
    const errorWithoutPath = new FileSystemError('Error', 'read');

    expect(errorWithPath.hasPath).toBe(true);
    expect(errorWithoutPath.hasPath).toBe(false);
  });

  describe('getUserMessage', () => {
    it('should return message for read operation', () => {
      const error = new FileSystemError('Error', 'read');
      expect(error.getUserMessage()).toContain('read');
      expect(error.getUserMessage()).toContain('permission');
    });

    it('should return message for write operation', () => {
      const error = new FileSystemError('Error', 'write');
      expect(error.getUserMessage()).toContain('save');
    });

    it('should return message for move operation', () => {
      const error = new FileSystemError('Error', 'move');
      expect(error.getUserMessage()).toContain('move');
    });

    it('should return message for delete operation', () => {
      const error = new FileSystemError('Error', 'delete');
      expect(error.getUserMessage()).toContain('delete');
    });

    it('should return message for scan operation', () => {
      const error = new FileSystemError('Error', 'scan');
      expect(error.getUserMessage()).toContain('scan');
    });

    it('should return message for create operation', () => {
      const error = new FileSystemError('Error', 'create');
      expect(error.getUserMessage()).toContain('create');
    });

    it('should return generic message for unknown operation', () => {
      const error = new FileSystemError('Error', 'unknown');
      expect(error.getUserMessage()).toContain('file operation failed');
    });

    it('should handle unrecognized operations', () => {
      const error = new FileSystemError('Error', 'something_else');
      expect(error.getUserMessage()).toContain('file operation failed');
    });
  });
});

// =============================================================================
// DatabaseError Class
// =============================================================================

describe('DatabaseError', () => {
  it('should create error with message', () => {
    const error = new DatabaseError('Query failed');
    expect(error.message).toBe('Query failed');
    expect(error.name).toBe('DatabaseError');
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should store operation type', () => {
    const error = new DatabaseError('Error', 'query');
    expect(error.operation).toBe('query');
  });

  it('should default operation to unknown', () => {
    const error = new DatabaseError('Error');
    expect(error.operation).toBe('unknown');
  });

  describe('getUserMessage', () => {
    it('should return message for query operation', () => {
      const error = new DatabaseError('Error', 'query');
      expect(error.getUserMessage()).toContain('retrieve data');
    });

    it('should return message for insert operation', () => {
      const error = new DatabaseError('Error', 'insert');
      expect(error.getUserMessage()).toContain('save the new item');
    });

    it('should return message for update operation', () => {
      const error = new DatabaseError('Error', 'update');
      expect(error.getUserMessage()).toContain('update');
    });

    it('should return message for delete operation', () => {
      const error = new DatabaseError('Error', 'delete');
      expect(error.getUserMessage()).toContain('delete');
    });

    it('should return message for connect operation', () => {
      const error = new DatabaseError('Error', 'connect');
      expect(error.getUserMessage()).toContain('connect');
    });

    it('should return message for migrate operation', () => {
      const error = new DatabaseError('Error', 'migrate');
      expect(error.getUserMessage()).toContain('update failed');
    });

    it('should return generic message for unknown operation', () => {
      const error = new DatabaseError('Error', 'unknown');
      expect(error.getUserMessage()).toContain('database error');
    });
  });
});

// =============================================================================
// CloudDriveError Class
// =============================================================================

describe('CloudDriveError', () => {
  it('should create error with message', () => {
    const error = new CloudDriveError('Sync failed');
    expect(error.message).toBe('Sync failed');
    expect(error.name).toBe('CloudDriveError');
    expect(error.code).toBe('CLOUD_DRIVE_ERROR');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should store drive name and operation', () => {
    const error = new CloudDriveError('Error', 'iCloud', 'sync');
    expect(error.driveName).toBe('iCloud');
    expect(error.operation).toBe('sync');
  });

  it('should default to unknown', () => {
    const error = new CloudDriveError('Error');
    expect(error.driveName).toBe('unknown');
    expect(error.operation).toBe('unknown');
  });

  describe('getUserMessage', () => {
    it('should include drive name in message', () => {
      const error = new CloudDriveError('Error', 'Dropbox', 'sync');
      expect(error.getUserMessage()).toContain('Dropbox');
    });

    it('should use "cloud drive" for unknown drive', () => {
      const error = new CloudDriveError('Error', 'unknown', 'sync');
      expect(error.getUserMessage()).toContain('cloud drive');
    });

    it('should return message for detect operation', () => {
      const error = new CloudDriveError('Error', 'iCloud', 'detect');
      expect(error.getUserMessage()).toContain('detect');
    });

    it('should return message for connect operation', () => {
      const error = new CloudDriveError('Error', 'OneDrive', 'connect');
      expect(error.getUserMessage()).toContain('connect');
    });

    it('should return message for sync operation', () => {
      const error = new CloudDriveError('Error', 'Dropbox', 'sync');
      expect(error.getUserMessage()).toContain('sync');
    });

    it('should return message for read operation', () => {
      const error = new CloudDriveError('Error', 'iCloud', 'read');
      expect(error.getUserMessage()).toContain('read');
    });

    it('should return message for write operation', () => {
      const error = new CloudDriveError('Error', 'iCloud', 'write');
      expect(error.getUserMessage()).toContain('write');
    });

    it('should return generic message for unknown operation', () => {
      const error = new CloudDriveError('Error', 'iCloud', 'unknown');
      expect(error.getUserMessage()).toContain('error occurred');
    });
  });
});

// =============================================================================
// OrganizationError Class
// =============================================================================

describe('OrganizationError', () => {
  it('should create error with message', () => {
    const error = new OrganizationError('Match failed');
    expect(error.message).toBe('Match failed');
    expect(error.name).toBe('OrganizationError');
    expect(error.code).toBe('ORGANIZATION_ERROR');
    expect(error).toBeInstanceOf(AppError);
  });

  it('should store operation type', () => {
    const error = new OrganizationError('Error', 'match');
    expect(error.operation).toBe('match');
  });

  describe('getUserMessage', () => {
    it('should return message for match operation', () => {
      const error = new OrganizationError('Error', 'match');
      expect(error.getUserMessage()).toContain('matching folder');
    });

    it('should return message for move operation', () => {
      const error = new OrganizationError('Error', 'move');
      expect(error.getUserMessage()).toContain('organize');
    });

    it('should return message for rule operation', () => {
      const error = new OrganizationError('Error', 'rule');
      expect(error.getUserMessage()).toContain('rule');
    });

    it('should return message for scan operation', () => {
      const error = new OrganizationError('Error', 'scan');
      expect(error.getUserMessage()).toContain('scan');
    });

    it('should return message for conflict operation', () => {
      const error = new OrganizationError('Error', 'conflict');
      expect(error.getUserMessage()).toContain('already exists');
    });

    it('should return generic message for unknown operation', () => {
      const error = new OrganizationError('Error', 'unknown');
      expect(error.getUserMessage()).toContain('organization error');
    });
  });
});

// =============================================================================
// sanitizeErrorForUser
// =============================================================================

describe('sanitizeErrorForUser', () => {
  it('should return generic message for null', () => {
    expect(sanitizeErrorForUser(null)).toContain('unexpected error');
  });

  it('should return generic message for undefined', () => {
    expect(sanitizeErrorForUser(undefined)).toContain('unexpected error');
  });

  it('should use getUserMessage for FileSystemError', () => {
    const error = new FileSystemError('Internal error', 'read');
    const result = sanitizeErrorForUser(error);
    expect(result).toContain('read');
    expect(result).not.toContain('Internal');
  });

  it('should use getUserMessage for DatabaseError', () => {
    const error = new DatabaseError('SQL syntax error', 'query');
    const result = sanitizeErrorForUser(error);
    expect(result).toContain('retrieve data');
    expect(result).not.toContain('SQL');
  });

  it('should use getUserMessage for CloudDriveError', () => {
    const error = new CloudDriveError('API error', 'iCloud', 'sync');
    const result = sanitizeErrorForUser(error);
    expect(result).toContain('iCloud');
    expect(result).not.toContain('API');
  });

  it('should use getUserMessage for OrganizationError', () => {
    const error = new OrganizationError('Internal error', 'match');
    const result = sanitizeErrorForUser(error);
    expect(result).toContain('matching folder');
    expect(result).not.toContain('Internal');
  });

  it('should pass through ValidationError message', () => {
    // Create a mock ValidationError
    const error = new Error('Field is required');
    error.name = 'ValidationError';
    const result = sanitizeErrorForUser(error);
    expect(result).toBe('Field is required');
  });

  it('should handle string input', () => {
    const result = sanitizeErrorForUser('Simple error message');
    expect(result).toBe('Simple error message');
  });

  // Parameterized tests for path redaction (reduces duplication)
  it.each([
    ['macOS', '/Users/james/Documents/secret.txt', 'james', '/Users/'],
    ['Windows', 'C:\\Users\\james\\Documents\\secret.txt', 'james', 'C:\\Users'],
    ['Linux', '/home/james/Documents/secret.txt', 'james', '/home/'],
  ])('should redact %s user paths', (_platform, path, username, pathPrefix) => {
    const error = new Error(`File not found: ${path}`);
    const result = sanitizeErrorForUser(error);
    expect(result).toContain('[redacted]');
    expect(result).not.toContain(username);
    if (pathPrefix) {
      expect(result).not.toContain(pathPrefix);
    }
  });

  // Parameterized tests for database error redaction
  it.each([
    ['SQLite references', 'SQLite error: database is locked', 'SQLite'],
    ['SQL syntax errors', 'sql syntax error near SELECT', 'syntax'],
    ['constraint errors', 'constraint violation: UNIQUE', 'constraint'],
  ])('should redact %s', (_type, message, sensitiveText) => {
    const error = new Error(message);
    const result = sanitizeErrorForUser(error);
    expect(result).toContain('[redacted]');
    expect(result.toLowerCase()).not.toContain(sensitiveText.toLowerCase());
  });

  // Parameterized tests for Node.js error codes
  it.each([
    ['ENOENT', 'ENOENT: no such file or directory'],
    ['EACCES', 'EACCES: permission denied'],
    ['errno', 'errno 13: permission denied'],
  ])('should redact %s errors', (code, message) => {
    const error = new Error(message);
    const result = sanitizeErrorForUser(error);
    expect(result).toContain('[redacted]');
    if (code !== 'errno') {
      expect(result).not.toContain(code);
    }
  });

  it('should redact stack traces', () => {
    const error = new Error('Error occurred');
    error.message =
      'Error at Object.readFile (fs.js:123:45) at readFileSync (/path/to/file.js:10:20)';
    const result = sanitizeErrorForUser(error);
    expect(result).not.toContain('Object.readFile');
    expect(result).not.toContain('fs.js');
  });

  it('should return generic message for heavily redacted text', () => {
    const error = new Error('/Users/james/ENOENT errno syscall');
    const result = sanitizeErrorForUser(error);
    expect(result).toBe('An error occurred. Please try again.');
  });

  it('should truncate long messages', () => {
    const longMessage = 'a'.repeat(300);
    const result = sanitizeErrorForUser(new Error(longMessage));
    expect(result.length).toBeLessThanOrEqual(203); // 200 + '...'
    expect(result).toContain('...');
  });

  it('should handle error without message', () => {
    const error = new Error();
    const result = sanitizeErrorForUser(error);
    expect(result).toBe('An error occurred. Please try again.');
  });
});

// =============================================================================
// LogLevel Constants
// =============================================================================

describe('LogLevel', () => {
  it('should have DEBUG level', () => {
    expect(LogLevel.DEBUG).toBe('debug');
  });

  it('should have INFO level', () => {
    expect(LogLevel.INFO).toBe('info');
  });

  it('should have WARN level', () => {
    expect(LogLevel.WARN).toBe('warn');
  });

  it('should have ERROR level', () => {
    expect(LogLevel.ERROR).toBe('error');
  });
});

// =============================================================================
// logError Function
// =============================================================================

describe('logError', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Unstub env first - less likely to throw
    // Ensures cleanup even if mockRestore() fails
    vi.unstubAllEnvs();
    consoleErrorSpy.mockRestore();
  });

  it('should log error in development mode with full details', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const error = new AppError('Test error', 'TEST_CODE');

    logError(error, 'TestContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[JDex Error]', expect.any(Object));
    const loggedObj = consoleErrorSpy.mock.calls[0][1];
    expect(loggedObj.message).toBe('Test error');
    expect(loggedObj.context).toBe('TestContext');
    expect(loggedObj.stack).toBeDefined();
  });

  it('should log sanitized error in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const error = new FileSystemError('Error at /Users/james/file', 'read');

    logError(error, 'TestContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith('[JDex Error]', expect.any(String));
    const loggedStr = consoleErrorSpy.mock.calls[0][1];
    expect(loggedStr).not.toContain('/Users/james');
  });

  it('should include error name and code', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const error = new DatabaseError('Query failed', 'query');

    logError(error, 'Database');

    const loggedObj = consoleErrorSpy.mock.calls[0][1];
    expect(loggedObj.errorName).toBe('DatabaseError');
    expect(loggedObj.errorCode).toBe('DATABASE_ERROR');
  });

  it('should use default context', () => {
    vi.stubEnv('NODE_ENV', 'development');
    logError(new Error('Test'));

    const loggedObj = consoleErrorSpy.mock.calls[0][1];
    expect(loggedObj.context).toBe('unknown');
  });

  it('should use specified log level', () => {
    vi.stubEnv('NODE_ENV', 'development');
    logError(new Error('Test'), 'Context', LogLevel.WARN);

    const loggedObj = consoleErrorSpy.mock.calls[0][1];
    expect(loggedObj.level).toBe('warn');
  });

  it('should handle null error', () => {
    vi.stubEnv('NODE_ENV', 'development');
    logError(null, 'Context');

    const loggedObj = consoleErrorSpy.mock.calls[0][1];
    expect(loggedObj.errorName).toBe('Error');
    expect(loggedObj.errorCode).toBe('UNKNOWN');
  });
});

// =============================================================================
// withErrorHandling Function
// =============================================================================

describe('withErrorHandling', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return result from successful function', async () => {
    const fn = async (x) => x * 2;
    const wrapped = withErrorHandling(fn, 'test');

    const result = await wrapped(5);
    expect(result).toBe(10);
  });

  it('should log error when function throws', async () => {
    const fn = async () => {
      throw new Error('Test failure');
    };
    const wrapped = withErrorHandling(fn, 'TestContext');

    await expect(wrapped()).rejects.toThrow('Test failure');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should re-throw the original error', async () => {
    const originalError = new DatabaseError('DB down', 'connect');
    const fn = async () => {
      throw originalError;
    };
    const wrapped = withErrorHandling(fn, 'Database');

    try {
      await wrapped();
    } catch (error) {
      expect(error).toBe(originalError);
    }
  });

  it('should pass all arguments to wrapped function', async () => {
    const fn = async (a, b, c) => a + b + c;
    const wrapped = withErrorHandling(fn, 'test');

    const result = await wrapped(1, 2, 3);
    expect(result).toBe(6);
  });
});

// =============================================================================
// Result Helper
// =============================================================================

describe('Result', () => {
  describe('ok', () => {
    it('should create success result with data', () => {
      const result = Result.ok({ id: 1, name: 'Test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
      expect(result.error).toBeNull();
      expect(result.userMessage).toBeNull();
    });

    it('should handle null data', () => {
      const result = Result.ok(null);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle array data', () => {
      const result = Result.ok([1, 2, 3]);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('error', () => {
    it('should create error result', () => {
      const error = new Error('Something went wrong');
      const result = Result.error(error);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe(error);
      expect(result.userMessage).toBeDefined();
    });

    it('should use custom user message', () => {
      const error = new Error('Internal error');
      const result = Result.error(error, 'Please try again');

      expect(result.userMessage).toBe('Please try again');
    });

    it('should sanitize error message if no custom message', () => {
      const error = new Error('Error at /Users/james/file');
      const result = Result.error(error);

      expect(result.userMessage).not.toContain('/Users/james');
    });

    it('should use custom error message for our error types', () => {
      const error = new FileSystemError('Internal', 'read');
      const result = Result.error(error);

      expect(result.userMessage).toContain('read');
      expect(result.userMessage).not.toContain('Internal');
    });
  });
});
