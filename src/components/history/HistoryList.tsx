/**
 * HistoryList.tsx
 * 
 * Główny kontener zarządzający listą zapytań użytkownika.
 * Odpowiedzialny za pobieranie danych z API, zarządzanie paginacją typu "Załaduj więcej",
 * zachowanie scroll position, wyświetlanie empty state oraz obsługę stanów ładowania i błędów.
 * 
 * @see history-view-implementation-plan.md section 4.1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryList } from '@/lib/hooks/useQueryList';
import { useScrollPosition } from '@/lib/hooks/useScrollPosition';
import { QueryCard } from './QueryCard';
import { LoadMoreButton } from './LoadMoreButton';
import { EmptyState } from './EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/types';
import type { QueryListItem, PaginationMetadata } from '@/lib/types';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface HistoryListProps {
  initialQueries?: QueryListItem[];
  initialPagination?: PaginationMetadata;
}

export function HistoryList({
  initialQueries,
  initialPagination,
}: HistoryListProps) {
  const [queries, setQueries] = useState<QueryListItem[]>(initialQueries || []);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(
    initialPagination || null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const { save, restore, scrollToElement } = useScrollPosition();

  const perPage = 20;
  const order = 'desc' as const;

  // Fetch queries for current page
  const {
    data: queryData,
    isLoading: isLoadingQueries,
    error: queryError,
    refetch: refetchQueries,
  } = useQueryList({
    page: currentPage,
    per_page: perPage,
    order,
  });

  // Update state when data loads
  useEffect(() => {
    if (queryData) {
      if (currentPage === 1) {
        // Initial load: replace queries
        setQueries(queryData.queries);
        setPagination(queryData.pagination);
      } else {
        // Load more: append queries
        // Save scroll position before adding new items
        save();

        setQueries((prev) => [...prev, ...queryData.queries]);
        setPagination(queryData.pagination);

        // Restore scroll position after a short delay
        setTimeout(() => {
          if (scrollAnchorRef.current) {
            scrollToElement(scrollAnchorRef.current);
          } else {
            restore();
          }
        }, 100);
      }
      setError(null);
    }
  }, [queryData, currentPage, save, restore, scrollToElement]);

  // Handle errors
  useEffect(() => {
    if (queryError) {
      setError(queryError);
    }
  }, [queryError]);

  // Handle loading more
  useEffect(() => {
    setIsLoadingMore(isLoadingQueries && currentPage > 1);
  }, [isLoadingQueries, currentPage]);

  const handleLoadMore = useCallback(async () => {
    if (!pagination || currentPage >= pagination.total_pages) {
      return;
    }

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
  }, [pagination, currentPage]);

  const handleQueryDelete = useCallback(
    async (queryId: string) => {
      // Optimistic update: remove query from list
      setQueries((prev) => prev.filter((q) => q.query_id !== queryId));

      // Update pagination if needed
      if (pagination) {
        setPagination({
          ...pagination,
          total_count: Math.max(0, pagination.total_count - 1),
        });
      }
    },
    [pagination]
  );

  const handleRatingChange = useCallback(
    (queryId: string, responseType: 'fast' | 'accurate', rating: any) => {
      // Update rating in query list
      setQueries((prev) =>
        prev.map((q) => {
          if (q.query_id !== queryId) {
            return q;
          }

          const updated = { ...q };

          if (responseType === 'fast') {
            updated.fast_response = {
              ...updated.fast_response,
              rating: { value: rating.value },
            };
          } else if (responseType === 'accurate' && updated.accurate_response) {
            updated.accurate_response = {
              ...updated.accurate_response,
              rating: { value: rating.value },
            };
          }

          return updated;
        })
      );
    },
    []
  );

  const handleRetry = useCallback(() => {
    setError(null);
    refetchQueries();
  }, [refetchQueries]);

  const isLoading = isLoadingQueries && queries.length === 0;
  const isEmpty = !isLoading && queries.length === 0 && !error;
  const hasMore = pagination
    ? pagination.page < pagination.total_pages
    : false;
  const remaining = pagination
    ? Math.max(0, pagination.total_count - queries.length)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Ładowanie historii">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Błąd ładowania historii</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {error.errorCode === 'UNAUTHORIZED'
              ? 'Sesja wygasła. Zaloguj się ponownie.'
              : error.errorCode === 'SERVICE_UNAVAILABLE'
              ? 'Serwis jest tymczasowo niedostępny. Sprawdź połączenie internetowe.'
              : 'Nie udało się załadować historii zapytań.'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Spróbuj ponownie
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isEmpty) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div
        role="list"
        aria-label="Lista zapytań"
        className="space-y-4"
      >
        {queries.map((query) => (
          <QueryCard
            key={query.query_id}
            query={query}
            onDelete={handleQueryDelete}
            onRatingChange={handleRatingChange}
          />
        ))}
      </div>

      {/* Scroll anchor for maintaining position */}
      <div ref={scrollAnchorRef} />

      {hasMore && (
        <LoadMoreButton
          remaining={remaining}
          isLoading={isLoadingMore}
          onLoadMore={handleLoadMore}
        />
      )}
    </div>
  );
}

