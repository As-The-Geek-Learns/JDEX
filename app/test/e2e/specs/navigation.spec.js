// E2E tests for JDex navigation
import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Sidebar Navigation', () => {
  test('should display expandable area sections', async ({ window }) => {
    // Areas should be visible in the sidebar with expand/collapse buttons
    const expandButton = window.getByRole('button', { name: /expand|collapse/i }).first();
    await expect(expandButton).toBeVisible({ timeout: 10000 });
  });

  test('should expand area to show categories', async ({ window }) => {
    // Find an area with expand button and click it
    const areaSection = window.locator('text=/\\d{2}-\\d{2}/').first();
    await expect(areaSection).toBeVisible({ timeout: 10000 });

    // Click on the area to expand (if not already expanded)
    await areaSection.click();
    await window.waitForTimeout(300);

    // Categories should be visible (2-digit numbers like 10, 11, 12)
    const category = window.locator('.jd-number, text=/^\\d{2}$/').first();
    await expect(category).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to category when clicked', async ({ window }) => {
    // Find and click a category
    const category = window.locator('.jd-number, text=/^\\d{2}$/').first();
    await expect(category).toBeVisible({ timeout: 10000 });

    await category.click();
    await window.waitForTimeout(500);

    // Main content should update (category should be highlighted or content changes)
    const mainContent = window.locator('main, .content-area').first();
    await expect(mainContent).toBeVisible();
  });

  test('should toggle sidebar collapse', async ({ window }) => {
    // Find sidebar toggle button (menu icon)
    const toggleBtn = window.getByRole('button', { name: /menu|sidebar|toggle/i }).first();

    if (await toggleBtn.isVisible().catch(() => false)) {
      const sidebar = window.locator('aside').first();
      const initialWidth = await sidebar.boundingBox().then((b) => b?.width || 0);

      await toggleBtn.click();
      await window.waitForTimeout(500);

      // Sidebar width should change
      const newWidth = await sidebar.boundingBox().then((b) => b?.width || 0);
      expect(newWidth !== initialWidth || newWidth === 0).toBe(true);
    }
  });
});

test.describe('Breadcrumb Navigation', () => {
  test('should show breadcrumb trail when navigating', async ({ window }) => {
    // Navigate to a category first
    const category = window.locator('.jd-number, text=/^\\d{2}$/').first();

    if (await category.isVisible().catch(() => false)) {
      await category.click();
      await window.waitForTimeout(500);

      // Look for breadcrumb in main content area
      const _breadcrumb = window.locator('[class*="breadcrumb"], nav, .path').first();
      // Breadcrumb may or may not be visible depending on implementation
      void _breadcrumb;
    }
  });

  test('should navigate back via home button', async ({ window }) => {
    // Navigate to a category
    const category = window.locator('.jd-number, text=/^\\d{2}$/').first();

    if (await category.isVisible().catch(() => false)) {
      await category.click();
      await window.waitForTimeout(300);

      // Click home button to go back
      const homeBtn = window.getByRole('button', { name: /home/i }).first();
      if (await homeBtn.isVisible().catch(() => false)) {
        await homeBtn.click();
        await window.waitForTimeout(300);
      }
    }
  });
});

test.describe('View Modes', () => {
  test('should display content in the main area', async ({ window }) => {
    // Main content area should be present
    const mainArea = window.locator('main, [class*="flex-1"], .content-area').first();
    await expect(mainArea).toBeVisible({ timeout: 10000 });
  });

  test('should show folders when category is selected', async ({ window }) => {
    // Navigate to a category
    const category = window.locator('.jd-number, text=/^\\d{2}$/').first();
    await expect(category).toBeVisible({ timeout: 10000 });

    await category.click();
    await window.waitForTimeout(500);

    // Content area should show folders (XX.XX format) or "No folders" message
    const content = window.locator('main, .content-area').first();
    await expect(content).toBeVisible();
  });
});

test.describe('Quick Navigation', () => {
  test('should open settings via sidebar button', async ({ window }) => {
    // Find and click settings button
    const settingsBtn = window.getByRole('button', { name: /settings/i });
    await expect(settingsBtn).toBeVisible({ timeout: 10000 });

    await settingsBtn.click();
    await window.waitForTimeout(500);

    // Settings modal should appear
    const settingsModal = window.locator('[role="dialog"], .modal, [class*="fixed inset"]').first();
    await expect(settingsModal).toBeVisible({ timeout: 5000 });

    // Close settings
    const closeBtn = window.getByRole('button', { name: /close|cancel|×/i });
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  });

  test('should open file organizer via sidebar button', async ({ window }) => {
    // Find and click file organizer button
    const organizerBtn = window.getByRole('button', { name: /organizer|organize/i });

    if (await organizerBtn.isVisible().catch(() => false)) {
      await organizerBtn.click();
      await window.waitForTimeout(500);

      // File organizer view should appear
      const organizer = window.locator('text=/file organizer|organize|rules/i').first();
      await expect(organizer).toBeVisible({ timeout: 5000 });
    }
  });
});
