/**
 * DetailedAnswerModal.tsx
 * 
 * Modal wyświetlający dokładną odpowiedź z długim pollingiem (co 5s, timeout 240s),
 * progress barem podczas generowania oraz możliwością zamknięcia.
 * 
 * @see chat-view-implementation-plan.md section 4.5
 */

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from './MarkdownContent';
import { RatingButtons } from './RatingButtons';
import { useLongPolling } from '@/lib/hooks/useLongPolling';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { apiPost } from '@/lib/apiClient';
import type { AccurateResponseSubmitResponse, RatingValue } from '@/lib/types';
import { ApiError } from '@/lib/types';
import { X, AlertCircle } from 'lucide-react';

interface DetailedAnswerModalProps {
  queryId: string;
  isOpen: boolean;
  onClose: () => void;
  onRatingClick?: (ratingValue: RatingValue) => Promise<void>;
}

export function DetailedAnswerModal({
  queryId,
  isOpen,
  onClose,
  onRatingClick,
}: DetailedAnswerModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { accurateResponse, isPolling, timeoutReached, error } = useLongPolling(
    isOpen && queryId ? queryId : '',
    240000 // 240 seconds
  );

  // Focus trap
  useFocusTrap(isOpen, containerRef);

  // Request accurate response when modal opens
  useEffect(() => {
    if (isOpen && queryId && !accurateResponse && !isRequesting && !isPolling) {
      requestAccurateResponse();
    }
  }, [isOpen, queryId]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const requestAccurateResponse = async () => {
    setIsRequesting(true);
    setRequestError(null);

    try {
      await apiPost<AccurateResponseSubmitResponse>(
        `/api/v1/queries/${queryId}/accurate-response`,
        {}
      );
      // Polling will start automatically via useLongPolling
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errorCode === 'CONFLICT') {
          // Accurate response already exists - polling will fetch it
          setRequestError(null);
        } else {
          setRequestError(err.message || 'Nie udało się wygenerować dokładnej odpowiedzi.');
        }
      } else {
        setRequestError('Wystąpił błąd podczas żądania dokładnej odpowiedzi.');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const isCompleted = accurateResponse?.status === 'completed';
  const hasContent = isCompleted && accurateResponse?.content;
  const isFailed = accurateResponse?.status === 'failed' || error || timeoutReached;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={containerRef}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <DialogHeader>
          <DialogTitle id="modal-title">Dokładna odpowiedź</DialogTitle>
          <DialogDescription>
            Odpowiedź generowana przez większy model (120B) - może potrwać do 4 minut.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar - podczas generowania */}
          {(isPolling || isRequesting) && !isCompleted && (
            <div className="space-y-2">
              <Progress />
              <p className="text-sm text-muted-foreground text-center">
                Generowanie odpowiedzi... To może potrwać do 4 minut.
              </p>
            </div>
          )}

          {/* Error States */}
          {requestError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{requestError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={requestAccurateResponse}
                className="mt-2"
              >
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {isFailed && !requestError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  {timeoutReached
                    ? 'Przekroczono czas oczekiwania (4 minuty).'
                    : 'Nie udało się wygenerować dokładnej odpowiedzi.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={requestAccurateResponse}
              >
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {/* Completed Response */}
          {hasContent && (
            <div className="space-y-4">
              <MarkdownContent content={accurateResponse.content!} />

              {/* Sources */}
              {accurateResponse.sources && accurateResponse.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2">Źródła</h4>
                  <ul className="space-y-1 text-sm">
                    {accurateResponse.sources.map((source, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <a
                          href={source.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-words"
                        >
                          <span className="font-medium">{source.act_title}</span>
                          {source.article && (
                            <span className="text-muted-foreground"> - {source.article}</span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rating Buttons */}
              {isCompleted && (
                <div className="flex items-center justify-start pt-4 border-t">
                  <RatingButtons
                    queryId={queryId}
                    responseType="accurate"
                    currentRating={accurateResponse.rating}
                    onRatingChange={(rating) => {
                      // Rating updated
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

