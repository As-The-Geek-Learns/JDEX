import { vi, beforeEach, afterEach, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend vitest expect with jest-dom matchers
expect.extend(matchers);

// ============================================================
// localStorage Mock
// ============================================================
let store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, value) => {
    store[key] = String(value);
  }),
  removeItem: vi.fn((key) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index) => Object.keys(store)[index] ?? null),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ============================================================
// Electron IPC Mock
// ============================================================
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));

// ============================================================
// Browser API Mocks
// ============================================================
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================
// sql.js Mock
// ============================================================
vi.mock('sql.js', async () => {
  const { MockDatabase, __setMockDbState } = await import(
    '../__mocks__/sql.js.js'
  );
  return {
    default: vi.fn(() =>
      Promise.resolve({
        Database: MockDatabase,
      })
    ),
    __setMockDbState,
  };
});

// ============================================================
// Test Lifecycle
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});
