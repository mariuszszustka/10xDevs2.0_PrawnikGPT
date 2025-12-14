import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage - Page Object Model for /login page
 * Represents the login page and its interactions
 */
export class LoginPage extends BasePage {
  // Locators using data-testid convention
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators
    this.emailInput = this.getByTestId('login-email-input');
    this.passwordInput = this.getByTestId('login-password-input');
    this.submitButton = this.getByTestId('login-submit-button');
    this.errorMessage = this.getByTestId('login-error-message');
    this.forgotPasswordLink = this.getByTestId('forgot-password-link');
    this.registerLink = this.getByTestId('register-link');
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Fill in email field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in password field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click submit button
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Perform complete login action (Arrange-Act-Assert pattern)
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  /**
   * Check if error message is visible
   */
  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Click "Forgot Password" link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  /**
   * Click "Register" link
   */
  async clickRegister() {
    await this.registerLink.click();
  }
}
