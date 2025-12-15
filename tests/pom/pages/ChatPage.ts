/**
 * ChatPage - Page Object Model for chat functionality
 *
 * Encapsulates all interactions with the chat page (/app/chat).
 * Uses data-testid selectors from:
 * - ChatInput.tsx
 * - ResponseCard.tsx
 * - RatingButtons.tsx
 *
 * Main features:
 * - Submit queries
 * - View fast and accurate responses
 * - Rate responses
 * - View sources
 * - Request detailed answers
 */

import type { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type ResponseType = 'fast' | 'accurate';
export type RatingValue = 'up' | 'down' | 'none';

export class ChatPage extends BasePage {
  // Page path
  private readonly path = '/app/chat';

  // Selectors - Chat Input
  private readonly inputSelectors = {
    form: 'chat-input-form',
    input: 'chat-input',
    characterCounter: 'character-counter',
    rateLimitInfo: 'rate-limit-info',
    activeQueriesInfo: 'active-queries-info',
    sendButton: 'send-button',
    errorMessage: 'error-message',
  };

  // Selectors - Response Card
  private readonly responseSelectors = {
    cardFast: 'response-card-fast',
    cardAccurate: 'response-card-accurate',
    typeBadge: 'response-type-badge',
    modelNameBadge: 'model-name-badge',
    generationTimeBadge: 'generation-time-badge',
    ragCacheTimer: 'rag-cache-timer',
    cacheExpiredBadge: 'cache-expired-badge',
    content: 'response-content',
    sourcesList: 'sources-list',
    ratingButtonsContainer: 'rating-buttons-container',
    detailedAnswerButton: 'detailed-answer-button',
  };

  // Selectors - Rating Buttons
  private readonly ratingSelectors = {
    wrapper: 'rating-buttons-wrapper',
    thumbsUp: 'thumbs-up-button',
    thumbsDown: 'thumbs-down-button',
  };

  constructor(page: Page) {
    super(page);
  }

  // ======================
  // NAVIGATION
  // ======================

  /**
   * Navigate to chat page
   */
  async goto(): Promise<void> {
    await super.goto(this.path);
    await this.waitForSelector(this.inputSelectors.form);
  }

  // ======================
  // CHAT INPUT INTERACTIONS
  // ======================

  /**
   * Fill query input field
   */
  async fillQuery(text: string): Promise<void> {
    await this.fill(this.inputSelectors.input, text);
  }

  /**
   * Clear query input field
   */
  async clearQuery(): Promise<void> {
    await this.fill(this.inputSelectors.input, '');
  }

  /**
   * Click send button
   */
  async clickSend(): Promise<void> {
    await this.click(this.inputSelectors.sendButton);
  }

  /**
   * Submit a query (fill and send)
   * High-level method that combines fill and submit actions
   */
  async submitQuery(text: string): Promise<void> {
    await this.fillQuery(text);
    await this.clickSend();
  }

  /**
   * Get character count text
   * @returns Character count (e.g., "25/1000")
   */
  async getCharacterCount(): Promise<string> {
    const text = await this.getTextContent(this.inputSelectors.characterCounter);
    return text || '';
  }

  /**
   * Get rate limit info text
   * @returns Rate limit info (e.g., "5/10")
   */
  async getRateLimitInfo(): Promise<string> {
    const text = await this.getTextContent(this.inputSelectors.rateLimitInfo);
    return text || '';
  }

  /**
   * Get active queries info text
   * @returns Active queries count or null if not visible
   */
  async getActiveQueriesInfo(): Promise<string | null> {
    const isVisible = await this.isVisible(this.inputSelectors.activeQueriesInfo);
    if (!isVisible) {
      return null;
    }
    return await this.getTextContent(this.inputSelectors.activeQueriesInfo);
  }

  /**
   * Check if send button is disabled
   */
  async isSendButtonDisabled(): Promise<boolean> {
    return await this.isDisabled(this.inputSelectors.sendButton);
  }

  /**
   * Get error message (if visible)
   */
  async getErrorMessage(): Promise<string | null> {
    const isVisible = await this.isVisible(this.inputSelectors.errorMessage);
    if (!isVisible) {
      return null;
    }
    return await this.getTextContent(this.inputSelectors.errorMessage);
  }

  // ======================
  // RESPONSE INTERACTIONS
  // ======================

  /**
   * Get response card locator by type
   */
  private getResponseCard(type: ResponseType): Locator {
    const selector = type === 'fast' ? this.responseSelectors.cardFast : this.responseSelectors.cardAccurate;
    return this.getByTestId(selector);
  }

  /**
   * Wait for response card to appear
   */
  async waitForResponse(type: ResponseType, timeout = 30000): Promise<void> {
    const selector = type === 'fast' ? this.responseSelectors.cardFast : this.responseSelectors.cardAccurate;
    await this.waitForSelector(selector, { timeout });
  }

  /**
   * Wait for fast response to appear
   */
  async waitForFastResponse(timeout = 20000): Promise<void> {
    await this.waitForResponse('fast', timeout);
  }

  /**
   * Wait for accurate response to appear
   */
  async waitForAccurateResponse(timeout = 250000): Promise<void> {
    await this.waitForResponse('accurate', timeout);
  }

  /**
   * Check if response is visible
   */
  async hasResponse(type: ResponseType): Promise<boolean> {
    const selector = type === 'fast' ? this.responseSelectors.cardFast : this.responseSelectors.cardAccurate;
    return await this.isVisible(selector);
  }

  /**
   * Get response content text
   */
  async getResponseContent(type: ResponseType): Promise<string> {
    const card = this.getResponseCard(type);
    const content = card.getByTestId(this.responseSelectors.content);
    return (await content.textContent()) || '';
  }

  /**
   * Get response model name
   */
  async getResponseModelName(type: ResponseType): Promise<string> {
    const card = this.getResponseCard(type);
    const badge = card.getByTestId(this.responseSelectors.modelNameBadge);
    return (await badge.textContent()) || '';
  }

  /**
   * Get response generation time
   */
  async getResponseGenerationTime(type: ResponseType): Promise<string> {
    const card = this.getResponseCard(type);
    const badge = card.getByTestId(this.responseSelectors.generationTimeBadge);
    return (await badge.textContent()) || '';
  }

  /**
   * Get RAG cache timer text
   */
  async getCacheTimer(): Promise<string | null> {
    const isVisible = await this.isVisible(this.responseSelectors.ragCacheTimer);
    if (!isVisible) {
      return null;
    }
    return await this.getTextContent(this.responseSelectors.ragCacheTimer);
  }

  /**
   * Check if cache is expired
   */
  async isCacheExpired(): Promise<boolean> {
    return await this.isVisible(this.responseSelectors.cacheExpiredBadge);
  }

  // ======================
  // SOURCES INTERACTIONS
  // ======================

  /**
   * Get number of sources for a response
   */
  async getSourcesCount(type: ResponseType): Promise<number> {
    const card = this.getResponseCard(type);
    const sourcesList = card.getByTestId(this.responseSelectors.sourcesList);

    // Check if sources list is visible
    const isVisible = await sourcesList.isVisible().catch(() => false);
    if (!isVisible) {
      return 0;
    }

    // Count source items
    const sourceItems = await card.locator('[data-testid^="source-item-"]').count();
    return sourceItems;
  }

  /**
   * Get source title by index
   */
  async getSourceTitle(type: ResponseType, index: number): Promise<string> {
    const card = this.getResponseCard(type);
    const sourceLink = card.getByTestId(`source-link-${index}`);
    return (await sourceLink.textContent()) || '';
  }

  /**
   * Get source link URL by index
   */
  async getSourceLink(type: ResponseType, index: number): Promise<string> {
    const card = this.getResponseCard(type);
    const sourceLink = card.getByTestId(`source-link-${index}`);
    return (await sourceLink.getAttribute('href')) || '';
  }

  /**
   * Click source link by index
   */
  async clickSourceLink(type: ResponseType, index: number): Promise<void> {
    const card = this.getResponseCard(type);
    const sourceLink = card.getByTestId(`source-link-${index}`);
    await sourceLink.click();
  }

  // ======================
  // RATING INTERACTIONS
  // ======================

  /**
   * Get rating buttons wrapper for a response
   */
  private getRatingButtons(type: ResponseType): Locator {
    const card = this.getResponseCard(type);
    return card.getByTestId(this.ratingSelectors.wrapper);
  }

  /**
   * Click thumbs up button
   */
  async clickThumbsUp(type: ResponseType): Promise<void> {
    const card = this.getResponseCard(type);
    const thumbsUpButton = card.getByTestId(this.ratingSelectors.thumbsUp);
    await thumbsUpButton.click();
  }

  /**
   * Click thumbs down button
   */
  async clickThumbsDown(type: ResponseType): Promise<void> {
    const card = this.getResponseCard(type);
    const thumbsDownButton = card.getByTestId(this.ratingSelectors.thumbsDown);
    await thumbsDownButton.click();
  }

  /**
   * Get current rating value
   */
  async getCurrentRating(type: ResponseType): Promise<RatingValue> {
    const ratingButtons = this.getRatingButtons(type);
    const ratingValue = await ratingButtons.getAttribute('data-rating-value');
    return (ratingValue as RatingValue) || 'none';
  }

  /**
   * Check if rating is being submitted
   */
  async isRatingSubmitting(type: ResponseType): Promise<boolean> {
    const ratingButtons = this.getRatingButtons(type);
    const isSubmitting = await ratingButtons.getAttribute('data-is-submitting');
    return isSubmitting === 'true';
  }

  // ======================
  // DETAILED ANSWER
  // ======================

  /**
   * Click detailed answer button
   */
  async clickDetailedAnswerButton(): Promise<void> {
    await this.click(this.responseSelectors.detailedAnswerButton);
  }

  /**
   * Check if detailed answer button is visible
   */
  async hasDetailedAnswerButton(): Promise<boolean> {
    return await this.isVisible(this.responseSelectors.detailedAnswerButton);
  }

  /**
   * Check if detailed answer button is disabled
   */
  async isDetailedAnswerButtonDisabled(): Promise<boolean> {
    return await this.isDisabled(this.responseSelectors.detailedAnswerButton);
  }
}
