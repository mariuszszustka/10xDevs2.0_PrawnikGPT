import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ChatPage - Page Object Model for /app (chat interface)
 * Represents the main chat page and its interactions
 */
export class ChatPage extends BasePage {
  // Locators using data-testid convention
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly chatMessages: Locator;
  readonly welcomeMessage: Locator;
  readonly exampleQuestions: Locator;
  readonly fastResponseCard: Locator;
  readonly accurateResponseButton: Locator;
  readonly ratingButtonsUp: Locator;
  readonly ratingButtonsDown: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators
    this.chatInput = this.getByTestId('chat-input');
    this.sendButton = this.getByTestId('chat-send-button');
    this.chatMessages = this.getByTestId('chat-messages-container');
    this.welcomeMessage = this.getByTestId('welcome-message');
    this.exampleQuestions = this.getByTestId('example-questions');
    this.fastResponseCard = this.getByTestId('fast-response-card');
    this.accurateResponseButton = this.getByTestId('accurate-response-button');
    this.ratingButtonsUp = this.getByTestId('rating-thumbs-up');
    this.ratingButtonsDown = this.getByTestId('rating-thumbs-down');
    this.userMenu = this.getByTestId('user-menu');
    this.logoutButton = this.getByTestId('logout-button');
  }

  /**
   * Navigate to chat page
   */
  async goto() {
    await super.goto('/app');
    await this.waitForPageLoad();
  }

  /**
   * Type query into chat input
   */
  async typeQuery(query: string) {
    await this.chatInput.fill(query);
  }

  /**
   * Click send button
   */
  async clickSend() {
    await this.sendButton.click();
  }

  /**
   * Send a complete query (Arrange-Act-Assert pattern)
   */
  async sendQuery(query: string) {
    await this.typeQuery(query);
    await this.clickSend();
  }

  /**
   * Wait for fast response to appear
   */
  async waitForFastResponse(timeout: number = 15000) {
    await this.fastResponseCard.waitFor({ state: 'visible', timeout });
  }

  /**
   * Click "Get detailed answer" button
   */
  async clickAccurateResponse() {
    await this.accurateResponseButton.click();
  }

  /**
   * Rate response with thumbs up
   */
  async rateUp() {
    await this.ratingButtonsUp.click();
  }

  /**
   * Rate response with thumbs down
   */
  async rateDown() {
    await this.ratingButtonsDown.click();
  }

  /**
   * Click example question by index
   */
  async clickExampleQuestion(index: number = 0) {
    const questions = this.exampleQuestions.locator('button');
    await questions.nth(index).click();
  }

  /**
   * Open user menu
   */
  async openUserMenu() {
    await this.userMenu.click();
  }

  /**
   * Logout from application
   */
  async logout() {
    await this.openUserMenu();
    await this.logoutButton.click();
  }

  /**
   * Check if welcome message is visible
   */
  async isWelcomeMessageVisible(): Promise<boolean> {
    return await this.welcomeMessage.isVisible();
  }

  /**
   * Get fast response content
   */
  async getFastResponseContent(): Promise<string> {
    return await this.fastResponseCard.textContent() || '';
  }
}
