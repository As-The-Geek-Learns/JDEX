/**
 * Integration Test Setup
 *
 * Additional setup for integration tests that extends the base setup.js
 * Provides fs mocks, Electron IPC overrides, and integration-specific utilities.
 */

import { vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// File System Mock for Integration Tests
// =============================================================================

// In-memory file system state
let mockFileSystem = {};
let mockDirectoryExists = {};

/**
 * Mock fs module for integration tests
 * Provides in-memory file system simulation
 */
export const mockFs = {
  existsSync: vi.fn((path) => {
    return path in mockFileSystem || path in mockDirectoryExists;
  }),

  readdirSync: vi.fn((dir, options) => {
    const entries = Object.keys(mockFileSystem)
      .filter((path) => path.startsWith(dir) && path !== dir)
      .map((path) => {
        const relativePath = path.slice(dir.length).replace(/^\//, '');
        const name = relativePath.split('/')[0];
        return options?.withFileTypes
          ? {
              name,
              isFile: () => !mockDirectoryExists[`${dir}/${name}`],
              isDirectory: () => !!mockDirectoryExists[`${dir}/${name}`],
            }
          : name;
      });
    // Remove duplicates
    const seen = new Set();
    return entries.filter((e) => {
      const name = typeof e === 'string' ? e : e.name;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }),

  renameSync: vi.fn((oldPath, newPath) => {
    if (!(oldPath in mockFileSystem)) {
      const error = new Error(`ENOENT: no such file or directory, rename '${oldPath}'`);
      error.code = 'ENOENT';
      throw error;
    }
    mockFileSystem[newPath] = mockFileSystem[oldPath];
    delete mockFileSystem[oldPath];
  }),

  copyFileSync: vi.fn((src, dest) => {
    if (!(src in mockFileSystem)) {
      const error = new Error(`ENOENT: no such file or directory, copyfile '${src}'`);
      error.code = 'ENOENT';
      throw error;
    }
    mockFileSystem[dest] = { ...mockFileSystem[src] };
  }),

  unlinkSync: vi.fn((path) => {
    delete mockFileSystem[path];
  }),

  mkdirSync: vi.fn((path, options) => {
    mockDirectoryExists[path] = true;
  }),

  statSync: vi.fn((path) => {
    const file = mockFileSystem[path];
    const isDir = mockDirectoryExists[path];
    if (!file && !isDir) {
      const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
      error.code = 'ENOENT';
      throw error;
    }
    return {
      size: file?.size || 0,
      isFile: () => !!file,
      isDirectory: () => !!isDir,
      mtime: new Date(),
      ctime: new Date(),
    };
  }),

  readFileSync: vi.fn((path) => {
    if (!(path in mockFileSystem)) {
      const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
      error.code = 'ENOENT';
      throw error;
    }
    return mockFileSystem[path].content || '';
  }),

  writeFileSync: vi.fn((path, content) => {
    mockFileSystem[path] = { content, size: content.length };
  }),
};

/**
 * Mock path module for integration tests
 */
export const mockPath = {
  join: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
  basename: vi.fn((p, ext) => {
    const base = p.split('/').pop();
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    return base;
  }),
  extname: vi.fn((p) => {
    const match = p.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }),
  resolve: vi.fn((...args) => args.join('/')),
  sep: '/',
};

// =============================================================================
// Electron IPC Enhancement for Integration Tests
// =============================================================================

// Store for IPC handlers
const ipcHandlers = new Map();

/**
 * Enhanced IPC mock with handler registration
 */
export const mockIpcRenderer = {
  invoke: vi.fn(async (channel, ...args) => {
    const handler = ipcHandlers.get(channel);
    if (handler) {
      return handler(...args);
    }
    // Default responses for common channels
    switch (channel) {
      case 'get-platform':
        return 'darwin';
      case 'get-home-directory':
        return '/Users/testuser';
      case 'directory-exists':
        return mockDirectoryExists[args[0]] || false;
      case 'move-file':
        mockFs.renameSync(args[0], args[1]);
        return { success: true };
      case 'copy-file':
        mockFs.copyFileSync(args[0], args[1]);
        return { success: true };
      default:
        return null;
    }
  }),
  send: vi.fn(),
  on: vi.fn((channel, callback) => {
    ipcHandlers.set(channel, callback);
  }),
  removeListener: vi.fn((channel) => {
    ipcHandlers.delete(channel);
  }),
};

// Override the electron mock for integration tests
vi.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
}));

// =============================================================================
// Integration Test Utilities
// =============================================================================

/**
 * Set up mock file system with files
 * @param {Object} files - Map of path -> file data
 * @example
 * setupMockFileSystem({
 *   '/downloads/document.pdf': { size: 1024, content: 'PDF content' },
 *   '/downloads/image.jpg': { size: 2048 },
 * });
 */
export function setupMockFileSystem(files = {}) {
  mockFileSystem = { ...files };
}

/**
 * Set up mock directories
 * @param {string[]} directories - Array of directory paths
 */
export function setupMockDirectories(directories = []) {
  mockDirectoryExists = {};
  directories.forEach((dir) => {
    mockDirectoryExists[dir] = true;
  });
}

/**
 * Get current mock file system state
 */
export function getMockFileSystem() {
  return { ...mockFileSystem };
}

/**
 * Register a custom IPC handler for testing
 * @param {string} channel - IPC channel name
 * @param {Function} handler - Handler function
 */
export function registerIpcHandler(channel, handler) {
  ipcHandlers.set(channel, handler);
}

/**
 * Clear all registered IPC handlers
 */
export function clearIpcHandlers() {
  ipcHandlers.clear();
}

// =============================================================================
// Test Lifecycle for Integration Tests
// =============================================================================

beforeEach(() => {
  // Reset file system state
  mockFileSystem = {};
  mockDirectoryExists = {};

  // Clear IPC handlers
  ipcHandlers.clear();

  // Reset all fs mock implementations
  Object.values(mockFs).forEach((fn) => {
    if (typeof fn.mockClear === 'function') {
      fn.mockClear();
    }
  });
});

afterEach(() => {
  // Cleanup
  mockFileSystem = {};
  mockDirectoryExists = {};
  ipcHandlers.clear();
});

// =============================================================================
// Window.require Mock for Electron Context
// =============================================================================

// Mock window.require for Node.js module access in Electron renderer
Object.defineProperty(window, 'require', {
  writable: true,
  value: vi.fn((module) => {
    switch (module) {
      case 'fs':
        return mockFs;
      case 'path':
        return mockPath;
      case 'electron':
        return { ipcRenderer: mockIpcRenderer };
      default:
        return {};
    }
  }),
});
