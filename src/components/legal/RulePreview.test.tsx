/**
 * RulePreview.test.tsx - Testy jednostkowe dla RulePreview
 *
 * STRUKTURA TESTÓW (ASCII):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   RulePreview.test.tsx
 *          │
 *          ├─ describe('RulePreview Component')
 *          │     │
 *          │     ├─ describe('Rendering')
 *          │     │     ├─ it('should render rule title and metadata')
 *          │     │     ├─ it('should render status badge with correct variant')
 *          │     │     └─ it('should render truncated content when collapsed')
 *          │     │
 *          │     ├─ describe('Expand/Collapse Behavior')
 *          │     │     ├─ it('should expand content when expand button clicked')
 *          │     │     ├─ it('should collapse content when collapse button clicked')
 *          │     │     └─ it('should call onExpand callback (controlled mode)')
 *          │     │
 *          │     ├─ describe('ISAP Link')
 *          │     │     ├─ it('should render ISAP link when URL provided')
 *          │     │     └─ it('should not render ISAP link when URL missing')
 *          │     │
 *          │     └─ describe('Accessibility')
 *          │           ├─ it('should have proper data-testid attributes')
 *          │           └─ it('should have no accessibility violations')
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulePreview } from './RulePreview';
import type { LegalRule } from './RulePreview';

/**
 * Mock data dla testów
 */
const mockRule: LegalRule = {
  id: 'rule-123',
  title: 'Art. 5 Kodeksu cywilnego',
  content:
    'Nie można czynić ze swego prawa użytku, który by był sprzeczny ze społeczno-gospodarczym przeznaczeniem tego prawa lub z zasadami współżycia społecznego. Takie działanie lub zaniechanie uprawnionego nie jest uważane za wykonywanie prawa i nie korzysta z ochrony.',
  publisher: 'Dz.U.',
  year: 1964,
  position: 16,
  status: 'obowiązujący',
  isapUrl: 'https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=wdu19640160093',
};

const mockShortRule: LegalRule = {
  ...mockRule,
  content: 'Krótka treść artykułu.',
};

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TESTY JEDNOSTKOWE
 * ═══════════════════════════════════════════════════════════════════════════════
 */

describe('RulePreview Component', () => {
  /**
   * ───────────────────────────────────────────────────────────────────────────
   * RENDERING
   * ───────────────────────────────────────────────────────────────────────────
   */
  describe('Rendering', () => {
    it('should render rule title and metadata', () => {
      // Arrange & Act
      render(<RulePreview rule={mockRule} />);

      // Assert
      expect(screen.getByText('Art. 5 Kodeksu cywilnego')).toBeInTheDocument();
      expect(screen.getByText(/Dz\.U\. 1964 nr 16/i)).toBeInTheDocument();
    });

    it('should render status badge with correct variant', () => {
      // Arrange & Act
      render(<RulePreview rule={mockRule} />);

      // Assert
      const badge = screen.getByTestId('rule-status-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('obowiązujący');
    });

    it('should render truncated content when collapsed', () => {
      // Arrange & Act
      render(<RulePreview rule={mockRule} maxContentLength={50} />);

      // Assert
      const content = screen.getByText(/Nie można czynić ze swego prawa użytku.../i);
      expect(content).toBeInTheDocument();
      expect(screen.getByText(/Rozwiń pełną treść/i)).toBeInTheDocument();
    });

    it('should render full content for short rules', () => {
      // Arrange & Act
      render(<RulePreview rule={mockShortRule} maxContentLength={50} />);

      // Assert
      expect(screen.getByText('Krótka treść artykułu.')).toBeInTheDocument();
      expect(screen.queryByText(/Rozwiń pełną treść/i)).not.toBeInTheDocument();
    });

    it('should not render metadata when showMetadata is false', () => {
      // Arrange & Act
      render(<RulePreview rule={mockRule} showMetadata={false} />);

      // Assert
      expect(screen.queryByText(/Dz\.U\. 1964 nr 16/i)).not.toBeInTheDocument();
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * EXPAND/COLLAPSE BEHAVIOR
   * ───────────────────────────────────────────────────────────────────────────
   */
  describe('Expand/Collapse Behavior', () => {
    it('should expand content when expand button clicked (uncontrolled)', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RulePreview rule={mockRule} maxContentLength={50} />);

      // Act
      const expandButton = screen.getByTestId('rule-expand-button');
      await user.click(expandButton);

      // Assert
      expect(screen.getByText(/zasadami współżycia społecznego/i)).toBeInTheDocument();
      expect(screen.getByText(/Zwiń/i)).toBeInTheDocument();
    });

    it('should collapse content when collapse button clicked (uncontrolled)', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<RulePreview rule={mockRule} maxContentLength={50} />);

      // Act - Expand first
      await user.click(screen.getByTestId('rule-expand-button'));
      // Act - Then collapse
      await user.click(screen.getByTestId('rule-expand-button'));

      // Assert
      expect(screen.getByText(/Nie można czynić ze swego prawa użytku.../i)).toBeInTheDocument();
      expect(screen.getByText(/Rozwiń pełną treść/i)).toBeInTheDocument();
    });

    it('should call onExpand callback in controlled mode', async () => {
      // Arrange
      const mockOnExpand = vi.fn();
      const user = userEvent.setup();
      render(<RulePreview rule={mockRule} expanded={false} onExpand={mockOnExpand} maxContentLength={50} />);

      // Act
      await user.click(screen.getByTestId('rule-expand-button'));

      // Assert
      expect(mockOnExpand).toHaveBeenCalledTimes(1);
      expect(mockOnExpand).toHaveBeenCalledWith('rule-123');
    });

    it('should show expanded content when expanded prop is true', () => {
      // Arrange & Act
      render(<RulePreview rule={mockRule} expanded={true} maxContentLength={50} />);

      // Assert
      expect(screen.getByText(/zasadami współżycia społecznego/i)).toBeInTheDocument();
      expect(screen.getByText(/Zwiń/i)).toBeInTheDocument();
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * ISAP LINK
   * ───────────────────────────────────────────────────────────────────────────
   */
  describe('ISAP Link', () => {
    it('should render ISAP link when URL provided', () => {
      // Arrange & Act
      render(<RulePreview rule={mockRule} />);

      // Assert
      const link = screen.getByTestId('rule-isap-link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', mockRule.isapUrl);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should not render ISAP link when URL missing', () => {
      // Arrange
      const ruleWithoutUrl = { ...mockRule, isapUrl: undefined };

      // Act
      render(<RulePreview rule={ruleWithoutUrl} />);

      // Assert
      expect(screen.queryByTestId('rule-isap-link')).not.toBeInTheDocument();
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * STATUS VARIANTS
   * ───────────────────────────────────────────────────────────────────────────
   */
  describe('Status Variants', () => {
    it('should render correct badge for "uchylony" status', () => {
      // Arrange
      const ruleUchylony = { ...mockRule, status: 'uchylony' as const };

      // Act
      render(<RulePreview rule={ruleUchylony} />);

      // Assert
      const badge = screen.getByTestId('rule-status-badge');
      expect(badge).toHaveTextContent('uchylony');
    });

    it('should render correct badge for "nieobowiązujący" status', () => {
      // Arrange
      const ruleNieobowiazujacy = { ...mockRule, status: 'nieobowiązujący' as const };

      // Act
      render(<RulePreview rule={ruleNieobowiazujacy} />);

      // Assert
      const badge = screen.getByTestId('rule-status-badge');
      expect(badge).toHaveTextContent('nieobowiązujący');
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * ACCESSIBILITY
   * ───────────────────────────────────────────────────────────────────────────
   */
  describe('Accessibility', () => {
    it('should have proper data-testid attributes', () => {
      // Arrange & Act
      render(<RulePreview rule={mockRule} />);

      // Assert
      expect(screen.getByTestId('rule-preview')).toBeInTheDocument();
      expect(screen.getByTestId('rule-status-badge')).toBeInTheDocument();
      expect(screen.getByTestId('rule-isap-link')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      // Arrange & Act
      const { container } = render(<RulePreview rule={mockRule} className="custom-class" />);

      // Assert
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  /**
   * ───────────────────────────────────────────────────────────────────────────
   * SNAPSHOT TESTING
   * ───────────────────────────────────────────────────────────────────────────
   */
  describe('Snapshot Testing', () => {
    it('should match snapshot for collapsed state', () => {
      // Arrange & Act
      const { container } = render(<RulePreview rule={mockRule} maxContentLength={50} />);

      // Assert
      expect(container.firstChild).toMatchInlineSnapshot(`
        <div
          class="rounded-lg bg-card text-card-foreground duration-normal ease-standard shadow-lg border-border/50 transition-all hover:shadow-md"
          data-testid="rule-preview"
        >
          <div
            class="flex flex-col space-y-1.5 p-[var(--card-padding)]"
          >
            <div
              class="flex items-start justify-between gap-4"
            >
              <div
                class="flex-1"
              >
                <div
                  class="text-headline font-semibold tracking-tight text-lg"
                >
                  Art. 5 Kodeksu cywilnego
                </div>
                <div
                  class="text-muted-foreground mt-1"
                >
                  Dz.U.
                   
                  1964
                   nr 
                  16
                </div>
              </div>
              <div
                class="inline-flex items-center rounded-[var(--radius-sm)] border px-2.5 py-0.5 font-semibold transition-colors duration-fast ease-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary-hover"
                data-testid="rule-status-badge"
              >
                obowiązujący
              </div>
            </div>
          </div>
          <div
            class="p-[var(--card-padding)] pt-0"
          >
            <div
              class="prose prose-sm max-w-none prose-sm"
            >
              <p>
                Nie można czynić ze swego prawa użytku, który by b...
              </p>
            </div>
            <button
              class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground active:bg-accent/80 duration-normal ease-standard h-[var(--button-height-sm)] px-[var(--button-padding-x-sm)] text-body-small rounded-lg mt-2 w-full"
              data-testid="rule-expand-button"
            >
              <svg
                class="lucide lucide-chevron-down mr-2 h-4 w-4"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="m6 9 6 6 6-6"
                />
              </svg>
              Rozwiń pełną treść
            </button>
          </div>
          <div
            class="flex items-center p-[var(--card-padding)] pt-0"
          >
            <a
              class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 border-primary bg-background hover:bg-primary hover:text-primary-foreground active:bg-primary-active shadow-sm hover:shadow-md duration-normal ease-standard h-[var(--button-height-sm)] px-[var(--button-padding-x-sm)] text-body-small rounded-lg w-full"
              data-testid="rule-isap-link"
              href="https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=wdu19640160093"
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg
                class="lucide lucide-external-link mr-2 h-4 w-4"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 3h6v6"
                />
                <path
                  d="M10 14 21 3"
                />
                <path
                  d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                />
              </svg>
              Zobacz w ISAP
            </a>
          </div>
        </div>
      `);
    });
  });
});
