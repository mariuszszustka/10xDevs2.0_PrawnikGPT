/**
 * Logout E2E Tests
 *
 * Tests for logout functionality using HeaderComponent POM.
 * Covers:
 * - Test 1.5: Successful logout
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pom/pages/LoginPage';
import { ChatPage } from '../../pom/pages/ChatPage';
import { HeaderComponent } from '../../pom/components/HeaderComponent';

test.describe('Logout Flow', () => {
  let loginPage: LoginPage;
  let chatPage: ChatPage;
  let header: HeaderComponent;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);
    header = new HeaderComponent(page);

    // Login first (prerequisite)
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await page.waitForURL(/\/app/, { timeout: 10000 });
  });

  test('Test 1.5: User can logout successfully', async ({ page }) => {
    // Arrange - user is already logged in (beforeEach)
    await chatPage.goto();

    // Verify user is authenticated
    expect(await header.isAuthenticated()).toBe(true);

    // Act
    await header.logout();

    // Assert
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Auth buttons should be visible (unauthenticated state)
    expect(await header.hasAuthButtons()).toBe(true);
    expect(await header.hasUserMenu()).toBe(false);
  });

  test('User menu can be opened and closed', async () => {
    // Arrange
    await chatPage.goto();

    // Act - Open user menu
    await header.clickUserMenu();

    // Wait for menu to open
    await chatPage.page.waitForTimeout(300);

    // Assert - Menu should be visible (check for dropdown role)
    const menuVisible = await chatPage.page
      .locator('[role="menu"]')
      .isVisible()
      .catch(() => false);
    expect(menuVisible).toBe(true);

    // Act - Click outside to close (or press Escape)
    await chatPage.page.keyboard.press('Escape');

    // Assert - Menu should be hidden
    const menuHidden = await chatPage.page
      .locator('[role="menu"]')
      .isHidden()
      .catch(() => true);
    expect(menuHidden).toBe(true);
  });

  test('User email is displayed in user menu', async () => {
    // Arrange
    await chatPage.goto();

    // Act
    const userEmail = await header.getUserEmail();

    // Assert
    expect(userEmail).toBeTruthy();
    expect(userEmail).toContain('@'); // Should contain @ symbol
    // In real test, would check against actual logged-in user email
    expect(userEmail).toBe('test@example.com');
  });
});
