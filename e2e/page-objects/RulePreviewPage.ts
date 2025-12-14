import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * RulePreviewPage - Page Object Model for RulePreview component
 *
 * STRUKTURA (ASCII):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   RulePreviewPage.ts
 *          │
 *          ├─ extends BasePage
 *          │
 *          ├─ Locators:
 *          │    ├─ rulePreview (container)
 *          │    ├─ statusBadge
 *          │    ├─ expandButton
 *          │    └─ isapLink
 *          │
 *          └─ Methods:
 *               ├─ getRuleTitle()
 *               ├─ getRuleContent()
 *               ├─ getStatus()
 *               ├─ expandRule()
 *               ├─ collapseRule()
 *               ├─ isExpanded()
 *               ├─ clickIsapLink()
 *               └─ getRuleMetadata()
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Page Object dla komponentu RulePreview
 * Reprezentuje pojedynczy podgląd artykułu prawnego
 */
export class RulePreviewPage extends BasePage {
  // Locators using data-testid convention
  readonly rulePreview: Locator;
  readonly statusBadge: Locator;
  readonly expandButton: Locator;
  readonly isapLink: Locator;

  constructor(page: Page, index: number = 0) {
    super(page);

    // Initialize locators
    // Jeśli jest wiele RulePreview na stronie, używamy index
    const allPreviews = page.getByTestId('rule-preview');
    this.rulePreview = allPreviews.nth(index);
    this.statusBadge = this.rulePreview.getByTestId('rule-status-badge');
    this.expandButton = this.rulePreview.getByTestId('rule-expand-button');
    this.isapLink = this.rulePreview.getByTestId('rule-isap-link');
  }

  /**
   * Get rule title
   */
  async getRuleTitle(): Promise<string> {
    const titleElement = this.rulePreview.locator('[class*="CardTitle"]').first();
    return (await titleElement.textContent()) || '';
  }

  /**
   * Get rule content text
   */
  async getRuleContent(): Promise<string> {
    const contentElement = this.rulePreview.locator('[class*="CardContent"]').first();
    return (await contentElement.textContent()) || '';
  }

  /**
   * Get rule status from badge
   */
  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) || '';
  }

  /**
   * Get rule metadata (publisher, year, position)
   */
  async getRuleMetadata(): Promise<string> {
    const metadataElement = this.rulePreview.locator('[class*="CardDescription"]').first();
    return (await metadataElement.textContent()) || '';
  }

  /**
   * Check if rule is currently expanded
   */
  async isExpanded(): Promise<boolean> {
    const buttonText = await this.expandButton.textContent();
    return buttonText?.includes('Zwiń') || false;
  }

  /**
   * Expand the rule (if collapsed)
   */
  async expandRule(): Promise<void> {
    const expanded = await this.isExpanded();
    if (!expanded) {
      await this.expandButton.click();
      // Wait for animation/transition
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Collapse the rule (if expanded)
   */
  async collapseRule(): Promise<void> {
    const expanded = await this.isExpanded();
    if (expanded) {
      await this.expandButton.click();
      // Wait for animation/transition
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Toggle expand/collapse state
   */
  async toggleExpand(): Promise<void> {
    await this.expandButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Click ISAP link (opens in new tab)
   */
  async clickIsapLink(): Promise<Page> {
    // Listen for new page before clicking
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.isapLink.click(),
    ]);

    await newPage.waitForLoadState('networkidle');
    return newPage;
  }

  /**
   * Check if ISAP link is visible
   */
  async hasIsapLink(): Promise<boolean> {
    return await this.isapLink.isVisible();
  }

  /**
   * Check if rule preview is visible
   */
  async isVisible(): Promise<boolean> {
    return await this.rulePreview.isVisible();
  }

  /**
   * Check if expand button is visible
   */
  async hasExpandButton(): Promise<boolean> {
    return await this.expandButton.isVisible();
  }

  /**
   * Get ISAP URL
   */
  async getIsapUrl(): Promise<string | null> {
    if (!(await this.hasIsapLink())) {
      return null;
    }
    return await this.isapLink.getAttribute('href');
  }

  /**
   * Wait for rule preview to be loaded
   */
  async waitForLoad(): Promise<void> {
    await this.rulePreview.waitFor({ state: 'visible' });
  }

  /**
   * Take screenshot of this rule preview
   */
  async screenshot(name: string): Promise<void> {
    await this.rulePreview.screenshot({ path: `screenshots/rule-preview-${name}.png` });
  }
}

/**
 * Helper function to get multiple RulePreview Page Objects
 *
 * Usage:
 * const rules = await getRulePreviewList(page);
 * await rules[0].expandRule();
 */
export async function getRulePreviewList(page: Page): Promise<RulePreviewPage[]> {
  const count = await page.getByTestId('rule-preview').count();
  const rules: RulePreviewPage[] = [];

  for (let i = 0; i < count; i++) {
    rules.push(new RulePreviewPage(page, i));
  }

  return rules;
}
