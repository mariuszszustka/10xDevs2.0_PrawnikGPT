/**
 * QueryBubble.tsx
 * 
 * Komponent wyświetlający pytanie użytkownika (right-aligned bubble).
 * Używany w ChatMessagesContainer.
 */

import { cn } from '@/lib/utils';

interface QueryBubbleProps {
  queryText: string;
  createdAt: string;
}

export function QueryBubble({ queryText, createdAt }: QueryBubbleProps) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[80%] md:max-w-[70%]">
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3 shadow-sm">
          <p className="text-sm whitespace-pre-wrap break-words">{queryText}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">
          {new Date(createdAt).toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

