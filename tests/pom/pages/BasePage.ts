/**
 * BasePage - Base class for all Page Object Models
 *
 * Provides common functionality for all pages:
 * - Navigation helpers
 * - Selector utilities (data-testid)
 * - Wait helpers
 * - Common assertions
 */

import type { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  /**
   * Navigate to a specific path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Get current page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for a specific selector to be visible
   */
  protected async waitForSelector(
    selector: string,
    options?: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' }
  ): Promise<void> {
    await this.page.waitForSelector(`[data-testid="${selector}"]`, {
      state: options?.state || 'visible',
      timeout: options?.timeout,
    });
  }

  /**
   * Get element by data-testid
   */
  protected getByTestId(selector: string): Locator {
    return this.page.getByTestId(selector);
  }

  /**
   * Check if element with data-testid exists and is visible
   */
  protected async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.getByTestId(selector).isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if element with data-testid is disabled
   */
  protected async isDisabled(selector: string): Promise<boolean> {
    return await this.getByTestId(selector).isDisabled();
  }

  /**
   * Get text content of element with data-testid
   */
  protected async getTextContent(selector: string): Promise<string | null> {
    try {
      return await this.getByTestId(selector).textContent({ timeout: 1000 });
    } catch {
      return null;
    }
  }

  /**
   * Click element with data-testid
   */
  protected async click(selector: string): Promise<void> {
    await this.getByTestId(selector).click();
  }

  /**
   * Fill input with data-testid
   */
  protected async fill(selector: string, value: string): Promise<void> {
    await this.getByTestId(selector).fill(value);
  }

  /**
   * Get value of input with data-testid
   */
  protected async getInputValue(selector: string): Promise<string> {
    return await this.getByTestId(selector).inputValue();
  }

  /**
   * Get attribute value of element with data-testid
   */
  protected async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return await this.getByTestId(selector).getAttribute(attribute);
  }

  /**
   * Wait for element with data-testid to disappear
   */
  protected async waitForHidden(selector: string, timeout = 5000): Promise<void> {
    await this.page.waitForSelector(`[data-testid="${selector}"]`, {
      state: 'hidden',
      timeout,
    });
  }

  /**
   * Reload current page
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Take screenshot
   */
  async screenshot(options?: { path?: string; fullPage?: boolean }): Promise<Buffer> {
    return await this.page.screenshot(options);
  }
}
