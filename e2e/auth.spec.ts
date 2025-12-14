import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';

/**
 * Authentication E2E Tests
 * Tests for login, logout, and registration flows
 */

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();

      // Assert
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Act
      await loginPage.login('invalid@example.com', 'wrongpassword');

      // Assert
      await expect(loginPage.errorMessage).toBeVisible();
      const errorText = await loginPage.getErrorText();
      expect(errorText).toContain('Nieprawidłowy email lub hasło');
    });

    test('should redirect to /app after successful login', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Act
      // Note: Replace with actual test credentials or use test fixtures
      await loginPage.login('test@example.com', 'Test123!@#');

      // Assert
      await page.waitForURL('**/app');
      expect(await page.url()).toContain('/app');
    });

    test('should navigate to register page when clicking register link', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Act
      await loginPage.clickRegister();

      // Assert
      await page.waitForURL('**/register');
      expect(await page.url()).toContain('/register');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Act
      await loginPage.clickForgotPassword();

      // Assert
      await page.waitForURL('**/forgot-password');
      expect(await page.url()).toContain('/forgot-password');
    });
  });

  test.describe('Visual Regression', () => {
    test('login page should match screenshot', async ({ page }) => {
      // Arrange
      const loginPage = new LoginPage(page);

      // Act
      await loginPage.goto();

      // Assert
      await expect(page).toHaveScreenshot('login-page.png');
    });
  });
});
