/**
 * RulePreview Component - Podgląd artykułu/przepisu prawnego
 *
 * STRUKTURA KOMPONENTU (ASCII):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *                          ┌─────────────────────────┐
 *                          │   RulePreview.tsx       │
 *                          │   (Main Component)      │
 *                          └───────────┬─────────────┘
 *                                      │
 *                    ┌─────────────────┼─────────────────┐
 *                    │                 │                 │
 *                    ▼                 ▼                 ▼
 *          ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
 *          │ Card (Shadcn)   │ │   Badge     │ │  MarkdownContent│
 *          │  - CardHeader   │ │  (Shadcn)   │ │   (Custom)      │
 *          │  - CardContent  │ └─────────────┘ └─────────────────┘
 *          │  - CardFooter   │
 *          └─────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PRZEPŁYW DANYCH (DATA FLOW):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Parent Component
 *          │
 *          │ props: { rule, onExpand?, className? }
 *          ├──────────────────────────────────────┐
 *          ▼                                      │
 *   ┌──────────────┐                             │
 *   │ RulePreview  │                             │
 *   │              │                             │
 *   │  State:      │                             │
 *   │  - expanded  │◄────────────────────────────┘
 *   │  - loading   │      (internal state)
 *   └──────┬───────┘
 *          │
 *          │ Renders
 *          ├────────────────────────┬──────────────────────┐
 *          ▼                        ▼                      ▼
 *   ┌──────────┐            ┌─────────────┐        ┌──────────────┐
 *   │  Header  │            │   Content   │        │    Footer    │
 *   │  (title, │            │ (article    │        │  (actions,   │
 *   │   badge) │            │   text)     │        │   metadata)  │
 *   └──────────┘            └─────────────┘        └──────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ZALEŻNOŚCI (DEPENDENCIES):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   RulePreview.tsx
 *          │
 *          ├──► react (useState, useCallback)
 *          │
 *          ├──► @/components/ui/card
 *          │         └──► Card, CardHeader, CardTitle, CardDescription,
 *          │               CardContent, CardFooter
 *          │
 *          ├──► @/components/ui/badge
 *          │         └──► Badge
 *          │
 *          ├──► @/components/ui/button
 *          │         └──► Button
 *          │
 *          ├──► @/components/chat/MarkdownContent
 *          │         └──► MarkdownContent (renderowanie Markdown)
 *          │
 *          ├──► lucide-react
 *          │         └──► ChevronDown, ChevronUp, ExternalLink
 *          │
 *          └──► @/lib/utils
 *                    └──► cn (className utility)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ARCHITEKTURA WZORCÓW (PATTERNS):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Pattern: Controlled/Uncontrolled Component Hybrid
 *   ─────────────────────────────────────────────────
 *   │
 *   ├─ Controlled (gdy onExpand przekazane):
 *   │    Parent kontroluje stan expanded
 *   │    RulePreview.tsx jest "prezentacyjny"
 *   │
 *   └─ Uncontrolled (gdy onExpand brak):
 *        RulePreview.tsx zarządza własnym stanem
 *        Wewnętrzne useState dla expanded
 *
 *   Pattern: Composition over Inheritance
 *   ──────────────────────────────────────
 *   │
 *   └─ Używa Shadcn/ui Card jako kompozycji
 *      zamiast dziedziczenia bazowej klasy
 *
 *   Pattern: Single Responsibility
 *   ───────────────────────────────
 *   │
 *   ├─ RulePreview: Wyświetlanie podglądu
 *   ├─ MarkdownContent: Renderowanie treści
 *   └─ Badge: Wizualizacja statusu
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * UŻYCIE (USAGE):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   // Przykład 1: Uncontrolled (zarządza własnym stanem)
 *   <RulePreview
 *     rule={{
 *       id: "act-123",
 *       title: "Art. 5 Kodeksu cywilnego",
 *       content: "Nie można czynić ze swego prawa użytku...",
 *       publisher: "Dz.U.",
 *       year: 1964,
 *       position: 16,
 *       status: "obowiązujący"
 *     }}
 *   />
 *
 *   // Przykład 2: Controlled (parent kontroluje stan)
 *   const [expandedId, setExpandedId] = useState<string | null>(null);
 *
 *   <RulePreview
 *     rule={rule}
 *     expanded={expandedId === rule.id}
 *     onExpand={(id) => setExpandedId(id === expandedId ? null : id)}
 *   />
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TYPY I INTERFEJSY (TYPES & INTERFACES)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Status aktu prawnego
 */
type RuleStatus = 'obowiązujący' | 'uchylony' | 'nieobowiązujący';

/**
 * Interfejs reprezentujący akt prawny / artykuł
 */
interface LegalRule {
  id: string;
  title: string;           // Tytuł (np. "Art. 5 Kodeksu cywilnego")
  content: string;         // Treść artykułu (może zawierać Markdown)
  publisher: string;       // Wydawca (np. "Dz.U.")
  year: number;            // Rok
  position: number;        // Pozycja
  status: RuleStatus;      // Status obowiązywania
  isapUrl?: string;        // URL do ISAP (opcjonalnie)
}

/**
 * Props komponentu RulePreview
 */
interface RulePreviewProps {
  rule: LegalRule;
  expanded?: boolean;                              // Kontrolowany stan rozwinięcia
  onExpand?: (ruleId: string) => void;            // Callback przy rozwinięciu
  className?: string;                              // Dodatkowe klasy CSS
  showMetadata?: boolean;                          // Czy pokazywać metadane
  maxContentLength?: number;                       // Maksymalna długość treści (collapsed)
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KOMPONENT GŁÓWNY (MAIN COMPONENT)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export function RulePreview({
  rule,
  expanded: controlledExpanded,
  onExpand,
  className,
  showMetadata = true,
  maxContentLength = 200,
}: RulePreviewProps) {
  // Stan wewnętrzny (uncontrolled mode)
  const [internalExpanded, setInternalExpanded] = useState(false);

  // Użyj kontrolowanego stanu jeśli dostępny, w przeciwnym razie wewnętrzny
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  /**
   * Handler rozwinięcia/zwinięcia
   */
  const handleToggleExpand = useCallback(() => {
    if (onExpand) {
      // Controlled mode - wywołaj callback
      onExpand(rule.id);
    } else {
      // Uncontrolled mode - zaktualizuj stan wewnętrzny
      setInternalExpanded((prev) => !prev);
    }
  }, [onExpand, rule.id]);

  /**
   * Skrócenie treści jeśli nierozwinięte
   */
  const displayContent = isExpanded
    ? rule.content
    : rule.content.length > maxContentLength
      ? `${rule.content.substring(0, maxContentLength)}...`
      : rule.content;

  /**
   * Kolor badge'a w zależności od statusu
   */
  const getStatusVariant = (status: RuleStatus): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'obowiązujący':
        return 'default';
      case 'uchylony':
        return 'destructive';
      case 'nieobowiązujący':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  /**
   * ═════════════════════════════════════════════════════════════════════════════
   * RENDER
   * ═════════════════════════════════════════════════════════════════════════════
   */
  return (
    <Card className={cn('transition-all hover:shadow-md', className)} data-testid="rule-preview">
      {/* HEADER */}
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{rule.title}</CardTitle>
            {showMetadata && (
              <CardDescription className="mt-1">
                {rule.publisher} {rule.year} nr {rule.position}
              </CardDescription>
            )}
          </div>
          <Badge variant={getStatusVariant(rule.status)} data-testid="rule-status-badge">
            {rule.status}
          </Badge>
        </div>
      </CardHeader>

      {/* CONTENT */}
      <CardContent>
        <MarkdownContent content={displayContent} className="prose-sm" />

        {rule.content.length > maxContentLength && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="mt-2 w-full"
            data-testid="rule-expand-button"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                Zwiń
              </>
            ) : (
              <>
                <ChevronDown className="mr-2 h-4 w-4" />
                Rozwiń pełną treść
              </>
            )}
          </Button>
        )}
      </CardContent>

      {/* FOOTER */}
      {rule.isapUrl && (
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full"
            data-testid="rule-isap-link"
          >
            <a href={rule.isapUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Zobacz w ISAP
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EKSPORT TYPÓW (TYPE EXPORTS)
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export type { LegalRule, RulePreviewProps, RuleStatus };
