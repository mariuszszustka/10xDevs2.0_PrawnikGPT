/**
 * NoRelevantActsCard.tsx
 * 
 * React island wyświetlający komunikat błędu dla zapytań o akty spoza bazy (NoRelevantActsError).
 * 
 * @see chat-view-implementation-plan.md section 4.9
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface NoRelevantActsCardProps {
  queryText: string;
  onRetry?: () => void;
}

export function NoRelevantActsCard({ queryText, onRetry }: NoRelevantActsCardProps) {
  return (
    <Card
      role="alert"
      className="border-destructive/20 bg-destructive/5"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Akt prawny nie został znaleziony
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu.
          Aktualnie dysponuję informacjami o <strong>20 000 najnowszych ustaw</strong>.
        </p>
        
        {queryText && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Twoje pytanie:</p>
            <p className="text-sm font-medium">{queryText}</p>
          </div>
        )}

        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="w-full sm:w-auto"
          >
            Spróbuj ponownie
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

