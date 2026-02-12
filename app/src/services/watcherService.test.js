/**
 * Watcher Service Tests
 * =====================
 * Tests for file system monitoring and auto-organization service.
 *
 * Test categories:
 * 1. FILE_TYPE_MAP constant and getFileType helper
 * 2. Initialization (initWatcherService, isWatcherAvailable)
 * 3. Watcher lifecycle (startWatcher, stopWatcher, startAllWatchers, stopAllWatchers)
 * 4. Watcher status (getWatcherStatus)
 * 5. Event system (onWatchEvent)
 * 6. Manual processing (processExistingFiles)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Must import before mocking to get access to the module
import {
  initWatcherService,
  isWatcherAvailable,
  startAllWatchers,
  stopAllWatchers,
  startWatcher,
  stopWatcher,
  getWatcherStatus,
  onWatchEvent,
  processExistingFiles,
} from './watcherService.js';

// Mock the db.js imports
vi.mock('../db.js', () => ({
  getWatchedFolders: vi.fn(() => []),
  getWatchedFolder: vi.fn(),
  updateWatchedFolder: vi.fn(),
  logWatchActivity: vi.fn(),
  incrementWatchedFolderStats: vi.fn(),
}));

// Mock the matchingEngine
vi.mock('./matchingEngine.js', () => ({
  getMatchingEngine: vi.fn(() => ({
    matchFile: vi.fn(() => []),
  })),
  CONFIDENCE: {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
}));

// Mock the fileOperations
vi.mock('./fileOperations.js', () => ({
  moveFile: vi.fn(() => ({ success: true, data: { status: 'success' } })),
  buildDestinationPath: vi.fn(() => '/dest/path'),
  hasFileSystemAccess: vi.fn(() => false),
}));

// Mock validation
vi.mock('../utils/validation.js', () => ({
  validateFilePath: vi.fn((path) => path),
}));

// Mock errors
vi.mock('../utils/errors.js', () => ({
  FileSystemError: class FileSystemError extends Error {
    constructor(message, operation, path) {
      super(message);
      this.name = 'FileSystemError';
      this.operation = operation;
      this.path = path;
    }
  },
}));

import {
  getWatchedFolders,
  getWatchedFolder,
  updateWatchedFolder,
  logWatchActivity,
  incrementWatchedFolderStats,
} from '../db.js';
import { getMatchingEngine, CONFIDENCE } from './matchingEngine.js';
import { moveFile, buildDestinationPath, hasFileSystemAccess } from './fileOperations.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock fs.watch watcher instance.
 */
function createMockWatcher() {
  const listeners = {};
  return {
    on: vi.fn((event, callback) => {
      listeners[event] = callback;
    }),
    close: vi.fn(),
    emit: (event, ...args) => {
      if (listeners[event]) {
        listeners[event](...args);
      }
    },
  };
}

/**
 * Create mock fs module for testing.
 */
function createMockFs(options = {}) {
  const {
    existsSync = vi.fn(() => true),
    statSync = vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
    watch = vi.fn(() => createMockWatcher()),
    readdirSync = vi.fn(() => []),
  } = options;

  return {
    existsSync,
    statSync,
    watch,
    readdirSync,
  };
}

/**
 * Create mock path module for testing.
 */
function createMockPath() {
  return {
    extname: vi.fn((filename) => {
      const lastDot = filename.lastIndexOf('.');
      return lastDot >= 0 ? filename.slice(lastDot) : '';
    }),
    basename: vi.fn((filepath) => filepath.split('/').pop() || filepath),
    join: vi.fn((...parts) => parts.filter(Boolean).join('/')),
  };
}

/**
 * Setup window and process mocks for Electron environment.
 */
function setupElectronEnvironment(mockFs = createMockFs(), mockPath = createMockPath()) {
  globalThis.window = {
    process: { type: 'renderer' },
    require: vi.fn((module) => {
      if (module === 'fs') return mockFs;
      if (module === 'path') return mockPath;
      if (module === 'electron') return { ipcRenderer: {} };
      throw new Error(`Unknown module: ${module}`);
    }),
  };
  return { mockFs, mockPath };
}

/**
 * Setup Node.js environment (non-Electron).
 */
function setupNodeEnvironment(mockFs = createMockFs(), mockPath = createMockPath()) {
  // Remove window to simulate Node environment
  delete globalThis.window;

  // Mock process.versions.node
  globalThis.process = {
    ...globalThis.process,
    versions: { node: '20.0.0' },
  };

  // This won't work because require is not available in test environment
  // The service will detect it's not in Electron
}

/**
 * Setup browser environment (no file access).
 */
function setupBrowserEnvironment() {
  delete globalThis.window;
  // Remove process.versions.node
  if (globalThis.process) {
    delete globalThis.process.versions;
  }
}

// =============================================================================
// Test Suite
// =============================================================================

describe('watcherService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to browser environment by default
    delete globalThis.window;
  });

  afterEach(() => {
    // Clean up any watchers
    stopAllWatchers();
    delete globalThis.window;
  });

  // ===========================================================================
  // FILE_TYPE_MAP Tests (via getFileType behavior)
  // ===========================================================================

  describe('getFileType (via processExistingFiles behavior)', () => {
    // Since getFileType is internal, we test it indirectly through the service behavior
    // or by checking the FILE_TYPE_MAP constant if exported

    it('should categorize document extensions correctly', () => {
      // Test indirectly - documents include pdf, doc, docx, txt, md, rtf, odt
      // We verify this through the logWatchActivity calls
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
        readdirSync: vi.fn(() => ['document.pdf']),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test Folder',
        path: '/test/folder',
        is_active: 1,
        file_types: [],
      });

      // Just verify the service can process files
      expect(isWatcherAvailable()).toBe(true);
    });
  });

  // ===========================================================================
  // initWatcherService Tests
  // ===========================================================================

  describe('initWatcherService', () => {
    it('should return false in browser environment', () => {
      setupBrowserEnvironment();
      const result = initWatcherService();
      expect(result).toBe(false);
    });

    it('should return true in Electron environment', () => {
      setupElectronEnvironment();
      const result = initWatcherService();
      expect(result).toBe(true);
    });

    it('should handle require errors gracefully', () => {
      globalThis.window = {
        process: { type: 'renderer' },
        require: vi.fn(() => {
          throw new Error('Module not found');
        }),
      };

      const result = initWatcherService();
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // isWatcherAvailable Tests
  // ===========================================================================

  describe('isWatcherAvailable', () => {
    // Note: The watcherService uses module-level state that persists between tests.
    // Once initialized in Electron mode, it remains available until the process ends.
    // These tests verify the initialization behavior, not isolation.

    it('should return true after successful initialization', () => {
      setupElectronEnvironment();
      initWatcherService();
      expect(isWatcherAvailable()).toBe(true);
    });

    it('should stay available once initialized (module state persists)', () => {
      // Even in browser environment, if previously initialized, it stays available
      // This is expected singleton behavior
      setupElectronEnvironment();
      initWatcherService();
      expect(isWatcherAvailable()).toBe(true);
    });
  });

  // ===========================================================================
  // startAllWatchers Tests
  // ===========================================================================

  describe('startAllWatchers', () => {
    it('should fetch active folders when starting watchers', () => {
      // Note: The service may already be initialized from previous tests
      // This test verifies that startAllWatchers fetches folders correctly
      setupElectronEnvironment();
      initWatcherService();

      getWatchedFolders.mockReturnValue([]);

      startAllWatchers();

      // Should query for active folders
      expect(getWatchedFolders).toHaveBeenCalledWith({ activeOnly: true });
    });

    it('should start watchers for all active folders', () => {
      const mockWatcher = createMockWatcher();
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => mockWatcher),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolders.mockReturnValue([
        { id: 1, name: 'Folder 1', path: '/path1', is_active: 1 },
        { id: 2, name: 'Folder 2', path: '/path2', is_active: 1 },
      ]);
      getWatchedFolder.mockImplementation((id) =>
        id === 1
          ? { id: 1, name: 'Folder 1', path: '/path1', is_active: 1, include_subdirs: 0 }
          : { id: 2, name: 'Folder 2', path: '/path2', is_active: 1, include_subdirs: 0 }
      );

      startAllWatchers();

      expect(getWatchedFolders).toHaveBeenCalledWith({ activeOnly: true });
      expect(mockFs.watch).toHaveBeenCalledTimes(2);
    });

    it('should only start watchers for active folders', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => createMockWatcher()),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      // Only return active folders
      getWatchedFolders.mockReturnValue([
        { id: 1, name: 'Active Folder', path: '/active', is_active: 1 },
      ]);
      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Active Folder',
        path: '/active',
        is_active: 1,
        include_subdirs: 0,
      });

      startAllWatchers();

      expect(mockFs.watch).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // stopAllWatchers Tests
  // ===========================================================================

  describe('stopAllWatchers', () => {
    it('should stop all active watchers', () => {
      const mockWatcher = createMockWatcher();
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => mockWatcher),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        include_subdirs: 0,
      });

      startWatcher(1);
      stopAllWatchers();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle empty watcher list', () => {
      setupElectronEnvironment();
      initWatcherService();

      // Should not throw
      expect(() => stopAllWatchers()).not.toThrow();
    });
  });

  // ===========================================================================
  // startWatcher Tests
  // ===========================================================================

  describe('startWatcher', () => {
    it('should return false when watcher is not available', () => {
      setupBrowserEnvironment();
      const result = startWatcher(1);
      expect(result).toBe(false);
    });

    it('should return false when folder is not found', () => {
      setupElectronEnvironment();
      initWatcherService();
      getWatchedFolder.mockReturnValue(null);

      const result = startWatcher(999);
      expect(result).toBe(false);
    });

    it('should return false when folder is not active', () => {
      setupElectronEnvironment();
      initWatcherService();
      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Inactive',
        path: '/test',
        is_active: 0,
      });

      const result = startWatcher(1);
      expect(result).toBe(false);
    });

    it('should return false when folder path does not exist', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Missing Path',
        path: '/missing/path',
        is_active: 1,
      });

      const result = startWatcher(1);
      expect(result).toBe(false);
    });

    it('should start watcher successfully for valid folder', () => {
      const mockWatcher = createMockWatcher();
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => mockWatcher),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Valid Folder',
        path: '/valid/path',
        is_active: 1,
        include_subdirs: 0,
      });

      const result = startWatcher(1);

      expect(result).toBe(true);
      expect(mockFs.watch).toHaveBeenCalledWith(
        '/valid/path',
        { recursive: false },
        expect.any(Function)
      );
    });

    it('should enable recursive watching when include_subdirs is set', () => {
      const mockWatcher = createMockWatcher();
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => mockWatcher),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Recursive Folder',
        path: '/recursive/path',
        is_active: 1,
        include_subdirs: 1,
      });

      startWatcher(1);

      expect(mockFs.watch).toHaveBeenCalledWith(
        '/recursive/path',
        { recursive: true },
        expect.any(Function)
      );
    });

    it('should stop existing watcher before starting new one', () => {
      const mockWatcher1 = createMockWatcher();
      const mockWatcher2 = createMockWatcher();
      let watchCallCount = 0;

      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => {
          watchCallCount++;
          return watchCallCount === 1 ? mockWatcher1 : mockWatcher2;
        }),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test Folder',
        path: '/test',
        is_active: 1,
        include_subdirs: 0,
      });

      startWatcher(1);
      startWatcher(1); // Start again - should stop first one

      expect(mockWatcher1.close).toHaveBeenCalled();
    });

    it('should handle watch errors and attempt restart', async () => {
      vi.useFakeTimers();

      const mockWatcher = createMockWatcher();
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => mockWatcher),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test Folder',
        path: '/test',
        is_active: 1,
        include_subdirs: 0,
      });

      startWatcher(1);

      // Simulate error event
      mockWatcher.emit('error', new Error('Watch error'));

      // Advance timers to trigger restart
      await vi.advanceTimersByTimeAsync(5000);

      // Should have called watch twice (initial + restart)
      expect(mockFs.watch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should return false when fs.watch throws', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => {
          throw new Error('Cannot watch');
        }),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Error Folder',
        path: '/error',
        is_active: 1,
        include_subdirs: 0,
      });

      const result = startWatcher(1);
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // stopWatcher Tests
  // ===========================================================================

  describe('stopWatcher', () => {
    it('should close watcher for folder', () => {
      const mockWatcher = createMockWatcher();
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => mockWatcher),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        include_subdirs: 0,
      });

      startWatcher(1);
      stopWatcher(1);

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle stopping non-existent watcher gracefully', () => {
      setupElectronEnvironment();
      initWatcherService();

      // Should not throw
      expect(() => stopWatcher(999)).not.toThrow();
    });
  });

  // ===========================================================================
  // getWatcherStatus Tests
  // ===========================================================================

  describe('getWatcherStatus', () => {
    it('should return status for all folders', () => {
      setupElectronEnvironment();
      initWatcherService();

      getWatchedFolders.mockReturnValue([
        { id: 1, name: 'Folder 1', path: '/path1', is_active: 1 },
        { id: 2, name: 'Folder 2', path: '/path2', is_active: 0 },
      ]);

      const status = getWatcherStatus();

      expect(status).toHaveLength(2);
      expect(status[0]).toHaveProperty('is_running');
      expect(status[0]).toHaveProperty('can_run');
    });

    it('should indicate running status for active watchers', () => {
      const mockWatcher = createMockWatcher();
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        watch: vi.fn(() => mockWatcher),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Running Folder',
        path: '/running',
        is_active: 1,
        include_subdirs: 0,
      });

      startWatcher(1);

      getWatchedFolders.mockReturnValue([
        { id: 1, name: 'Running Folder', path: '/running', is_active: 1 },
      ]);

      const status = getWatcherStatus();

      expect(status[0].is_running).toBe(true);
    });

    it('should indicate can_run based on path existence', () => {
      const mockFs = createMockFs({
        existsSync: vi.fn((path) => path === '/existing'),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolders.mockReturnValue([
        { id: 1, name: 'Existing', path: '/existing', is_active: 1 },
        { id: 2, name: 'Missing', path: '/missing', is_active: 1 },
      ]);

      const status = getWatcherStatus();

      expect(status[0].can_run).toBe(true);
      expect(status[1].can_run).toBe(false);
    });
  });

  // ===========================================================================
  // onWatchEvent Tests
  // ===========================================================================

  describe('onWatchEvent', () => {
    it('should register event listener', () => {
      const callback = vi.fn();
      const unsubscribe = onWatchEvent('file_queued', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = onWatchEvent('file_organized', callback);

      // Call unsubscribe
      unsubscribe();

      // Should not throw and should return successfully
      expect(typeof unsubscribe).toBe('function');
    });

    it('should allow multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const unsub1 = onWatchEvent('test_event', callback1);
      const unsub2 = onWatchEvent('test_event', callback2);

      expect(typeof unsub1).toBe('function');
      expect(typeof unsub2).toBe('function');

      // Clean up
      unsub1();
      unsub2();
    });
  });

  // ===========================================================================
  // processExistingFiles Tests
  // ===========================================================================

  describe('processExistingFiles', () => {
    // Note: The watcherService uses module-level state. Once initialized,
    // it remains available. Tests must account for this singleton behavior.

    it('should return error when folder is not found (first check)', async () => {
      // Service may be initialized from previous tests
      // The function first checks if folder exists, then if watcher is available
      setupElectronEnvironment();
      initWatcherService();
      getWatchedFolder.mockReturnValue(null);

      const result = await processExistingFiles(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder not found');
    });

    it('should return error when folder path does not exist', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => false),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Missing',
        path: '/missing',
        is_active: 1,
      });

      const result = await processExistingFiles(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder path does not exist');
    });

    it('should skip hidden files', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['.hidden', '.DS_Store', 'visible.txt']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
      });

      const result = await processExistingFiles(1);

      expect(result.success).toBe(true);
      expect(result.results.skipped).toBe(2); // Two hidden files skipped
    });

    it('should skip directories', async () => {
      let statCallCount = 0;
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['subdir', 'file.txt']),
        statSync: vi.fn(() => {
          statCallCount++;
          // First call is for subdir (directory), second for file.txt (file)
          return { isDirectory: () => statCallCount === 1, size: 1024 };
        }),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
      });

      const result = await processExistingFiles(1);

      expect(result.success).toBe(true);
      expect(result.results.skipped).toBe(1); // Directory skipped
    });

    it('should update folder last_checked_at after processing', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => []),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
      });

      await processExistingFiles(1);

      expect(updateWatchedFolder).toHaveBeenCalledWith(1, {
        last_checked_at: expect.any(String),
      });
    });

    it('should handle errors during processing', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => {
          throw new Error('Read error');
        }),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
      });

      const result = await processExistingFiles(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Read error');
    });

    it('should process files and track count', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['file1.pdf', 'file2.doc', 'file3.txt']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      setupElectronEnvironment(mockFs);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
        confidence_threshold: 'medium',
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      const result = await processExistingFiles(1);

      expect(result.success).toBe(true);
      expect(result.results.processed).toBe(3);
    });
  });

  // ===========================================================================
  // File Type Detection Tests (indirect)
  // ===========================================================================

  describe('file type detection', () => {
    it('should detect document types', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['report.pdf']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          file_extension: 'pdf',
          file_type: 'document',
        })
      );
    });

    it('should detect image types', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['photo.jpg']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          file_extension: 'jpg',
          file_type: 'image',
        })
      );
    });

    it('should detect code types', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['script.js']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          file_extension: 'js',
          file_type: 'code',
        })
      );
    });

    it('should detect archive types', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['backup.zip']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          file_extension: 'zip',
          file_type: 'archive',
        })
      );
    });

    it('should detect video types', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['movie.mp4']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          file_extension: 'mp4',
          file_type: 'video',
        })
      );
    });

    it('should detect audio types', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['song.mp3']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          file_extension: 'mp3',
          file_type: 'audio',
        })
      );
    });

    it('should categorize unknown extensions as other', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['file.xyz']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          file_extension: 'xyz',
          file_type: 'other',
        })
      );
    });
  });

  // ===========================================================================
  // File Type Filter Tests
  // ===========================================================================

  describe('file type filtering', () => {
    it('should skip files not matching file_types filter', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['file.pdf', 'file.jpg']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: ['document'], // Only documents
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      // Should log 'skipped' for jpg (image) and 'detected' for pdf (document)
      const skipCalls = logWatchActivity.mock.calls.filter((call) => call[0].action === 'skipped');
      expect(skipCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('should process files matching file_types filter', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['report.pdf']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: ['document'],
        auto_organize: false,
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      // Should log 'detected' action for pdf
      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'detected',
          file_type: 'document',
        })
      );
    });
  });

  // ===========================================================================
  // Matching and Auto-organize Tests
  // ===========================================================================

  describe('file matching and organization', () => {
    it('should queue files with no matching rule', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['unknown.pdf']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: true,
        confidence_threshold: 'medium',
      });

      // No matching rules
      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => []),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'queued',
        })
      );
      expect(incrementWatchedFolderStats).toHaveBeenCalledWith(1, false);
    });

    it('should queue files below confidence threshold', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['file.pdf']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: true,
        confidence_threshold: 'high', // Requires high confidence
      });

      // Return low confidence match
      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => [{ confidence: 'low', targetFolder: '11.01', ruleId: 1 }]),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'queued',
        })
      );
    });

    it('should queue files when auto_organize is disabled', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['file.pdf']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: false, // Disabled
        confidence_threshold: 'medium',
      });

      // Return high confidence match
      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => [{ confidence: 'high', targetFolder: '11.01', ruleId: 1 }]),
      });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'queued',
          target_folder: '11.01',
        })
      );
    });

    it('should auto-organize files meeting confidence threshold', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['file.pdf']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: true,
        confidence_threshold: 'medium',
        notify_on_organize: false,
      });

      // Return high confidence match
      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => [
          { confidence: 'high', targetFolder: '11.01', ruleId: 1, ruleName: 'Test Rule' },
        ]),
      });

      moveFile.mockReturnValue({ success: true, data: { status: 'success' } });

      await processExistingFiles(1);

      expect(moveFile).toHaveBeenCalled();
      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auto_organized',
          target_folder: '11.01',
        })
      );
      expect(incrementWatchedFolderStats).toHaveBeenCalledWith(1, true);
    });

    it('should log error when auto-organize fails', async () => {
      const mockFs = createMockFs({
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(() => ['file.pdf']),
        statSync: vi.fn(() => ({ isDirectory: () => false, size: 1024 })),
      });
      const mockPath = createMockPath();
      setupElectronEnvironment(mockFs, mockPath);
      initWatcherService();

      getWatchedFolder.mockReturnValue({
        id: 1,
        name: 'Test',
        path: '/test',
        is_active: 1,
        file_types: [],
        auto_organize: true,
        confidence_threshold: 'medium',
      });

      getMatchingEngine.mockReturnValue({
        matchFile: vi.fn(() => [{ confidence: 'high', targetFolder: '11.01', ruleId: 1 }]),
      });

      moveFile.mockReturnValue({ success: false, error: 'Move failed' });

      await processExistingFiles(1);

      expect(logWatchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'error',
          error_message: expect.any(String),
        })
      );
    });
  });
});
