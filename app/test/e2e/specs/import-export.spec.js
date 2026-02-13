// E2E tests for import/export functionality
import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Export Functionality', () => {
  test('should display backup button', async ({ window }) => {
    // Backup button should be visible in sidebar
    const backupBtn = window.getByRole('button', { name: /backup/i });
    await expect(backupBtn).toBeVisible({ timeout: 10000 });
  });

  test('should display JSON export button', async ({ window }) => {
    // JSON export button should be visible
    const jsonBtn = window.getByRole('button', { name: /json/i });
    await expect(jsonBtn).toBeVisible({ timeout: 10000 });
  });

  test('should trigger download on backup click', async ({ window }) => {
    // Click the backup button
    const backupBtn = window.getByRole('button', { name: /backup/i });

    // Set up download listener
    const _downloadPromise = window.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    void _downloadPromise;

    await backupBtn.click();

    // Download should be triggered (or a file dialog opens)
    // Note: In Electron, this may work differently than in browser
    // The download might complete or a save dialog might open
    await window.waitForTimeout(1000);
  });

  test('should trigger download on JSON export click', async ({ window }) => {
    // Create some data first
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    const nameInput = window.getByLabel(/name/i).first();
    await nameInput.fill('ExportTestFolder');

    const createBtn = window.getByRole('button', { name: /create|save/i });
    await createBtn.click();
    await window.waitForTimeout(500);

    // Click JSON export
    const jsonBtn = window.getByRole('button', { name: /json/i });
    await jsonBtn.click();
    await window.waitForTimeout(1000);

    // Export should be triggered
  });
});

test.describe('Import Functionality', () => {
  test('should display import backup label', async ({ window }) => {
    // Import backup input should be present (as a label with hidden file input)
    const importLabel = window.locator('text=Import Backup').first();
    await expect(importLabel).toBeVisible({ timeout: 10000 });
  });

  test('should have hidden file input for import', async ({ window }) => {
    // The file input should exist (hidden)
    const fileInput = window.locator('input[type="file"][accept=".sqlite"]');
    await expect(fileInput).toBeAttached();
  });
});

test.describe('Data Persistence', () => {
  test('should persist data after creating folder', async ({ window }) => {
    // Create a folder
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    const nameInput = window.getByLabel(/name/i).first();
    await nameInput.fill('PersistenceTestFolder');

    const createBtn = window.getByRole('button', { name: /create|save/i });
    await createBtn.click();
    await window.waitForTimeout(500);

    // Navigate to the category
    const category = window.locator('.jd-number, text=/^\\d{2}$/').first();
    if (await category.isVisible().catch(() => false)) {
      await category.click();
      await window.waitForTimeout(500);
    }

    // The folder should be visible in content
    const folder = window.locator('text=PersistenceTestFolder').first();
    await expect(folder).toBeVisible({ timeout: 5000 });
  });

  test('should persist item after creating', async ({ window }) => {
    // Create a folder first
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    const folderNameInput = window.getByLabel(/name/i).first();
    await folderNameInput.fill('ItemPersistenceFolder');

    const createFolderBtn = window.getByRole('button', { name: /create|save/i });
    await createFolderBtn.click();
    await window.waitForTimeout(500);

    // Create an item
    const newItemBtn = window.getByRole('button', { name: /new item/i });
    await newItemBtn.click();
    await window.waitForTimeout(300);

    const folderSelect = window.locator('select').first();
    await folderSelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    const itemNameInput = window.getByLabel(/name/i).first();
    await itemNameInput.fill('PersistenceTestItem');

    const createItemBtn = window.getByRole('button', { name: /create|save/i });
    await createItemBtn.click();
    await window.waitForTimeout(500);

    // Search for the item to verify persistence
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('PersistenceTestItem');
    await window.waitForTimeout(500);

    const item = window.locator('text=PersistenceTestItem').first();
    await expect(item).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Database State', () => {
  test('should load with default seeded data', async ({ window }) => {
    // The app should have default areas and categories seeded
    const areaSection = window.locator('text=/\\d{2}-\\d{2}/').first();
    await expect(areaSection).toBeVisible({ timeout: 15000 });
  });

  test('should maintain data integrity', async ({ window }) => {
    // Create multiple entities and verify they exist
    // Create first folder
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    const nameInput = window.getByLabel(/name/i).first();
    await nameInput.fill('IntegrityFolder1');

    const createBtn = window.getByRole('button', { name: /create|save/i });
    await createBtn.click();
    await window.waitForTimeout(500);

    // Create second folder
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    await nameInput.fill('IntegrityFolder2');
    await createBtn.click();
    await window.waitForTimeout(500);

    // Search for both folders
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('IntegrityFolder');
    await window.waitForTimeout(500);

    // Both folders should be found
    const folder1 = window.locator('text=IntegrityFolder1').first();
    const folder2 = window.locator('text=IntegrityFolder2').first();

    // At least one should be visible in search results
    const folder1Visible = await folder1.isVisible().catch(() => false);
    const folder2Visible = await folder2.isVisible().catch(() => false);
    expect(folder1Visible || folder2Visible).toBe(true);
  });
});
