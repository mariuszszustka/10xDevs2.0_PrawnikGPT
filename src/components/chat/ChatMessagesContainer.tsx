/**
 * ChatMessagesContainer.tsx
 * 
 * Główny kontener zarządzający listą wiadomości czatu.
 * Odpowiedzialny za wyświetlanie par query/response, zarządzanie pollingiem
 * dla szybkich odpowiedzi, auto-scroll do najnowszej wiadomości oraz
 * obsługę stanów ładowania i błędów.
 * 
 * @see chat-view-implementation-plan.md section 4.1
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { QueryBubble } from './QueryBubble';
import { ResponseCard } from './ResponseCard';
import { NoRelevantActsCard } from './NoRelevantActsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryPolling } from '@/lib/hooks/useQueryPolling';
import { useActiveQueries } from '@/lib/hooks/useActiveQueries';
import type { QueryDetailResponse, ResponseType, RatingValue } from '@/lib/types';
import { ApiError } from '@/lib/types';

interface ChatMessagesContainerProps {
  initialQueries?: QueryDetailResponse[];
  onQuerySubmit?: (queryId: string) => void;
}

export function ChatMessagesContainer({
  initialQueries = [],
  onQuerySubmit,
}: ChatMessagesContainerProps) {
  const [queries, setQueries] = useState<QueryDetailResponse[]>(initialQueries);
  const [activeQueryIds, setActiveQueryIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { addQuery, removeQuery } = useActiveQueries();

  // Auto-scroll do najnowszej wiadomości
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [queries, scrollToBottom]);

  // Obsługa nowych zapytań (optimistic UI)
  useEffect(() => {
    const handleQuerySubmit = (event: CustomEvent<string>) => {
      const queryId = event.detail;
      
      // Add to active queries
      if (addQuery(queryId)) {
        setActiveQueryIds((prev) => new Set([...prev, queryId]));
        onQuerySubmit?.(queryId);
      }
    };

    window.addEventListener('query-submit', handleQuerySubmit as EventListener);
    return () => {
      window.removeEventListener('query-submit', handleQuerySubmit as EventListener);
    };
  }, [addQuery, onQuerySubmit]);

  // Polling dla aktywnych zapytań
  const activeQueriesArray = Array.from(activeQueryIds);
  
  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-label="Historia czatu"
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
    >
      {queries.length === 0 && activeQueriesArray.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p>Zadaj pytanie, aby rozpocząć rozmowę.</p>
        </div>
      )}

      {queries.map((query) => (
        <QueryResponsePair
          key={query.query_id}
          query={query}
          onUpdate={(updatedQuery) => {
            setQueries((prev) =>
              prev.map((q) => (q.query_id === updatedQuery.query_id ? updatedQuery : q))
            );
          }}
          onComplete={(queryId) => {
            setActiveQueryIds((prev) => {
              const next = new Set(prev);
              next.delete(queryId);
              return next;
            });
            removeQuery(queryId);
          }}
          onError={(queryId, error) => {
            setActiveQueryIds((prev) => {
              const next = new Set(prev);
              next.delete(queryId);
              return next;
            });
            removeQuery(queryId);
            // Error handling will be done in QueryResponsePair
          }}
        />
      ))}

      {/* Active queries (polling) */}
      {activeQueriesArray.map((queryId) => (
        <ActiveQueryPolling
          key={queryId}
          queryId={queryId}
          onComplete={(query) => {
            setQueries((prev) => [...prev, query]);
            setActiveQueryIds((prev) => {
              const next = new Set(prev);
              next.delete(queryId);
              return next;
            });
            removeQuery(queryId);
          }}
          onError={(queryId, error) => {
            setActiveQueryIds((prev) => {
              const next = new Set(prev);
              next.delete(queryId);
              return next;
            });
            removeQuery(queryId);
            // TODO: Show error message
          }}
        />
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * QueryResponsePair - Wyświetla parę query/response
 */
interface QueryResponsePairProps {
  query: QueryDetailResponse;
  onUpdate: (query: QueryDetailResponse) => void;
  onComplete: (queryId: string) => void;
  onError: (queryId: string, error: ApiError) => void;
}

function QueryResponsePair({
  query,
  onUpdate,
  onComplete,
  onError,
}: QueryResponsePairProps) {
  const handleRatingClick = async (responseType: ResponseType, ratingValue: RatingValue) => {
    // Rating will be handled by RatingButtons component
  };

  const handleDetailedAnswerClick = async () => {
    // Detailed answer will be handled by ResponseCard component
  };

  // Check for NoRelevantActsError
  const hasNoRelevantActsError = 
    query.fast_response.status === 'failed' &&
    query.status === 'failed';

  return (
    <div className="space-y-4">
      <QueryBubble queryText={query.query_text} createdAt={query.created_at} />
      
      {/* NoRelevantActsCard for errors */}
      {hasNoRelevantActsError && (
        <div className="flex justify-start">
          <div className="max-w-[80%] md:max-w-[70%]">
            <NoRelevantActsCard queryText={query.query_text} />
          </div>
        </div>
      )}

      {/* ResponseCard for completed responses */}
      {query.fast_response.status === 'completed' && query.fast_response.content && (
        <ResponseCard
          query={query}
          responseType="fast"
          onRatingClick={handleRatingClick}
          onDetailedAnswerClick={handleDetailedAnswerClick}
        />
      )}

      {/* Accurate response if exists */}
      {query.accurate_response && 
       query.accurate_response.status === 'completed' && 
       query.accurate_response.content && (
        <ResponseCard
          query={query}
          responseType="accurate"
          onRatingClick={handleRatingClick}
        />
      )}
    </div>
  );
}

/**
 * ActiveQueryPolling - Polling dla aktywnych zapytań
 */
interface ActiveQueryPollingProps {
  queryId: string;
  onComplete: (query: QueryDetailResponse) => void;
  onError: (queryId: string, error: ApiError) => void;
}

function ActiveQueryPolling({ queryId, onComplete, onError }: ActiveQueryPollingProps) {
  const { query, isPolling, error } = useQueryPolling(queryId);

  useEffect(() => {
    if (query && (query.fast_response.status === 'completed' || query.fast_response.status === 'failed')) {
      onComplete(query);
    }
  }, [query, onComplete]);

  useEffect(() => {
    if (error) {
      onError(queryId, error);
    }
  }, [error, queryId, onError]);

  if (error) {
    // Check for NoRelevantActsError
    const hasNoRelevantActsError = error.errorCode === 'NO_RELEVANT_ACTS';
    
    if (hasNoRelevantActsError && query) {
      return (
        <div className="space-y-4">
          <QueryBubble queryText={query.query_text} createdAt={query.created_at} />
          <div className="flex justify-start">
            <div className="max-w-[80%] md:max-w-[70%]">
              <NoRelevantActsCard queryText={query.query_text} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {query && (
          <QueryBubble queryText={query.query_text} createdAt={query.created_at} />
        )}
        <div className="flex justify-start">
          <div className="max-w-[80%] md:max-w-[70%]">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">
                {error.errorCode === 'GENERATION_TIMEOUT'
                  ? 'Przekroczono czas oczekiwania na odpowiedź. Spróbuj ponownie.'
                  : 'Wystąpił błąd podczas generowania odpowiedzi.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isPolling) {
    return (
      <div className="space-y-4">
        {query && (
          <QueryBubble queryText={query.query_text} createdAt={query.created_at} />
        )}
        <div className="flex justify-start">
          <div className="max-w-[80%] md:max-w-[70%]">
            <div className="bg-card border rounded-lg p-4 shadow-sm">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

