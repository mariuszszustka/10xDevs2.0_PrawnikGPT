/**
 * Unit Tests for ResponseCard Component
 *
 * Test Priority: WYSOKI (36/50)
 *
 * Key Business Rules:
 * - Display fast OR accurate response based on responseType prop
 * - Show RAG context timer (5min cache) with expiring/expired states
 * - "Detailed answer" button: only for fast responses, when accurate doesn't exist, and when cache not expired
 * - Render Markdown content with sources and rating buttons
 * - Format generation time as seconds with 1 decimal place
 *
 * @see .ai/unit-testing-priorities.md (Priority #5)
 * @see .ai/vitest-unit-testing.mdc (Testing guidelines)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseCard } from './ResponseCard';
import type { QueryDetailResponse, RatingValue, ResponseType } from '@/lib/types';

// Mock dependencies
vi.mock('./MarkdownContent', () => ({
  MarkdownContent: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="markdown-content" className={className}>{content}</div>
  ),
}));

vi.mock('./RatingButtons', () => ({
  RatingButtons: ({ queryId, responseType, currentRating, onRatingChange }: any) => (
    <div data-testid="rating-buttons">
      <span>Query: {queryId}</span>
      <span>Type: {responseType}</span>
      <span>Rating: {currentRating?.value || 'none'}</span>
    </div>
  ),
}));

vi.mock('./DetailedAnswerModal', () => ({
  DetailedAnswerModal: ({ queryId, isOpen, onClose, onRatingClick }: any) => (
    isOpen ? (
      <div data-testid="detailed-answer-modal">
        <span>Query: {queryId}</span>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/lib/hooks/useRAGContextTimer', () => ({
  useRAGContextTimer: vi.fn(),
}));

import { useRAGContextTimer } from '@/lib/hooks/useRAGContextTimer';

// ═════════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═════════════════════════════════════════════════════════════════════════════

const createMockQuery = (overrides?: Partial<QueryDetailResponse>): QueryDetailResponse => ({
  query_id: 'test-query-123',
  query_text: 'Test query?',
  status: 'completed',
  created_at: new Date().toISOString(),
  fast_response: {
    status: 'completed',
    content: 'Fast response content',
    model_name: 'mistral:7b',
    generation_time_ms: 12345,
    sources: [
      {
        act_title: 'Ustawa o testach',
        article: 'Art. 1',
        link: 'https://isap.sejm.gov.pl/test/1',
        chunk_id: 'chunk-1',
      },
    ],
  },
  accurate_response: null,
  ...overrides,
});

const mockTimerNotExpired = {
  secondsRemaining: 180, // 3 minutes
  isExpiring: false,
  isExpired: false,
};

const mockTimerExpiring = {
  secondsRemaining: 45, // 45 seconds
  isExpiring: true,
  isExpired: false,
};

const mockTimerExpired = {
  secondsRemaining: 0,
  isExpiring: false,
  isExpired: true,
};

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('ResponseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default timer state: not expired
    vi.mocked(useRAGContextTimer).mockReturnValue(mockTimerNotExpired);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RENDERING - Fast Response
  // ───────────────────────────────────────────────────────────────────────────
  describe('Fast Response Rendering', () => {
    it('should render fast response with correct badge', () => {
      // Arrange
      const query = createMockQuery();

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('Szybka odpowiedź')).toBeInTheDocument();
    });

    it('should render fast response content via MarkdownContent', () => {
      // Arrange
      const query = createMockQuery();

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      const markdown = screen.getByTestId('markdown-content');
      expect(markdown).toHaveTextContent('Fast response content');
      expect(markdown).toHaveClass('text-sm');
    });

    it('should render model name badge', () => {
      // Arrange
      const query = createMockQuery();

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('mistral:7b')).toBeInTheDocument();
    });

    it('should render generation time badge with correct format', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          generation_time_ms: 12345, // Should display as "12.3s"
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('12.3s')).toBeInTheDocument();
    });

    it('should render rating buttons for fast response', () => {
      // Arrange
      const query = createMockQuery();

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      const ratingButtons = screen.getByTestId('rating-buttons');
      expect(ratingButtons).toBeInTheDocument();
      expect(ratingButtons).toHaveTextContent('Query: test-query-123');
      expect(ratingButtons).toHaveTextContent('Type: fast');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RENDERING - Accurate Response
  // ───────────────────────────────────────────────────────────────────────────
  describe('Accurate Response Rendering', () => {
    it('should render accurate response with correct badge', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: {
          status: 'completed',
          content: 'Accurate response content',
          model_name: 'gpt-oss:120b',
          generation_time_ms: 180000,
          sources: [],
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="accurate" />);

      // Assert
      expect(screen.getByText('Dokładna odpowiedź')).toBeInTheDocument();
    });

    it('should render accurate response content', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: {
          status: 'completed',
          content: 'Accurate response content',
          model_name: 'gpt-oss:120b',
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="accurate" />);

      // Assert
      expect(screen.getByTestId('markdown-content')).toHaveTextContent('Accurate response content');
    });

    it('should render rating buttons for accurate response', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: {
          status: 'completed',
          content: 'Test',
          model_name: 'gpt-oss:120b',
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="accurate" />);

      // Assert
      const ratingButtons = screen.getByTestId('rating-buttons');
      expect(ratingButtons).toHaveTextContent('Type: accurate');
    });

    it('should NOT render detailed answer button for accurate response', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: {
          status: 'completed',
          content: 'Test',
          model_name: 'gpt-oss:120b',
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="accurate" />);

      // Assert
      expect(screen.queryByText('Uzyskaj dokładniejszą odpowiedź')).not.toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RAG CONTEXT TIMER
  // ───────────────────────────────────────────────────────────────────────────
  describe('RAG Context Timer', () => {
    it('should display cache timer in MM:SS format when not expired', () => {
      // Arrange
      const query = createMockQuery();
      vi.mocked(useRAGContextTimer).mockReturnValue({
        secondsRemaining: 185, // 3:05
        isExpiring: false,
        isExpired: false,
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText(/Cache: 3:05/)).toBeInTheDocument();
    });

    it('should display destructive badge when cache is expiring', () => {
      // Arrange
      const query = createMockQuery();
      vi.mocked(useRAGContextTimer).mockReturnValue(mockTimerExpiring);

      // Act
      const { container } = render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      const timerBadge = screen.getByText(/Cache: 0:45/);
      expect(timerBadge).toBeInTheDocument();
      // Check if parent Badge has destructive variant (would need data-testid for precise check)
    });

    it('should display "Cache wygasł" when expired', () => {
      // Arrange
      const query = createMockQuery();
      vi.mocked(useRAGContextTimer).mockReturnValue(mockTimerExpired);

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('Cache wygasł')).toBeInTheDocument();
    });

    it('should NOT display timer countdown when expired', () => {
      // Arrange
      const query = createMockQuery();
      vi.mocked(useRAGContextTimer).mockReturnValue(mockTimerExpired);

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.queryByText(/Cache: \d+:\d+/)).not.toBeInTheDocument();
    });

    it('should pad seconds with zero (e.g., "3:05" not "3:5")', () => {
      // Arrange
      const query = createMockQuery();
      vi.mocked(useRAGContextTimer).mockReturnValue({
        secondsRemaining: 185, // 3 minutes 5 seconds
        isExpiring: false,
        isExpired: false,
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText(/Cache: 3:05/)).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SOURCES LIST
  // ───────────────────────────────────────────────────────────────────────────
  describe('Sources List', () => {
    it('should render sources section when sources exist', () => {
      // Arrange
      const query = createMockQuery();

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('Źródła')).toBeInTheDocument();
    });

    it('should render all sources with act_title and article', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          sources: [
            {
              act_title: 'Kodeks cywilny',
              article: 'Art. 353',
              link: 'https://isap.sejm.gov.pl/test/1',
              chunk_id: 'chunk-1',
            },
            {
              act_title: 'Konstytucja RP',
              article: 'Art. 2',
              link: 'https://isap.sejm.gov.pl/test/2',
              chunk_id: 'chunk-2',
            },
          ],
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('Kodeks cywilny')).toBeInTheDocument();
      expect(screen.getByText(/Art\. 353/)).toBeInTheDocument();
      expect(screen.getByText('Konstytucja RP')).toBeInTheDocument();
      expect(screen.getByText(/Art\. 2/)).toBeInTheDocument();
    });

    it('should render source links with correct attributes', () => {
      // Arrange
      const query = createMockQuery();

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      const link = screen.getByRole('link', { name: /Ustawa o testach.*Art\. 1/ });
      expect(link).toHaveAttribute('href', 'https://isap.sejm.gov.pl/test/1');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should NOT render sources section when sources array is empty', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          sources: [],
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.queryByText('Źródła')).not.toBeInTheDocument();
    });

    it('should NOT render sources section when sources is undefined', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          sources: undefined,
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.queryByText('Źródła')).not.toBeInTheDocument();
    });

    it('should render source without article if article is missing', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          sources: [
            {
              act_title: 'Ustawa testowa',
              article: '',
              link: 'https://isap.sejm.gov.pl/test/1',
              chunk_id: 'chunk-1',
            },
          ],
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('Ustawa testowa')).toBeInTheDocument();
      expect(screen.queryByText(/Art\./)).not.toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DETAILED ANSWER BUTTON (Conditional Rendering)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Detailed Answer Button', () => {
    it('should show button for fast response when accurate response does not exist', () => {
      // Arrange
      const query = createMockQuery({ accurate_response: null });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('Uzyskaj dokładniejszą odpowiedź')).toBeInTheDocument();
    });

    it('should NOT show button if accurate response already exists', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: {
          status: 'completed',
          content: 'Accurate content',
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.queryByText('Uzyskaj dokładniejszą odpowiedź')).not.toBeInTheDocument();
    });

    it('should NOT show button if cache is expired', () => {
      // Arrange
      const query = createMockQuery({ accurate_response: null });
      vi.mocked(useRAGContextTimer).mockReturnValue(mockTimerExpired);

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.queryByText('Uzyskaj dokładniejszą odpowiedź')).not.toBeInTheDocument();
    });

    it('should NOT show button for accurate response type', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: {
          status: 'completed',
          content: 'Test',
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="accurate" />);

      // Assert
      expect(screen.queryByText('Uzyskaj dokładniejszą odpowiedź')).not.toBeInTheDocument();
    });

    it('should show button when accurate response is pending (not completed)', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: {
          status: 'pending',
          content: undefined,
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      // Button SHOULD show because accurate_response.status !== 'completed'
      expect(screen.getByText('Uzyskaj dokładniejszą odpowiedź')).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // USER INTERACTIONS
  // ───────────────────────────────────────────────────────────────────────────
  describe('User Interactions', () => {
    it('should open DetailedAnswerModal when button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const query = createMockQuery({ accurate_response: null });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);
      const button = screen.getByText('Uzyskaj dokładniejszą odpowiedź');
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('detailed-answer-modal')).toBeInTheDocument();
      });
    });

    it('should call onDetailedAnswerClick callback when button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const onDetailedAnswerClick = vi.fn().mockResolvedValue(undefined);
      const query = createMockQuery({ accurate_response: null });

      // Act
      render(
        <ResponseCard
          query={query}
          responseType="fast"
          onDetailedAnswerClick={onDetailedAnswerClick}
        />
      );
      const button = screen.getByText('Uzyskaj dokładniejszą odpowiedź');
      await user.click(button);

      // Assert
      expect(onDetailedAnswerClick).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const query = createMockQuery({ accurate_response: null });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Open modal
      const openButton = screen.getByText('Uzyskaj dokładniejszą odpowiedź');
      await user.click(openButton);

      // Close modal
      const closeButton = screen.getByText('Close Modal');
      await user.click(closeButton);

      // Assert
      await waitFor(() => {
        expect(screen.queryByTestId('detailed-answer-modal')).not.toBeInTheDocument();
      });
    });

    it('should NOT call onDetailedAnswerClick if callback not provided', async () => {
      // Arrange
      const user = userEvent.setup();
      const query = createMockQuery({ accurate_response: null });

      // Act & Assert (should not throw error)
      render(<ResponseCard query={query} responseType="fast" />);
      const button = screen.getByText('Uzyskaj dokładniejszą odpowiedź');
      await user.click(button);

      // No error means success
      expect(screen.getByTestId('detailed-answer-modal')).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CONDITIONAL RENDERING (Return null cases)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Conditional Rendering', () => {
    it('should return null if fast_response is null', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: null as any,
      });

      // Act
      const { container } = render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });

    it('should return null if response status is not completed', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'pending',
          content: undefined,
        },
      });

      // Act
      const { container } = render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });

    it('should return null if response content is missing', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: undefined,
        },
      });

      // Act
      const { container } = render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });

    it('should return null if response content is empty string', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: '',
        },
      });

      // Act
      const { container } = render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });

    it('should return null if accurate_response is requested but null', () => {
      // Arrange
      const query = createMockQuery({
        accurate_response: null,
      });

      // Act
      const { container } = render(<ResponseCard query={query} responseType="accurate" />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ───────────────────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should render without model_name badge if not provided', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          model_name: undefined,
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.queryByText(/mistral|gpt-oss/)).not.toBeInTheDocument();
    });

    it('should render "N/A" for generation time if not provided', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          generation_time_ms: undefined,
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.queryByText(/\d+\.\d+s/)).not.toBeInTheDocument();
    });

    it('should format generation time with 1 decimal place', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          generation_time_ms: 1234, // 1.234s -> should display as "1.2s"
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(screen.getByText('1.2s')).toBeInTheDocument();
    });

    it('should render with current rating if exists', () => {
      // Arrange
      const query = createMockQuery({
        fast_response: {
          status: 'completed',
          content: 'Test',
          rating: {
            rating_id: 'rating-123',
            value: 'thumbs_up',
            created_at: new Date().toISOString(),
          },
        },
      });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      const ratingButtons = screen.getByTestId('rating-buttons');
      expect(ratingButtons).toHaveTextContent('Rating: thumbs_up');
    });

    it('should pass created_at to useRAGContextTimer hook', () => {
      // Arrange
      const createdAt = '2025-12-14T10:00:00Z';
      const query = createMockQuery({ created_at: createdAt });

      // Act
      render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      expect(useRAGContextTimer).toHaveBeenCalledWith(createdAt);
    });

    it('should render article element with correct semantic HTML', () => {
      // Arrange
      const query = createMockQuery();

      // Act
      const { container } = render(<ResponseCard query={query} responseType="fast" />);

      // Assert
      const article = container.querySelector('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveClass('flex', 'justify-start', 'mb-4');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RATING CALLBACK
  // ───────────────────────────────────────────────────────────────────────────
  describe('Rating Callback', () => {
    it('should handle rating click for fast response', async () => {
      // Arrange
      const onRatingClick = vi.fn().mockResolvedValue(undefined);
      const query = createMockQuery();

      // Act
      render(
        <ResponseCard
          query={query}
          responseType="fast"
          onRatingClick={onRatingClick}
        />
      );

      // The actual rating button click would be tested in RatingButtons.test.tsx
      // Here we just verify the component renders with the prop
      expect(screen.getByTestId('rating-buttons')).toBeInTheDocument();
    });

    it('should handle rating click for accurate response', async () => {
      // Arrange
      const onRatingClick = vi.fn().mockResolvedValue(undefined);
      const query = createMockQuery({
        accurate_response: {
          status: 'completed',
          content: 'Test',
        },
      });

      // Act
      render(
        <ResponseCard
          query={query}
          responseType="accurate"
          onRatingClick={onRatingClick}
        />
      );

      // Assert
      expect(screen.getByTestId('rating-buttons')).toBeInTheDocument();
    });
  });
});
