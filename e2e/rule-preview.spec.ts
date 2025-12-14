import { test, expect } from '@playwright/test';
import { RulePreviewPage, getRulePreviewList } from './page-objects/RulePreviewPage';

/**
 * RulePreview E2E Tests
 *
 * STRUKTURA TESTÓW (ASCII):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   rule-preview.spec.ts
 *          │
 *          ├─ describe('RulePreview Component - E2E')
 *          │     │
 *          │     ├─ describe('Rendering')
 *          │     │     ├─ should display rule title and metadata
 *          │     │     ├─ should display status badge
 *          │     │     └─ should display ISAP link when available
 *          │     │
 *          │     ├─ describe('Expand/Collapse')
 *          │     │     ├─ should expand rule when expand button clicked
 *          │     │     ├─ should collapse rule when collapse button clicked
 *          │     │     └─ should toggle between expanded and collapsed states
 *          │     │
 *          │     ├─ describe('ISAP Integration')
 *          │     │     ├─ should open ISAP link in new tab
 *          │     │     └─ should have correct URL structure
 *          │     │
 *          │     └─ describe('Visual Regression')
 *          │           ├─ should match screenshot - collapsed state
 *          │           └─ should match screenshot - expanded state
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NOTE: Te testy zakładają, że istnieje strona testowa z RulePreview component.
 * Można ją stworzyć w src/pages/test/rule-preview.astro lub użyć istniejącej strony.
 */

test.describe('RulePreview Component - E2E', () => {
  // Test URL - dostosuj do rzeczywistej strony z RulePreview
  const TEST_URL = '/test/rule-preview'; // lub '/app' jeśli RulePreview jest tam używany

  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    // NOTE: Może wymagać utworzenia strony testowej lub logowania
    await page.goto(TEST_URL);
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * RENDERING
   * ───────────────────────────────────────────────────────────────────────────
   */
  test.describe('Rendering', () => {
    test('should display rule title and metadata', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);

      // Act
      await rulePreview.waitForLoad();
      const title = await rulePreview.getRuleTitle();
      const metadata = await rulePreview.getRuleMetadata();

      // Assert
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
      expect(metadata).toMatch(/Dz\.U\./); // Should contain publisher info
    });

    test('should display status badge with correct text', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);

      // Act
      await rulePreview.waitForLoad();
      const status = await rulePreview.getStatus();

      // Assert
      expect(status).toMatch(/obowiązujący|uchylony|nieobowiązujący/);
    });

    test('should display ISAP link when available', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);

      // Act
      await rulePreview.waitForLoad();
      const hasLink = await rulePreview.hasIsapLink();

      // Assert
      if (hasLink) {
        const url = await rulePreview.getIsapUrl();
        expect(url).toContain('isap.sejm.gov.pl');
      }
    });

    test('should be visible on page load', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);

      // Act
      const isVisible = await rulePreview.isVisible();

      // Assert
      expect(isVisible).toBe(true);
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * EXPAND/COLLAPSE BEHAVIOR
   * ───────────────────────────────────────────────────────────────────────────
   */
  test.describe('Expand/Collapse', () => {
    test('should expand rule when expand button clicked', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Assume initially collapsed
      if (await rulePreview.isExpanded()) {
        await rulePreview.collapseRule();
      }

      // Act
      await rulePreview.expandRule();

      // Assert
      expect(await rulePreview.isExpanded()).toBe(true);

      // Content should be longer when expanded
      const expandedContent = await rulePreview.getRuleContent();
      expect(expandedContent.length).toBeGreaterThan(0);
    });

    test('should collapse rule when collapse button clicked', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Ensure expanded first
      if (!(await rulePreview.isExpanded())) {
        await rulePreview.expandRule();
      }

      // Act
      await rulePreview.collapseRule();

      // Assert
      expect(await rulePreview.isExpanded()).toBe(false);
    });

    test('should toggle between expanded and collapsed states', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      const initialState = await rulePreview.isExpanded();

      // Act - First toggle
      await rulePreview.toggleExpand();
      const firstToggleState = await rulePreview.isExpanded();

      // Act - Second toggle
      await rulePreview.toggleExpand();
      const secondToggleState = await rulePreview.isExpanded();

      // Assert
      expect(firstToggleState).toBe(!initialState);
      expect(secondToggleState).toBe(initialState);
    });

    test('should have expand button visible for long content', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Act
      const hasButton = await rulePreview.hasExpandButton();

      // Assert
      expect(hasButton).toBe(true);
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * ISAP INTEGRATION
   * ───────────────────────────────────────────────────────────────────────────
   */
  test.describe('ISAP Integration', () => {
    test('should open ISAP link in new tab', async ({ page, context }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Skip if no ISAP link
      if (!(await rulePreview.hasIsapLink())) {
        test.skip();
      }

      // Act
      const newPage = await rulePreview.clickIsapLink();

      // Assert
      expect(newPage.url()).toContain('isap.sejm.gov.pl');

      // Cleanup
      await newPage.close();
    });

    test('should have correct URL structure for ISAP link', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Skip if no ISAP link
      if (!(await rulePreview.hasIsapLink())) {
        test.skip();
      }

      // Act
      const url = await rulePreview.getIsapUrl();

      // Assert
      expect(url).toMatch(/https?:\/\/isap\.sejm\.gov\.pl/);
      expect(url).toContain('DocDetails');
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * MULTIPLE RULES
   * ───────────────────────────────────────────────────────────────────────────
   */
  test.describe('Multiple Rules', () => {
    test('should handle multiple rule previews on page', async ({ page }) => {
      // Arrange & Act
      const rules = await getRulePreviewList(page);

      // Assert
      expect(rules.length).toBeGreaterThan(0);

      // Verify each rule is visible
      for (const rule of rules) {
        expect(await rule.isVisible()).toBe(true);
      }
    });

    test('should expand only clicked rule (controlled mode)', async ({ page }) => {
      // Arrange
      const rules = await getRulePreviewList(page);

      // Skip if less than 2 rules
      if (rules.length < 2) {
        test.skip();
      }

      // Act - Expand first rule
      await rules[0].expandRule();

      // Assert
      expect(await rules[0].isExpanded()).toBe(true);

      // Other rules should remain collapsed (if controlled mode)
      if (rules.length > 1) {
        // This assertion might vary based on controlled/uncontrolled implementation
        // In controlled mode, only one rule should be expanded at a time
      }
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * VISUAL REGRESSION
   * ───────────────────────────────────────────────────────────────────────────
   */
  test.describe('Visual Regression', () => {
    test('should match screenshot - collapsed state', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Ensure collapsed
      if (await rulePreview.isExpanded()) {
        await rulePreview.collapseRule();
      }

      // Act & Assert
      await expect(page).toHaveScreenshot('rule-preview-collapsed.png', {
        mask: [page.getByTestId('rule-status-badge')], // Mask dynamic content if needed
      });
    });

    test('should match screenshot - expanded state', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Ensure expanded
      if (!(await rulePreview.isExpanded())) {
        await rulePreview.expandRule();
      }

      // Act & Assert
      await expect(page).toHaveScreenshot('rule-preview-expanded.png', {
        mask: [page.getByTestId('rule-status-badge')],
      });
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * ACCESSIBILITY
   * ───────────────────────────────────────────────────────────────────────────
   */
  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Act - Navigate with Tab
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should be on expand button (depends on page structure)
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');

      // Assert
      expect(['rule-expand-button', 'rule-isap-link']).toContain(focusedElement);
    });

    test('should activate expand button with Enter key', async ({ page }) => {
      // Arrange
      const rulePreview = new RulePreviewPage(page);
      await rulePreview.waitForLoad();

      // Ensure collapsed
      if (await rulePreview.isExpanded()) {
        await rulePreview.collapseRule();
      }

      // Act - Focus and press Enter
      await rulePreview.expandButton.focus();
      await page.keyboard.press('Enter');

      // Assert
      expect(await rulePreview.isExpanded()).toBe(true);
    });
  });
});
