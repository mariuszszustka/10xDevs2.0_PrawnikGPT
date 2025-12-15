/**
 * LoginPage - Page Object Model for login functionality
 *
 * Encapsulates all interactions with the login page (/login).
 * Uses data-testid selectors from LoginForm.tsx component.
 *
 * Selectors:
 * - login-form: Main form element
 * - email-input: Email input field
 * - password-input: Password input field
 * - password-toggle-button: Button to show/hide password
 * - submit-button: Login submit button
 * - error-message: General error message
 * - session-expired-alert: Session expired alert
 */

import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Page path
  private readonly path = '/login';

  // Selectors
  private readonly selectors = {
    form: 'login-form',
    emailInput: 'email-input',
    passwordInput: 'password-input',
    passwordToggle: 'password-toggle-button',
    submitButton: 'submit-button',
    errorMessage: 'error-message',
    sessionExpiredAlert: 'session-expired-alert',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await super.goto(this.path);
    await this.waitForSelector(this.selectors.form);
  }

  /**
   * Fill email input field
   */
  async fillEmail(email: string): Promise<void> {
    await this.fill(this.selectors.emailInput, email);
  }

  /**
   * Fill password input field
   */
  async fillPassword(password: string): Promise<void> {
    await this.fill(this.selectors.passwordInput, password);
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.click(this.selectors.passwordToggle);
  }

  /**
   * Click submit button
   */
  async clickSubmit(): Promise<void> {
    await this.click(this.selectors.submitButton);
  }

  /**
   * Perform login with email and password
   * High-level method that combines fill and submit actions
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Get error message text (if visible)
   * @returns Error message text or null if not visible
   */
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.isVisible(this.selectors.errorMessage);
    if (!isVisible) {
      return null;
    }
    return await this.getTextContent(this.selectors.errorMessage);
  }

  /**
   * Check if session expired alert is visible
   */
  async hasSessionExpiredAlert(): Promise<boolean> {
    return await this.isVisible(this.selectors.sessionExpiredAlert);
  }

  /**
   * Get session expired alert text
   */
  async getSessionExpiredMessage(): Promise<string | null> {
    const isVisible = await this.hasSessionExpiredAlert();
    if (!isVisible) {
      return null;
    }
    return await this.getTextContent(this.selectors.sessionExpiredAlert);
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.isDisabled(this.selectors.submitButton);
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return !(await this.isSubmitButtonDisabled());
  }

  /**
   * Get email input value
   */
  async getEmailValue(): Promise<string> {
    return await this.getInputValue(this.selectors.emailInput);
  }

  /**
   * Get password input value
   */
  async getPasswordValue(): Promise<string> {
    return await this.getInputValue(this.selectors.passwordInput);
  }

  /**
   * Check if password is visible (not masked)
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.getAttribute(this.selectors.passwordInput, 'type');
    return type === 'text';
  }

  /**
   * Wait for successful login (redirect to /app)
   */
  async waitForSuccessfulLogin(timeout = 10000): Promise<void> {
    await this.page.waitForURL(/\/app/, { timeout });
  }

  /**
   * Clear email input
   */
  async clearEmail(): Promise<void> {
    await this.fill(this.selectors.emailInput, '');
  }

  /**
   * Clear password input
   */
  async clearPassword(): Promise<void> {
    await this.fill(this.selectors.passwordInput, '');
  }

  /**
   * Check if login form is visible
   */
  async isFormVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.form);
  }
}
