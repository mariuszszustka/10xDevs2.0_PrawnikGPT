/**
 * ResponseCard.tsx
 * 
 * Karta wyświetlająca pojedynczą odpowiedź (szybką lub dokładną) z renderowaniem Markdown,
 * listą źródeł, przyciskami oceny, przyciskiem "Uzyskaj dokładniejszą odpowiedź"
 * oraz wskaźnikiem czasu generowania.
 * 
 * @see chat-view-implementation-plan.md section 4.3
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from './MarkdownContent';
import { RatingButtons } from './RatingButtons';
import { DetailedAnswerModal } from './DetailedAnswerModal';
import { useRAGContextTimer } from '@/lib/hooks/useRAGContextTimer';
import { cn } from '@/lib/utils';
import type { QueryDetailResponse, ResponseType, RatingValue } from '@/lib/types';
import { Clock, AlertCircle } from 'lucide-react';

interface ResponseCardProps {
  query: QueryDetailResponse;
  responseType: 'fast' | 'accurate';
  onRatingClick?: (responseType: ResponseType, ratingValue: RatingValue) => Promise<void>;
  onDetailedAnswerClick?: () => Promise<void>;
}

export function ResponseCard({
  query,
  responseType,
  onRatingClick,
  onDetailedAnswerClick,
}: ResponseCardProps) {
  const [isDetailedModalOpen, setIsDetailedModalOpen] = useState(false);
  
  const response = responseType === 'fast' ? query.fast_response : query.accurate_response;
  const { secondsRemaining, isExpiring, isExpired } = useRAGContextTimer(query.created_at);

  // Walidacja: sprawdzenie czy odpowiedź jest kompletna
  const isCompleted = response?.status === 'completed';
  const hasContent = isCompleted && response?.content;
  const hasAccurateResponse = query.accurate_response !== null && 
    query.accurate_response.status === 'completed';

  if (!response || !hasContent) {
    return null;
  }

  const formatGenerationTime = (ms?: number): string => {
    if (!ms) return 'N/A';
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}s`;
  };

  const handleRatingClick = async (ratingValue: RatingValue) => {
    if (onRatingClick) {
      await onRatingClick(responseType, ratingValue);
    }
  };

  return (
    <article className="flex justify-start mb-4">
      <div className="max-w-[80%] md:max-w-[70%]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {responseType === 'fast' ? 'Szybka odpowiedź' : 'Dokładna odpowiedź'}
                </Badge>
                {response.model_name && (
                  <Badge variant="outline" className="text-xs">
                    {response.model_name}
                  </Badge>
                )}
                {response.generation_time_ms && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatGenerationTime(response.generation_time_ms)}
                  </Badge>
                )}
              </div>

              {/* RAG Context Timer */}
              {!isExpired && (
                <Badge
                  variant={isExpiring ? 'destructive' : 'secondary'}
                  className="text-xs flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3" />
                  Cache: {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
                </Badge>
              )}
              {isExpired && (
                <Badge variant="destructive" className="text-xs">
                  Cache wygasł
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Markdown Content */}
            <MarkdownContent content={response.content!} className="text-sm" />

            {/* Sources List - będzie renderowany przez Astro component w przyszłości */}
            {response.sources && response.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Źródła</h4>
                <ul className="space-y-1 text-sm">
                  {response.sources.map((source, index) => (
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
              <div className="flex items-center justify-between pt-4 border-t">
                <RatingButtons
                  queryId={query.query_id}
                  responseType={responseType}
                  currentRating={response.rating}
                  onRatingChange={(rating) => {
                    // Rating updated
                  }}
                />

                {/* Detailed Answer Button (tylko dla szybkiej odpowiedzi) */}
                {responseType === 'fast' && !hasAccurateResponse && !isExpired && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailedModalOpen(true);
                      onDetailedAnswerClick?.();
                    }}
                  >
                    Uzyskaj dokładniejszą odpowiedź
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Answer Modal */}
        {responseType === 'fast' && (
          <DetailedAnswerModal
            queryId={query.query_id}
            isOpen={isDetailedModalOpen}
            onClose={() => setIsDetailedModalOpen(false)}
            onRatingClick={handleRatingClick}
          />
        )}
      </div>
    </article>
  );
}

