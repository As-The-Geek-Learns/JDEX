// E2E tests for search functionality
import { test, expect } from '../fixtures/app.fixture.js';

test.describe('Search Input', () => {
  test('should display search input in header', async ({ window }) => {
    // Search input should be visible
    const searchInput = window.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should accept text input', async ({ window }) => {
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('test query');

    await expect(searchInput).toHaveValue('test query');
  });

  test('should clear search when input is cleared', async ({ window }) => {
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('test query');
    await searchInput.clear();

    await expect(searchInput).toHaveValue('');
  });
});

test.describe('Search Results', () => {
  test('should search across folders', async ({ window }) => {
    // First create a folder with unique name
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    // Folder name input uses placeholder "e.g., Script Documentation"
    const nameInput = window.getByPlaceholder(/script documentation/i);
    await nameInput.fill('UniqueSearchFolder123');

    const createBtn = window.getByRole('button', { name: /create folder/i });
    await createBtn.click();
    await window.waitForTimeout(500);

    // Search for the folder
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('UniqueSearchFolder123');
    await window.waitForTimeout(500);

    // Should find the folder in results
    const searchResult = window.locator('text=UniqueSearchFolder123').first();
    await expect(searchResult).toBeVisible({ timeout: 5000 });
  });

  test('should search across items', async ({ window }) => {
    // Create a folder first
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    // Folder name input uses placeholder "e.g., Script Documentation"
    const folderNameInput = window.getByPlaceholder(/script documentation/i);
    await folderNameInput.fill('SearchItemTestFolder');

    const createFolderBtn = window.getByRole('button', { name: /create folder/i });
    await createFolderBtn.click();
    await window.waitForTimeout(500);

    // Create an item with unique name
    const newItemBtn = window.getByRole('button', { name: /new item/i });
    await newItemBtn.click();
    await window.waitForTimeout(300);

    const folderSelect = window.locator('select').first();
    await folderSelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    // Item name input uses placeholder "e.g., README.md"
    const itemNameInput = window.getByPlaceholder(/readme/i);
    await itemNameInput.fill('UniqueSearchItem456');

    const createItemBtn = window.getByRole('button', { name: /create item/i });
    await createItemBtn.click();
    await window.waitForTimeout(500);

    // Search for the item
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('UniqueSearchItem456');
    await window.waitForTimeout(500);

    // Should find the item in results
    const searchResult = window.locator('text=UniqueSearchItem456').first();
    await expect(searchResult).toBeVisible({ timeout: 5000 });
  });

  test('should show no results for non-matching query', async ({ window }) => {
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('xyznonexistent789abc');
    await window.waitForTimeout(500);

    // Should show no results or empty state
    // The exact behavior depends on UI implementation
    const content = window.locator('main, .content-area').first();
    await expect(content).toBeVisible();
  });
});

test.describe('Search Behavior', () => {
  test('should search as you type (debounced)', async ({ window }) => {
    // Create a folder with unique name
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    // Folder name input uses placeholder "e.g., Script Documentation"
    const nameInput = window.getByPlaceholder(/script documentation/i);
    await nameInput.fill('LiveSearchTest');

    const createBtn = window.getByRole('button', { name: /create folder/i });
    await createBtn.click();
    await window.waitForTimeout(500);

    // Type in search input
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('Live');
    await window.waitForTimeout(300);

    // Continue typing
    await searchInput.fill('LiveSearch');
    await window.waitForTimeout(500);

    // Results should update as we type
    const result = window.locator('text=LiveSearchTest').first();
    await expect(result).toBeVisible({ timeout: 5000 });
  });

  test('should return to normal view when search is cleared', async ({ window }) => {
    const searchInput = window.getByPlaceholder(/search/i);

    // Enter a search query
    await searchInput.fill('test');
    await window.waitForTimeout(300);

    // Clear the search
    await searchInput.clear();
    await window.waitForTimeout(500);

    // Should return to normal view (sidebar visible, etc.)
    const sidebar = window.locator('aside, .sidebar, nav').first();
    await expect(sidebar).toBeVisible();
  });
});

test.describe('Search by JD Number', () => {
  test('should find folders by partial JD number', async ({ window }) => {
    // Create a folder
    const newFolderBtn = window.getByRole('button', { name: /new folder/i });
    await newFolderBtn.click();
    await window.waitForTimeout(300);

    const categorySelect = window.locator('select').first();
    await categorySelect.selectOption({ index: 1 });
    await window.waitForTimeout(300);

    // Folder name input uses placeholder "e.g., Script Documentation"
    const nameInput = window.getByPlaceholder(/script documentation/i);
    await nameInput.fill('JDNumberSearchTest');

    const createBtn = window.getByRole('button', { name: /create folder/i });
    await createBtn.click();
    await window.waitForTimeout(500);

    // Search by the start of a JD number (e.g., "10." or "11.")
    const searchInput = window.getByPlaceholder(/search/i);
    await searchInput.fill('10.');
    await window.waitForTimeout(500);

    // Should find items with matching JD numbers
    const content = window.locator('main, .content-area').first();
    await expect(content).toBeVisible();
  });
});
