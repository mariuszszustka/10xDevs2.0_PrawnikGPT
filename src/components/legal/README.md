# Legal Components

Komponenty do wyświetlania i zarządzania aktami prawnymi.

## Struktura katalogów

```
src/components/legal/
├── README.md                    # Ta dokumentacja
├── RulePreview.tsx              # Komponent podglądu artykułu/przepisu
└── RulePreview.test.tsx         # Testy jednostkowe
```

## RulePreview Component

### Diagram architektury (ASCII):

```
                          ┌─────────────────────────┐
                          │   RulePreview.tsx       │
                          │   (Main Component)      │
                          └───────────┬─────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
          ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
          │ Card (Shadcn)   │ │   Badge     │ │  MarkdownContent│
          │  - CardHeader   │ │  (Shadcn)   │ │   (Custom)      │
          │  - CardContent  │ └─────────────┘ └─────────────────┘
          │  - CardFooter   │
          └─────────────────┘
```

### Użycie

#### Tryb Uncontrolled (zarządza własnym stanem):

```tsx
import { RulePreview } from '@/components/legal/RulePreview';

export function MyComponent() {
  const rule = {
    id: 'act-123',
    title: 'Art. 5 Kodeksu cywilnego',
    content: 'Nie można czynić ze swego prawa użytku...',
    publisher: 'Dz.U.',
    year: 1964,
    position: 16,
    status: 'obowiązujący',
    isapUrl: 'https://isap.sejm.gov.pl/...',
  };

  return <RulePreview rule={rule} />;
}
```

#### Tryb Controlled (parent kontroluje stan):

```tsx
import { useState } from 'react';
import { RulePreview } from '@/components/legal/RulePreview';

export function RulesList() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <>
      {rules.map((rule) => (
        <RulePreview
          key={rule.id}
          rule={rule}
          expanded={expandedId === rule.id}
          onExpand={(id) => setExpandedId(id === expandedId ? null : id)}
        />
      ))}
    </>
  );
}
```

### Props

| Prop               | Type                       | Default | Description                                    |
| ------------------ | -------------------------- | ------- | ---------------------------------------------- |
| `rule`             | `LegalRule`                | -       | **Required**. Dane artykułu/przepisu           |
| `expanded`         | `boolean`                  | -       | Kontrolowany stan rozwinięcia                  |
| `onExpand`         | `(ruleId: string) => void` | -       | Callback przy kliknięciu expand/collapse       |
| `className`        | `string`                   | -       | Dodatkowe klasy CSS                            |
| `showMetadata`     | `boolean`                  | `true`  | Czy pokazywać metadane (wydawca, rok, pozycja) |
| `maxContentLength` | `number`                   | `200`   | Maksymalna długość treści w stanie zwiniętym   |

### LegalRule Interface

```typescript
interface LegalRule {
  id: string; // Unikalny identyfikator
  title: string; // Tytuł (np. "Art. 5 Kodeksu cywilnego")
  content: string; // Treść artykułu (może zawierać Markdown)
  publisher: string; // Wydawca (np. "Dz.U.")
  year: number; // Rok publikacji
  position: number; // Pozycja w dzienniku
  status: 'obowiązujący' | 'uchylony' | 'nieobowiązujący';
  isapUrl?: string; // URL do ISAP (opcjonalnie)
}
```

### Testowanie

#### Testy jednostkowe

```bash
# Uruchom testy dla RulePreview
npm run test -- RulePreview
```

#### Testy E2E (Playwright)

```bash
# Uruchom testy E2E
npm run test:e2e
```

### data-testid Attributes

Komponent używa następujących `data-testid` dla testów E2E:

- `rule-preview` - główny kontener komponentu
- `rule-status-badge` - badge ze statusem
- `rule-expand-button` - przycisk expand/collapse
- `rule-isap-link` - link do ISAP

### Accessibility

- ✅ Semantic HTML (Card, Button)
- ✅ Keyboard navigation (Tab, Enter)
- ✅ External link safety (`rel="noopener noreferrer"`)
- ✅ ARIA labels (via Shadcn/ui components)
- ✅ Color contrast WCAG AA compliant

### Performance

- Używa `useCallback` dla optymalizacji re-renders
- Minimalna liczba state updates
- Lazy rendering treści (tylko widoczna część w collapsed state)

## Przyszłe rozszerzenia

- [ ] Dodać highlighting dla wyszukiwanych fraz
- [ ] Dodać kopiowanie treści do schowka
- [ ] Dodać eksport do PDF
- [ ] Dodać historię zmian artykułu
- [ ] Dodać powiązane artykuły (relacje)
