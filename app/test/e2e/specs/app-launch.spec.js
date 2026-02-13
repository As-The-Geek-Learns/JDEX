// E2E tests for JDex app launch and initial state
import { test, expect } from '../fixtures/app.fixture.js';

test.describe('App Launch', () => {
  test('should launch the Electron app', async ({ electronApp }) => {
    // Verify app is running
    const isRunning = await electronApp.evaluate(({ app }) => {
      return app.isReady();
    });
    expect(isRunning).toBe(true);
  });

  test('should display the main window', async ({ window }) => {
    // Verify window is visible
    const isVisible = await window.isVisible('body');
    expect(isVisible).toBe(true);
  });

  test('should show the JDex logo and title', async ({ window }) => {
    // Look for the JDex branding
    const logo = window.locator('text=JDex').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
  });

  test('should display the sidebar navigation', async ({ window }) => {
    // Sidebar should be visible with navigation elements
    const sidebar = window.locator('aside, .sidebar, nav').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('should show quick action buttons', async ({ window }) => {
    // New Folder and New Item buttons should be visible
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    const newItemBtn = window.getByRole('button', { name: /new item/i });

    await expect(newFolderBtn).toBeVisible({ timeout: 10000 });
    await expect(newItemBtn).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Initial State', () => {
  test('should have default areas loaded', async ({ window }) => {
    // Default areas should be visible in the sidebar
    // The app seeds with default areas like "Personal Life", "Home Projects", etc.
    const areaSection = window.locator('text=/\\d{2}-\\d{2}/').first();
    await expect(areaSection).toBeVisible({ timeout: 15000 });
  });

  test('should display the home view by default', async ({ window }) => {
    // Main content area should show the home/overview
    const mainContent = window.locator('main, .content-area, [class*="flex-1"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should have a working search input', async ({ window }) => {
    // Search input should be present
    const searchInput = window.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Should be able to type in it
    await searchInput.fill('test search');
    await expect(searchInput).toHaveValue('test search');
  });
});

test.describe('Window Properties', () => {
  test('should have correct window title', async ({ window }) => {
    // Wait for the page to fully load and get the document title
    await window.waitForLoadState('domcontentloaded');
    const title = await window.title();

    // Title should contain JDex (page title is "JDex - Johnny Decimal Index")
    expect(title.toLowerCase()).toContain('jdex');
  });

  test('should have minimum window size', async ({ electronApp }) => {
    const size = await electronApp.evaluate(({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      const bounds = windows[0]?.getBounds();
      return { width: bounds?.width, height: bounds?.height };
    });

    // Window should meet minimum size requirements
    expect(size.width).toBeGreaterThanOrEqual(800);
    expect(size.height).toBeGreaterThanOrEqual(600);
  });
});
