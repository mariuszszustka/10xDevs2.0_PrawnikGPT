/**
 * PasswordStrengthIndicator - Visual indicator for password strength
 * 
 * Displays a color-coded bar and text label indicating password strength:
 * - Red (weak): Less than 8 characters or only letters/digits
 * - Yellow (medium): 8+ characters with mix of letters and numbers
 * - Green (strong): 8+ characters with mix of letters, numbers, and special characters
 */

import type { PasswordStrength } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  className?: string;
}

/**
 * Get color configuration for password strength level
 * 
 * @param strength - Password strength level
 * @returns Configuration object with color, text color, label, and width
 */
function getStrengthConfig(strength: PasswordStrength) {
  switch (strength) {
    case 'weak':
      return {
        color: 'bg-red-500',
        textColor: 'text-red-600',
        label: 'Słabe',
        width: '33%',
      };
    case 'medium':
      return {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        label: 'Średnie',
        width: '66%',
      };
    case 'strong':
      return {
        color: 'bg-green-500',
        textColor: 'text-green-600',
        label: 'Silne',
        width: '100%',
      };
    default:
      return {
        color: 'bg-gray-300',
        textColor: 'text-gray-600',
        label: '',
        width: '0%',
      };
  }
}

/**
 * PasswordStrengthIndicator component
 * 
 * Displays a visual bar and text label indicating password strength.
 * Accessible with proper ARIA attributes.
 */
export function PasswordStrengthIndicator({ strength, className }: PasswordStrengthIndicatorProps) {
  const config = getStrengthConfig(strength);

  // Don't show indicator if password is empty
  if (strength === 'weak' && config.label === '') {
    return null;
  }

  return (
    <div className={cn('space-y-1', className)} role="status" aria-live="polite">
      {/* Visual bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full transition-all duration-300', config.color)}
          style={{ width: config.width }}
          aria-hidden="true"
        />
      </div>
      
      {/* Text label */}
      {config.label && (
        <p className={cn('text-xs font-medium', config.textColor)}>
          Siła hasła: {config.label}
        </p>
      )}
    </div>
  );
}

