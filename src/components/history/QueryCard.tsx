/**
 * QueryCard.tsx
 * 
 * Karta pojedynczego zapytania z collapsible responses.
 * Wyświetla pytanie użytkownika, timestamp, status badge, szybką odpowiedź
 * (domyślnie zwiniętą) oraz wskaźnik dokładnej odpowiedzi (jeśli istnieje).
 * 
 * @see history-view-implementation-plan.md section 4.2
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCollapsible } from '@/lib/hooks/useCollapsible';
import { useQueryDetails } from '@/lib/hooks/useQueryDetails';
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';
import { truncateText } from '@/lib/utils/truncateText';
import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { RatingButtons } from '@/components/chat/RatingButtons';
import { DeleteQueryButton } from './DeleteQueryButton';
import { cn } from '@/lib/utils';
import type {
  QueryListItem,
  ResponseType,
  RatingDetail,
  SourceReference,
} from '@/lib/types';
import { ChevronDown, ChevronUp, Clock, FlaskConical, AlertCircle } from 'lucide-react';

interface QueryCardProps {
  query: QueryListItem;
  onDelete?: (queryId: string) => Promise<void>;
  onRatingChange?: (
    queryId: string,
    responseType: ResponseType,
    rating: RatingDetail
  ) => void;
  onRefresh?: (queryId: string) => Promise<void>;
}

export function QueryCard({
  query,
  onDelete,
  onRatingChange,
  onRefresh,
}: QueryCardProps) {
  const [isQuestionExpanded, setIsQuestionExpanded] = useState(false);
  const fastResponseCollapsible = useCollapsible(false);
  const accurateResponseCollapsible = useCollapsible(false);

  // Fetch accurate response details when expanded
  const {
    data: queryDetails,
    isLoading: isLoadingAccurate,
    error: accurateError,
  } = useQueryDetails(
    accurateResponseCollapsible.isExpanded ? query.query_id : null,
    accurateResponseCollapsible.isExpanded
  );

  const relativeTime = formatRelativeTime(query.created_at);
  const questionText = truncateText(query.query_text, 100);
  const isQuestionTruncated = query.query_text.length > 100;

  // Fast response data
  const hasFastResponse = query.fast_response?.content;
  const fastResponseStatus = query.fast_response
    ? 'completed'
    : 'processing';

  // Accurate response data
  const hasAccurateResponse =
    query.accurate_response?.exists === true;

  const formatGenerationTime = (ms?: number): string => {
    if (!ms) return 'N/A';
    const seconds = ms / 1000;
    if (seconds < 1) {
      return '<1s';
    }
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleRatingChange = async (
    responseType: ResponseType,
    rating: RatingDetail
  ) => {
    if (onRatingChange) {
      await onRatingChange(query.query_id, responseType, rating);
    }
  };

  return (
    <article
      className="border rounded-lg shadow-sm"
      aria-label={`Zapytanie z ${relativeTime}`}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Question text */}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isQuestionExpanded ? (
                    <span className="whitespace-pre-wrap break-words">
                      {query.query_text}
                    </span>
                  ) : (
                    <>
                      {questionText}
                      {isQuestionTruncated && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1 text-primary"
                          onClick={() => setIsQuestionExpanded(true)}
                          aria-label="Rozwiń pytanie"
                        >
                          więcej
                        </Button>
                      )}
                    </>
                  )}
                </p>
              </div>

              {/* Timestamp and status */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {relativeTime}
                </span>
                <Badge
                  variant={
                    fastResponseStatus === 'completed'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="text-xs"
                >
                  {fastResponseStatus === 'completed'
                    ? 'Ukończone'
                    : 'Przetwarzanie...'}
                </Badge>
              </div>
            </div>

            {/* Delete button */}
            {onDelete && (
              <DeleteQueryButton
                queryId={query.query_id}
                queryText={query.query_text}
                onDelete={onDelete}
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Fast Response Section */}
          {hasFastResponse && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fastResponseCollapsible.toggle}
                    aria-expanded={fastResponseCollapsible.isExpanded}
                    aria-label={
                      fastResponseCollapsible.isExpanded
                        ? 'Zwiń szybką odpowiedź'
                        : 'Rozwiń szybką odpowiedź'
                    }
                    className="h-auto p-0"
                  >
                    <span className="text-sm font-semibold">
                      Szybka odpowiedź
                    </span>
                    {fastResponseCollapsible.isExpanded ? (
                      <ChevronUp className="h-4 w-4 ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </div>
                {query.fast_response.generation_time_ms && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatGenerationTime(query.fast_response.generation_time_ms)}
                  </Badge>
                )}
              </div>

              {/* Collapsible content */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  fastResponseCollapsible.isExpanded
                    ? 'max-h-[5000px] opacity-100'
                    : 'max-h-0 opacity-0'
                )}
              >
                <div className="space-y-4 pt-2">
                  {/* Markdown content */}
                  <MarkdownContent
                    content={query.fast_response.content}
                    className="text-sm"
                  />

                  {/* Sources list - simplified for MVP */}
                  {query.fast_response.sources_count > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        {query.fast_response.sources_count}{' '}
                        {query.fast_response.sources_count === 1
                          ? 'źródło'
                          : 'źródeł'}
                      </p>
                    </div>
                  )}

                  {/* Rating buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <RatingButtons
                      queryId={query.query_id}
                      responseType="fast"
                      currentRating={query.fast_response.rating}
                      onRatingChange={(rating) =>
                        handleRatingChange('fast', rating)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Accurate Response Indicator */}
          {hasAccurateResponse && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={accurateResponseCollapsible.toggle}
                  aria-expanded={accurateResponseCollapsible.isExpanded}
                  aria-label={
                    accurateResponseCollapsible.isExpanded
                      ? 'Zwiń dokładną odpowiedź'
                      : 'Rozwiń dokładną odpowiedź'
                  }
                  className="h-auto p-0"
                >
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      Dokładna odpowiedź
                    </span>
                    {accurateResponseCollapsible.isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </Button>
                {query.accurate_response?.generation_time_ms && (
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatGenerationTime(
                      query.accurate_response.generation_time_ms
                    )}
                  </Badge>
                )}
              </div>

              {/* Collapsible accurate response content */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  accurateResponseCollapsible.isExpanded
                    ? 'max-h-[5000px] opacity-100'
                    : 'max-h-0 opacity-0'
                )}
              >
                <div className="space-y-4 pt-2">
                  {isLoadingAccurate && (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  )}

                  {accurateError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Nie udało się załadować dokładnej odpowiedzi. Spróbuj
                        ponownie.
                      </AlertDescription>
                    </Alert>
                  )}

                  {queryDetails?.accurate_response?.content && (
                    <>
                      {/* Markdown content */}
                      <MarkdownContent
                        content={queryDetails.accurate_response.content}
                        className="text-sm"
                      />

                      {/* Sources list */}
                      {queryDetails.accurate_response.sources &&
                        queryDetails.accurate_response.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-semibold mb-2">
                              Źródła
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {queryDetails.accurate_response.sources.map(
                                (source, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-muted-foreground">•</span>
                                    <a
                                      href={source.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline break-words"
                                    >
                                      <span className="font-medium">
                                        {source.act_title}
                                      </span>
                                      {source.article && (
                                        <span className="text-muted-foreground">
                                          {' '}
                                          - {source.article}
                                        </span>
                                      )}
                                    </a>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                      {/* Rating buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <RatingButtons
                          queryId={query.query_id}
                          responseType="accurate"
                          currentRating={queryDetails.accurate_response.rating}
                          onRatingChange={(rating) =>
                            handleRatingChange('accurate', rating)
                          }
                        />
                      </div>
                    </>
                  )}

                  {!isLoadingAccurate &&
                    !accurateError &&
                    !queryDetails?.accurate_response?.content && (
                      <p className="text-sm text-muted-foreground">
                        Dokładna odpowiedź jest jeszcze przetwarzana.
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </article>
  );
}

