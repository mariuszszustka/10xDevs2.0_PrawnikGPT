/**
 * HeaderComponent - Component Object Model for header navigation
 *
 * Encapsulates all interactions with the header component.
 * The header is present on all pages (authenticated and unauthenticated).
 *
 * Uses data-testid selectors from:
 * - Header.astro (public header)
 * - UserMenu.tsx (authenticated user menu)
 *
 * Features:
 * - Logo navigation
 * - Main navigation links (App, Pricing)
 * - Auth buttons (Login, Register) - for unauthenticated users
 * - User menu (Settings, Logout) - for authenticated users
 */

import type { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  // Selectors - Public header
  private readonly publicSelectors = {
    header: 'main-header',
    logo: 'logo-link',
    desktopNav: 'desktop-nav',
    appLink: 'app-link',
    pricingLink: 'pricing-link',
    authButtons: 'auth-buttons',
    loginLink: 'login-link',
    registerLink: 'register-link',
  };

  // Selectors - User menu (authenticated)
  private readonly userMenuSelectors = {
    button: 'user-menu-button',
    logoutButton: 'logout-button',
  };

  constructor(private page: Page) {}

  /**
   * Get locator by data-testid
   */
  private getByTestId(selector: string): Locator {
    return this.page.getByTestId(selector);
  }

  /**
   * Check if element is visible
   */
  private async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.getByTestId(selector).isVisible({ timeout: 1000 });
    } catch {
      return false;
    }
  }

  // ======================
  // GENERAL NAVIGATION
  // ======================

  /**
   * Check if header is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.isVisible(this.publicSelectors.header);
  }

  /**
   * Click logo (navigate to home)
   */
  async clickLogo(): Promise<void> {
    await this.getByTestId(this.publicSelectors.logo).click();
  }

  /**
   * Click App link
   */
  async clickAppLink(): Promise<void> {
    await this.getByTestId(this.publicSelectors.appLink).click();
  }

  /**
   * Click Pricing link
   */
  async clickPricingLink(): Promise<void> {
    await this.getByTestId(this.publicSelectors.pricingLink).click();
  }

  // ======================
  // AUTH BUTTONS (UNAUTHENTICATED)
  // ======================

  /**
   * Check if auth buttons are visible
   * Auth buttons (Login, Register) are only visible for unauthenticated users
   */
  async hasAuthButtons(): Promise<boolean> {
    return await this.isVisible(this.publicSelectors.authButtons);
  }

  /**
   * Click Login link
   */
  async clickLoginLink(): Promise<void> {
    await this.getByTestId(this.publicSelectors.loginLink).click();
  }

  /**
   * Click Register link
   */
  async clickRegisterLink(): Promise<void> {
    await this.getByTestId(this.publicSelectors.registerLink).click();
  }

  // ======================
  // USER MENU (AUTHENTICATED)
  // ======================

  /**
   * Check if user menu is visible
   * User menu is only visible for authenticated users
   */
  async hasUserMenu(): Promise<boolean> {
    return await this.isVisible(this.userMenuSelectors.button);
  }

  /**
   * Click user menu button to open dropdown
   */
  async clickUserMenu(): Promise<void> {
    await this.getByTestId(this.userMenuSelectors.button).click();
  }

  /**
   * Click logout button (must open user menu first)
   */
  async clickLogout(): Promise<void> {
    await this.getByTestId(this.userMenuSelectors.logoutButton).click();
  }

  /**
   * Perform logout (open menu and click logout)
   * High-level method that combines multiple actions
   */
  async logout(): Promise<void> {
    await this.clickUserMenu();
    // Wait a bit for the dropdown to open
    await this.page.waitForTimeout(300);
    await this.clickLogout();
  }

  /**
   * Get user email from user menu
   * Note: This requires the menu to be open
   */
  async getUserEmail(): Promise<string | null> {
    // Open user menu if not already open
    const isMenuOpen = await this.page.locator('[role="menu"]').isVisible().catch(() => false);
    if (!isMenuOpen) {
      await this.clickUserMenu();
      await this.page.waitForTimeout(300);
    }

    // Find email text in the menu (it's in a <p> with class "text-xs leading-none text-muted-foreground")
    const emailElement = this.page.locator('[role="menu"] p.text-xs.text-muted-foreground').first();
    return await emailElement.textContent();
  }

  // ======================
  // AUTHENTICATION STATE
  // ======================

  /**
   * Check if user is authenticated
   * Authenticated users see user menu, unauthenticated users see auth buttons
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.hasUserMenu();
  }

  /**
   * Check if user is unauthenticated
   */
  async isUnauthenticated(): Promise<boolean> {
    return await this.hasAuthButtons();
  }
}
