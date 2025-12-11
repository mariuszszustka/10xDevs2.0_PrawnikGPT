/**
 * PasswordStrengthIndicator - Visual indicator for password strength
 * 
 * Displays a color-coded bar and text label indicating password strength based on PRD requirements:
 * - Red (weak): Doesn't meet all PRD requirements (12+ chars, lowercase, uppercase, digit, special char)
 * - Green (strong): Meets all PRD requirements (12+ chars, lowercase, uppercase, digit, special char)
 * 
 * PRD Requirements:
 * - Minimum 12 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
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
 * 
 * Note: Only 'weak' and 'strong' are used (no 'medium') based on PRD requirements.
 * Password either meets all requirements (strong) or doesn't (weak).
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
      // Medium is not used with PRD requirements, but kept for backward compatibility
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

