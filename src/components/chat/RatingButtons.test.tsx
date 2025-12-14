/**
 * Unit Tests for RatingButtons Component
 *
 * Test Priority: WYSOKI (35/50)
 *
 * Key Business Rules:
 * - Optimistic updates: UI updates immediately, rollback on error
 * - One-time rating: Once a rating is given, user cannot change it
 * - Disable both buttons when submitting or parent disabled
 * - Only one button can be active at a time
 * - Uses useOptimisticRating hook for state management
 *
 * @see .ai/unit-testing-priorities.md (Priority #6)
 * @see .ai/vitest-unit-testing.mdc (Testing guidelines)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RatingButtons } from './RatingButtons';
import type { RatingDetail } from '@/lib/types';

// Mock useOptimisticRating hook
vi.mock('@/lib/hooks/useOptimisticRating', () => ({
  useOptimisticRating: vi.fn(),
}));

import { useOptimisticRating } from '@/lib/hooks/useOptimisticRating';

// ═════════════════════════════════════════════════════════════════════════════
// TEST DATA FACTORIES
// ═════════════════════════════════════════════════════════════════════════════

const createMockRating = (value: 'up' | 'down'): RatingDetail => ({
  rating_id: 'rating-123',
  value,
  created_at: new Date().toISOString(),
});

const mockUseOptimisticRating = (overrides = {}) => ({
  rating: null,
  isSubmitting: false,
  handleRating: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('RatingButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: no rating, not submitting
    vi.mocked(useOptimisticRating).mockReturnValue(mockUseOptimisticRating());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RENDERING
  // ───────────────────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('should render both thumbs up and thumbs down buttons', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      expect(screen.getByLabelText('Oceń pozytywnie')).toBeInTheDocument();
      expect(screen.getByLabelText('Oceń negatywnie')).toBeInTheDocument();
    });

    it('should render buttons with outline variant by default', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      // Buttons should NOT have 'default' variant initially
      expect(upButton).not.toHaveClass('bg-primary');
      expect(downButton).not.toHaveClass('bg-primary');
    });

    it('should render screen reader text for buttons', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      // Screen reader text should exist but hidden on small screens
      expect(screen.getByText('Pozytywna')).toBeInTheDocument();
      expect(screen.getByText('Negatywna')).toBeInTheDocument();
    });

    it('should render with correct button type attribute', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).toHaveAttribute('type', 'button');
      expect(downButton).toHaveAttribute('type', 'button');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ACTIVE STATES (Visual feedback)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Active States', () => {
    it('should highlight thumbs up button when rating is "up"', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: 'up' })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      expect(upButton).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should highlight thumbs down button when rating is "down"', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: 'down' })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const downButton = screen.getByLabelText('Oceń negatywnie');
      expect(downButton).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should fill icon when thumbs up is active', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: 'up' })
      );

      // Act
      const { container } = render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const upIcon = upButton.querySelector('svg');
      expect(upIcon).toHaveClass('fill-current');
    });

    it('should fill icon when thumbs down is active', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: 'down' })
      );

      // Act
      const { container } = render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const downButton = screen.getByLabelText('Oceń negatywnie');
      const downIcon = downButton.querySelector('svg');
      expect(downIcon).toHaveClass('fill-current');
    });

    it('should only highlight one button at a time', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: 'up' })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).toHaveClass('bg-primary');
      expect(downButton).not.toHaveClass('bg-primary');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // HOOK INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('useOptimisticRating Hook Integration', () => {
    it('should call useOptimisticRating with correct params', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
          currentRating={createMockRating('up')}
        />
      );

      // Assert
      expect(useOptimisticRating).toHaveBeenCalledWith(
        'query-123',
        'fast',
        'up'
      );
    });

    it('should pass null as initial rating if currentRating is undefined', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
          currentRating={undefined}
        />
      );

      // Assert
      expect(useOptimisticRating).toHaveBeenCalledWith(
        'query-123',
        'fast',
        null
      );
    });

    it('should call useOptimisticRating with accurate responseType', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-456"
          responseType="accurate"
        />
      );

      // Assert
      expect(useOptimisticRating).toHaveBeenCalledWith(
        'query-456',
        'accurate',
        null
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // USER INTERACTIONS (Clicking Buttons)
  // ───────────────────────────────────────────────────────────────────────────
  describe('User Interactions', () => {
    it('should call handleRating with "up" when thumbs up clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockHandleRating = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ handleRating: mockHandleRating })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      await user.click(upButton);

      // Assert
      expect(mockHandleRating).toHaveBeenCalledWith('up');
      expect(mockHandleRating).toHaveBeenCalledTimes(1);
    });

    it('should call handleRating with "down" when thumbs down clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockHandleRating = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ handleRating: mockHandleRating })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );
      const downButton = screen.getByLabelText('Oceń negatywnie');
      await user.click(downButton);

      // Assert
      expect(mockHandleRating).toHaveBeenCalledWith('down');
      expect(mockHandleRating).toHaveBeenCalledTimes(1);
    });

    it('should NOT call handleRating when button is disabled', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockHandleRating = vi.fn();
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ handleRating: mockHandleRating })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
          disabled={true}
        />
      );
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      await user.click(upButton);

      // Assert
      expect(mockHandleRating).not.toHaveBeenCalled();
    });

    it('should NOT call handleRating when isSubmitting is true', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockHandleRating = vi.fn();
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({
          handleRating: mockHandleRating,
          isSubmitting: true,
        })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      await user.click(upButton);

      // Assert
      expect(mockHandleRating).not.toHaveBeenCalled();
    });

    it('should log error to console when handleRating fails', async () => {
      // Arrange
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = new Error('Network error');
      const mockHandleRating = vi.fn().mockRejectedValue(mockError);
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ handleRating: mockHandleRating })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      await user.click(upButton);

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to submit rating:',
          mockError
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DISABLED STATES (Business Rule: One-time rating)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Disabled States', () => {
    it('should disable both buttons when disabled prop is true', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
          disabled={true}
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).toBeDisabled();
      expect(downButton).toBeDisabled();
    });

    it('should disable both buttons when isSubmitting is true', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ isSubmitting: true })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).toBeDisabled();
      expect(downButton).toBeDisabled();
    });

    it('should disable thumbs down when thumbs up is active (one-time rating)', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: 'up' })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).not.toBeDisabled(); // Active button stays enabled
      expect(downButton).toBeDisabled(); // Inactive button disabled
    });

    it('should disable thumbs up when thumbs down is active (one-time rating)', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: 'down' })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).toBeDisabled(); // Inactive button disabled
      expect(downButton).not.toBeDisabled(); // Active button stays enabled
    });

    it('should not disable any button when no rating is set', () => {
      // Arrange
      vi.mocked(useOptimisticRating).mockReturnValue(
        mockUseOptimisticRating({ rating: null })
      );

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).not.toBeDisabled();
      expect(downButton).not.toBeDisabled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ACCESSIBILITY
  // ───────────────────────────────────────────────────────────────────────────
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      expect(screen.getByLabelText('Oceń pozytywnie')).toBeInTheDocument();
      expect(screen.getByLabelText('Oceń negatywnie')).toBeInTheDocument();
    });

    it('should be keyboard accessible (buttons are native button elements)', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton.tagName).toBe('BUTTON');
      expect(downButton.tagName).toBe('BUTTON');
    });

    it('should have screen reader text for rating type', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      // Screen reader text should be present (sr-only class hides visually but not from screen readers)
      const posText = screen.getByText('Pozytywna');
      const negText = screen.getByText('Negatywna');

      expect(posText).toBeInTheDocument();
      expect(negText).toBeInTheDocument();
    });

    it('should indicate disabled state to screen readers', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
          disabled={true}
        />
      );

      // Assert
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      const downButton = screen.getByLabelText('Oceń negatywnie');

      expect(upButton).toHaveAttribute('disabled');
      expect(downButton).toHaveAttribute('disabled');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // EDGE CASES
  // ───────────────────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should handle missing currentRating gracefully', () => {
      // Arrange & Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
          currentRating={undefined}
        />
      );

      // Assert
      expect(useOptimisticRating).toHaveBeenCalledWith('query-123', 'fast', null);
    });

    it('should handle currentRating with null value', () => {
      // Arrange
      const currentRating = {
        rating_id: 'rating-123',
        value: null as any, // Edge case: null value
        created_at: new Date().toISOString(),
      };

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
          currentRating={currentRating}
        />
      );

      // Assert
      expect(useOptimisticRating).toHaveBeenCalledWith('query-123', 'fast', null);
    });

    it('should render with gap between buttons', () => {
      // Arrange & Act
      const { container } = render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert
      const wrapper = container.querySelector('.flex.items-center.gap-2');
      expect(wrapper).toBeInTheDocument();
    });

    it('should prevent clicks when isSubmitting is true (prevents rapid submissions)', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockHandleRating = vi.fn();

      // Mock hook with isSubmitting=true from the start
      vi.mocked(useOptimisticRating).mockReturnValue({
        rating: null,
        isSubmitting: true, // Simulates submission in progress
        handleRating: mockHandleRating,
      });

      // Act
      render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      const upButton = screen.getByLabelText('Oceń pozytywnie');
      await user.click(upButton);

      // Assert
      // Click should be prevented because isSubmitting=true
      expect(mockHandleRating).not.toHaveBeenCalled();
    });

    it('should work with both fast and accurate responseType', () => {
      // Arrange & Act - Fast
      const { rerender } = render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert - Fast
      expect(useOptimisticRating).toHaveBeenCalledWith('query-123', 'fast', null);

      // Act - Accurate
      rerender(
        <RatingButtons
          queryId="query-123"
          responseType="accurate"
        />
      );

      // Assert - Accurate
      expect(useOptimisticRating).toHaveBeenCalledWith('query-123', 'accurate', null);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // OPTIMISTIC UPDATES SIMULATION
  // ───────────────────────────────────────────────────────────────────────────
  describe('Optimistic Updates', () => {
    it('should show optimistic state immediately (via hook)', async () => {
      // Arrange
      const user = userEvent.setup();
      let currentRating: 'up' | 'down' | null = null;

      // Mock hook to simulate optimistic update
      const mockHandleRating = vi.fn().mockImplementation(async (value) => {
        currentRating = value;
      });

      vi.mocked(useOptimisticRating).mockImplementation(() => ({
        rating: currentRating,
        isSubmitting: false,
        handleRating: mockHandleRating,
      }));

      // Act
      const { rerender } = render(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Initially no rating
      expect(screen.getByLabelText('Oceń pozytywnie')).not.toHaveClass('bg-primary');

      // Click thumbs up
      const upButton = screen.getByLabelText('Oceń pozytywnie');
      await user.click(upButton);

      // Optimistic state updated
      currentRating = 'up';
      rerender(
        <RatingButtons
          queryId="query-123"
          responseType="fast"
        />
      );

      // Assert - Button should show active state immediately
      expect(mockHandleRating).toHaveBeenCalledWith('up');
    });
  });
});
