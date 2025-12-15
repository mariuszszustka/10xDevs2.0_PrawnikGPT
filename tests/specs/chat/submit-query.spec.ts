/**
 * Submit Query E2E Tests
 *
 * Tests for submitting queries using ChatPage POM.
 * Covers:
 * - Test 2.1: Submit valid query
 * - Test 2.2: Query too short
 * - Test 2.3: Query too long
 * - Test 2.4: Character counter updates
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pom/pages/LoginPage';
import { ChatPage } from '../../pom/pages/ChatPage';

test.describe('Submit Query Flow', () => {
  let loginPage: LoginPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);

    // Login first (prerequisite)
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await page.waitForURL(/\/app/, { timeout: 10000 });

    // Navigate to chat page
    await chatPage.goto();
  });

  test('Test 2.1: User can submit valid query and receive fast response', async () => {
    // Arrange
    const query = 'Jakie są obowiązki pracodawcy wobec pracownika?';

    // Act
    await chatPage.submitQuery(query);

    // Assert - Wait for fast response (max 20s)
    await chatPage.waitForFastResponse(20000);

    // Verify fast response is visible
    expect(await chatPage.hasResponse('fast')).toBe(true);

    // Verify response has content
    const responseContent = await chatPage.getResponseContent('fast');
    expect(responseContent).toBeTruthy();
    expect(responseContent.length).toBeGreaterThan(0);
  });

  test('Test 2.2: Send button is disabled when query is too short', async () => {
    // Arrange
    const shortQuery = 'Test'; // 4 characters (min is 10)

    // Act
    await chatPage.fillQuery(shortQuery);

    // Wait a bit for validation to trigger
    await chatPage.page.waitForTimeout(500);

    // Assert
    expect(await chatPage.isSendButtonDisabled()).toBe(true);

    // Verify character counter shows the count
    const charCount = await chatPage.getCharacterCount();
    expect(charCount).toContain('4'); // Should show 4/1000 or similar
  });

  test('Test 2.3: Send button is disabled when query is too long', async () => {
    // Arrange
    const longQuery = 'A'.repeat(1001); // 1001 characters (max is 1000)

    // Act
    await chatPage.fillQuery(longQuery);

    // Wait a bit for validation to trigger
    await chatPage.page.waitForTimeout(500);

    // Assert
    expect(await chatPage.isSendButtonDisabled()).toBe(true);

    // Verify character counter shows error (likely red/destructive variant)
    const charCount = await chatPage.getCharacterCount();
    expect(charCount).toContain('1001'); // Should show 1001/1000
  });

  test('Test 2.4: Character counter updates as user types', async () => {
    // Test with valid query
    const query1 = 'Test pytanie'; // 12 characters
    await chatPage.fillQuery(query1);

    let charCount = await chatPage.getCharacterCount();
    expect(charCount).toContain('12'); // Should show 12/1000

    // Clear and test with longer query
    await chatPage.clearQuery();
    const query2 = 'Jakie są obowiązki pracodawcy wobec pracownika?'; // ~50 characters
    await chatPage.fillQuery(query2);

    charCount = await chatPage.getCharacterCount();
    expect(charCount).toMatch(/\d+\/1000/); // Should match X/1000 pattern
    expect(parseInt(charCount)).toBeGreaterThan(40); // Should be around 50
  });

  test('Query can be cleared after typing', async () => {
    // Arrange
    const query = 'Jakie są obowiązki pracodawcy?';

    // Act
    await chatPage.fillQuery(query);
    expect(await chatPage.getCharacterCount()).toContain('30'); // Approximate

    await chatPage.clearQuery();

    // Assert
    const charCount = await chatPage.getCharacterCount();
    expect(charCount).toContain('0/1000');
  });

  test('Rate limit info is displayed', async () => {
    // Act
    const rateLimitInfo = await chatPage.getRateLimitInfo();

    // Assert - Should show something like "5/10" or "Limit zapytań: 5/10"
    expect(rateLimitInfo).toBeTruthy();
    expect(rateLimitInfo).toMatch(/\d+\/\d+/); // Should contain X/Y pattern
  });
});

test.describe('Query Validation Edge Cases', () => {
  let loginPage: LoginPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    chatPage = new ChatPage(page);

    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    await page.waitForURL(/\/app/, { timeout: 10000 });
    await chatPage.goto();
  });

  test('Query with exactly 10 characters (minimum) can be submitted', async () => {
    // Arrange
    const minQuery = 'A'.repeat(10); // Exactly 10 characters

    // Act
    await chatPage.fillQuery(minQuery);
    await chatPage.page.waitForTimeout(500);

    // Assert
    expect(await chatPage.isSendButtonDisabled()).toBe(false);
  });

  test('Query with exactly 1000 characters (maximum) can be submitted', async () => {
    // Arrange
    const maxQuery = 'A'.repeat(1000); // Exactly 1000 characters

    // Act
    await chatPage.fillQuery(maxQuery);
    await chatPage.page.waitForTimeout(500);

    // Assert
    expect(await chatPage.isSendButtonDisabled()).toBe(false);
    expect(await chatPage.getCharacterCount()).toContain('1000/1000');
  });

  test('Query with 9 characters (below minimum) cannot be submitted', async () => {
    // Arrange
    const belowMinQuery = 'A'.repeat(9); // 9 characters (below 10)

    // Act
    await chatPage.fillQuery(belowMinQuery);
    await chatPage.page.waitForTimeout(500);

    // Assert
    expect(await chatPage.isSendButtonDisabled()).toBe(true);
  });
});
