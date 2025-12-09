/**
 * ChatInput.tsx
 * 
 * Pole wprowadzania pytań z walidacją, licznikiem znaków, wskaźnikiem rate limit
 * oraz obsługą klawiatury (Enter do wysłania, Shift+Enter dla nowej linii).
 * 
 * @see chat-view-implementation-plan.md section 4.2
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRateLimit } from '@/lib/hooks/useRateLimit';
import { useActiveQueries } from '@/lib/hooks/useActiveQueries';
import { apiPost } from '@/lib/apiClient';
import type { QuerySubmitRequest, QuerySubmitResponse, ExampleQuestion } from '@/lib/types';
import { ApiError } from '@/lib/types';

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;
const MAX_VISIBLE_LINES = 5;

interface ChatInputProps {
  onSubmit: (queryText: string) => Promise<string>; // Zwraca query_id
  disabled?: boolean;
  exampleQuestions?: ExampleQuestion[];
}

export function ChatInput({ onSubmit, disabled: externalDisabled, exampleQuestions }: ChatInputProps) {
  const [queryText, setQueryText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { used: rateLimitUsed, limit: rateLimitLimit, canSubmit: canSubmitRateLimit } = useRateLimit();
  const { activeCount, canAddQuery } = useActiveQueries();
  
  const characterCount = queryText.length;
  const isValid = characterCount >= MIN_LENGTH && characterCount <= MAX_LENGTH;
  const canSubmit = isValid && canSubmitRateLimit && canAddQuery && !isSubmitting && !externalDisabled;

  // Auto-focus na textarea po załadowaniu
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Auto-resize textarea (max 5 linii widocznych)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scroll height
    textarea.style.height = 'auto';
    
    // Calculate new height
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10);
    const maxHeight = lineHeight * MAX_VISIBLE_LINES;
    const scrollHeight = textarea.scrollHeight;
    
    // Set height (max 5 lines, then scroll)
    if (scrollHeight <= maxHeight) {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    }
  }, [queryText]);

  // Nasłuchiwanie na kliknięcia przykładowych pytań
  useEffect(() => {
    const handleExampleQuestionClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('[data-example-question="true"]');
      
      if (button) {
        const question = button.getAttribute('data-question');
        if (question) {
          setQueryText(question);
          setError(null);
          // Focus textarea after setting question
          setTimeout(() => {
            textareaRef.current?.focus();
            // Move cursor to end
            if (textareaRef.current) {
              const length = textareaRef.current.value.length;
              textareaRef.current.setSelectionRange(length, length);
            }
          }, 0);
        }
      }
    };

    document.addEventListener('click', handleExampleQuestionClick);
    return () => {
      document.removeEventListener('click', handleExampleQuestionClick);
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setQueryText(value);
    setError(null); // Clear error on change
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter: submit (if valid)
    // Shift+Enter: new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  }, [canSubmit]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const request: QuerySubmitRequest = {
        query_text: queryText.trim(),
      };

      const response = await apiPost<QuerySubmitResponse>(
        '/api/v1/queries',
        request,
        true // includeRateLimit
      );

      // Handle response (with or without rate limit wrapper)
      let queryId: string;
      if (typeof response === 'object' && 'data' in response) {
        // Response wrapped with rate limit info
        queryId = response.data.query_id;
        // TODO: Update AppContext with rateLimit info
      } else {
        // Direct response (fallback)
        queryId = (response as QuerySubmitResponse).query_id;
      }

      // Emit event for ChatMessagesContainer
      window.dispatchEvent(new CustomEvent('query-submit', { detail: queryId }));
      
      // Call onSubmit callback
      await onSubmit(queryText.trim());
      setQueryText('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'VALIDATION_ERROR') {
          setError('Pytanie musi zawierać od 10 do 1000 znaków.');
        } else if (err.errorCode === 'RATE_LIMIT_EXCEEDED') {
          setError('Przekroczono limit zapytań. Spróbuj ponownie za chwilę.');
        } else {
          setError(err.message || 'Wystąpił błąd podczas wysyłania zapytania.');
        }
      } else {
        setError('Wystąpił błąd podczas wysyłania zapytania.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [queryText, canSubmit, onSubmit]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 bg-background border-t">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={queryText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Zadaj pytanie dotyczące polskiego prawa (min. 10, max. 1000 znaków)..."
            disabled={externalDisabled || isSubmitting}
            className="resize-none pr-24"
            rows={1}
            aria-label="Pole wprowadzania pytania"
            aria-describedby="character-count rate-limit-info"
          />
          
          {/* Character count badge (top-right corner) */}
          <div className="absolute bottom-2 right-2">
            <Badge
              variant={isValid ? 'secondary' : 'destructive'}
              className="text-xs"
              id="character-count"
            >
              {characterCount}/{MAX_LENGTH}
            </Badge>
          </div>
        </div>

        {/* Info bar: Rate limit + Active queries + Error */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-sm">
            {/* Rate limit indicator */}
            <div
              id="rate-limit-info"
              className={cn(
                'flex items-center gap-2',
                rateLimitUsed >= rateLimitLimit && 'text-destructive'
              )}
            >
              <span className="text-muted-foreground">Limit zapytań:</span>
              <Badge
                variant={rateLimitUsed >= rateLimitLimit ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {rateLimitUsed}/{rateLimitLimit}
              </Badge>
            </div>

            {/* Active queries indicator */}
            {activeCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>Aktywne zapytania:</span>
                <Badge variant="outline" className="text-xs">
                  {activeCount}/3
                </Badge>
              </div>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!canSubmit}
            aria-label="Wyślij pytanie"
          >
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij'}
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3"
          >
            {error}
          </div>
        )}

        {/* Validation hints */}
        {!error && characterCount > 0 && (
          <div className="text-xs text-muted-foreground">
            {characterCount < MIN_LENGTH && (
              <span>Wprowadź jeszcze {MIN_LENGTH - characterCount} znaków.</span>
            )}
            {characterCount > MAX_LENGTH && (
              <span className="text-destructive">
                Przekroczono limit o {characterCount - MAX_LENGTH} znaków.
              </span>
            )}
            {!canAddQuery && (
              <span className="text-destructive">
                Osiągnięto limit 3 równoczesnych zapytań. Poczekaj na zakończenie jednego z nich.
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

