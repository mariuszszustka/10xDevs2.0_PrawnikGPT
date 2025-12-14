# RulePreview Component - Complete Structure

## KOMPLETNA STRUKTURA PROJEKTU (ASCII)

```
prawnik_v01/
│
├── src/components/legal/
│   │
│   ├── RulePreview.tsx                  ◄─── GŁÓWNY KOMPONENT
│   │   │
│   │   └── Struktura wewnętrzna:
│   │       │
│   │       ├─ Diagramy ASCII:
│   │       │   ├─ Hierarchia komponentów
│   │       │   ├─ Przepływ danych (Data Flow)
│   │       │   ├─ Zależności (Dependencies)
│   │       │   └─ Wzorce architektoniczne (Patterns)
│   │       │
│   │       ├─ TypeScript Interfaces:
│   │       │   ├─ LegalRule
│   │       │   ├─ RulePreviewProps
│   │       │   └─ RuleStatus
│   │       │
│   │       ├─ React Component:
│   │       │   ├─ useState (internal state)
│   │       │   ├─ useCallback (handlers)
│   │       │   └─ Controlled/Uncontrolled hybrid pattern
│   │       │
│   │       └─ Renderowanie:
│   │           ├─ Card (Shadcn/ui)
│   │           │   ├─ CardHeader (title, badge, metadata)
│   │           │   ├─ CardContent (markdown content, expand button)
│   │           │   └─ CardFooter (ISAP link)
│   │           │
│   │           ├─ Badge (status indicator)
│   │           ├─ Button (expand/collapse, ISAP link)
│   │           └─ MarkdownContent (content rendering)
│   │
│   ├── RulePreview.test.tsx             ◄─── TESTY JEDNOSTKOWE
│   │   │
│   │   └── Test Suites:
│   │       ├─ Rendering (5 tests)
│   │       ├─ Expand/Collapse Behavior (4 tests)
│   │       ├─ ISAP Link (2 tests)
│   │       ├─ Status Variants (2 tests)
│   │       ├─ Accessibility (2 tests)
│   │       └─ Snapshot Testing (1 test)
│   │
│   │       Total: 16 unit tests ✅
│   │
│   └── README.md                        ◄─── DOKUMENTACJA
│       │
│       └── Zawartość:
│           ├─ Diagram architektury (ASCII)
│           ├─ Przykłady użycia (Controlled/Uncontrolled)
│           ├─ Dokumentacja Props
│           ├─ Interface LegalRule
│           ├─ Instrukcje testowania
│           ├─ data-testid attributes
│           └─ Accessibility checklist
│
├── e2e/page-objects/
│   │
│   ├── RulePreviewPage.ts               ◄─── PAGE OBJECT (E2E)
│   │   │
│   │   └── Struktura:
│   │       │
│   │       ├─ extends BasePage
│   │       │
│   │       ├─ Locators:
│   │       │   ├─ rulePreview (container)
│   │       │   ├─ statusBadge
│   │       │   ├─ expandButton
│   │       │   └─ isapLink
│   │       │
│   │       ├─ Methods:
│   │       │   ├─ getRuleTitle()
│   │       │   ├─ getRuleContent()
│   │       │   ├─ getStatus()
│   │       │   ├─ getRuleMetadata()
│   │       │   ├─ isExpanded()
│   │       │   ├─ expandRule()
│   │       │   ├─ collapseRule()
│   │       │   ├─ toggleExpand()
│   │       │   ├─ clickIsapLink()
│   │       │   ├─ hasIsapLink()
│   │       │   ├─ getIsapUrl()
│   │       │   ├─ waitForLoad()
│   │       │   └─ screenshot()
│   │       │
│   │       └─ Helper Function:
│   │           └─ getRulePreviewList() - multiple instances
│   │
│   └── (other page objects...)
│
└── e2e/
    │
    └── rule-preview.spec.ts             ◄─── TESTY E2E
        │
        └── Test Suites:
            ├─ Rendering (4 tests)
            ├─ Expand/Collapse (4 tests)
            ├─ ISAP Integration (2 tests)
            ├─ Multiple Rules (2 tests)
            ├─ Visual Regression (2 tests)
            └─ Accessibility (2 tests)

            Total: 16 E2E tests ✅
```

---

## DIAGRAM ZALEŻNOŚCI KOMPONENTÓW (ASCII)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         RulePreview.tsx                                │
│                      (Main Component)                                  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Props:                                                       │    │
│  │  - rule: LegalRule                                           │    │
│  │  - expanded?: boolean                                        │    │
│  │  - onExpand?: (ruleId: string) => void                      │    │
│  │  - className?: string                                        │    │
│  │  - showMetadata?: boolean                                   │    │
│  │  - maxContentLength?: number                                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Internal State (Uncontrolled):                              │    │
│  │  - internalExpanded: boolean                                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Handlers:                                                    │    │
│  │  - handleToggleExpand() → useCallback                        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                        │
└────────────────┬───────────────────────────┬─────────────────────────┘
                 │                           │
     ┌───────────┴───────────┐   ┌───────────┴────────────┐
     │                       │   │                        │
     ▼                       ▼   ▼                        ▼
┌─────────┐           ┌──────────────┐            ┌──────────────┐
│  Card   │           │    Badge     │            │MarkdownContent│
│(Shadcn) │           │  (Shadcn)    │            │   (Custom)    │
└────┬────┘           └──────────────┘            └──────────────┘
     │
     ├─ CardHeader
     │    ├─ CardTitle (rule.title)
     │    ├─ CardDescription (metadata)
     │    └─ Badge (status)
     │
     ├─ CardContent
     │    ├─ MarkdownContent (displayContent)
     │    └─ Button (expand/collapse)
     │
     └─ CardFooter
          └─ Button (ISAP link)
```

---

## DIAGRAM PRZEPŁYWU DANYCH (DATA FLOW)

```
                    Parent Component
                           │
                           │ Pass props
                           ├────────────────────────────────────┐
                           │                                    │
                           ▼                                    │
                    ┌──────────────┐                            │
                    │ RulePreview  │                            │
                    │              │                            │
    Uncontrolled ─► │  State:      │ ◄─ Controlled              │
       Mode         │  - expanded  │      Mode                  │
                    │  - loading   │                            │
                    └──────┬───────┘                            │
                           │                                    │
                           │ Renders                            │
                           │                                    │
                ┌──────────┼──────────┐                         │
                │          │          │                         │
                ▼          ▼          ▼                         │
         ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
         │ Header  │ │ Content │ │ Footer  │                  │
         └─────────┘ └─────────┘ └─────────┘                  │
                                                               │
    User Interaction (Click expand button)                    │
                           │                                   │
                           │                                   │
                           ▼                                   │
                  handleToggleExpand()                         │
                           │                                   │
              ┌────────────┴────────────┐                     │
              │                         │                     │
              ▼                         ▼                     │
    if (onExpand)                if (!onExpand)               │
    Call parent callback         Update internal state        │
              │                         │                     │
              └─────────────┬───────────┘                     │
                           │                                  │
                           │ Re-render                        │
                           └──────────────────────────────────┘
```

---

## DIAGRAM TESTÓW (TEST COVERAGE)

```
RulePreview Component Testing Strategy
═══════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│                    UNIT TESTS (Vitest)                          │
│                 RulePreview.test.tsx                            │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │   Rendering        │  │  Expand/Collapse   │               │
│  │   - Title          │  │  - Uncontrolled    │               │
│  │   - Metadata       │  │  - Controlled      │               │
│  │   - Badge          │  │  - Toggle          │               │
│  │   - Content        │  │  - Callbacks       │               │
│  │   (5 tests)        │  │  (4 tests)         │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │   ISAP Link        │  │  Accessibility     │               │
│  │   - Visibility     │  │  - data-testid     │               │
│  │   - URL format     │  │  - className       │               │
│  │   (2 tests)        │  │  (2 tests)         │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │  Status Variants   │  │  Snapshot Testing  │               │
│  │  - Obowiązujący    │  │  - Collapsed state │               │
│  │  - Uchylony        │  │  (1 test)          │               │
│  │  (2 tests)         │  │                    │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
│                    Total: 16 Unit Tests ✅                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    E2E TESTS (Playwright)                        │
│                  rule-preview.spec.ts                            │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │   Page Object      │  │   Rendering        │                │
│  │                    │  │   - Visibility     │                │
│  │  RulePreviewPage   │  │   - Title          │                │
│  │   - Locators       │  │   - Badge          │                │
│  │   - Methods        │  │   - ISAP link      │                │
│  │   - Helpers        │  │   (4 tests)        │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │  Expand/Collapse   │  │  ISAP Integration  │                │
│  │  - Expand action   │  │  - New tab         │                │
│  │  - Collapse action │  │  - URL structure   │                │
│  │  - Toggle          │  │  (2 tests)         │                │
│  │  (4 tests)         │  │                    │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │  Multiple Rules    │  │ Visual Regression  │                │
│  │  - List handling   │  │  - Collapsed       │                │
│  │  - Controlled mode │  │  - Expanded        │                │
│  │  (2 tests)         │  │  (2 tests)         │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                  │
│  ┌────────────────────┐                                         │
│  │   Accessibility    │                                         │
│  │  - Keyboard nav    │                                         │
│  │  - Enter key       │                                         │
│  │  (2 tests)         │                                         │
│  └────────────────────┘                                         │
│                                                                  │
│                    Total: 16 E2E Tests ✅                       │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════
                    TOTAL: 32 Tests ✅
═══════════════════════════════════════════════════════════════════
```

---

## KLUCZOWE ZALEŻNOŚCI (DEPENDENCIES TREE)

```
RulePreview.tsx
├── react
│   ├── useState
│   └── useCallback
│
├── @/components/ui/card
│   ├── Card
│   ├── CardHeader
│   ├── CardTitle
│   ├── CardDescription
│   ├── CardContent
│   └── CardFooter
│
├── @/components/ui/badge
│   └── Badge
│
├── @/components/ui/button
│   └── Button
│
├── @/components/chat/MarkdownContent
│   └── MarkdownContent
│
├── lucide-react
│   ├── ChevronDown
│   ├── ChevronUp
│   └── ExternalLink
│
└── @/lib/utils
    └── cn (className utility)
```

---

## WZORCE IMPLEMENTACYJNE (DESIGN PATTERNS)

```
╔════════════════════════════════════════════════════════════════╗
║                    DESIGN PATTERNS USED                        ║
╚════════════════════════════════════════════════════════════════╝

1. Controlled/Uncontrolled Hybrid Pattern
   ┌─────────────────────────────────────┐
   │                                     │
   │  if (onExpand provided)             │
   │    → Controlled by parent           │
   │  else                               │
   │    → Uncontrolled (internal state)  │
   │                                     │
   └─────────────────────────────────────┘

2. Composition over Inheritance
   ┌─────────────────────────────────────┐
   │                                     │
   │  Uses Shadcn/ui Card composition    │
   │  instead of class inheritance       │
   │                                     │
   └─────────────────────────────────────┘

3. Single Responsibility Principle
   ┌─────────────────────────────────────┐
   │                                     │
   │  RulePreview  → Display & interact  │
   │  MarkdownContent → Render content   │
   │  Badge → Visual status indicator    │
   │                                     │
   └─────────────────────────────────────┘

4. Dependency Injection
   ┌─────────────────────────────────────┐
   │                                     │
   │  All dependencies passed via props  │
   │  Easy to test with mocks            │
   │                                     │
   └─────────────────────────────────────┘

5. Page Object Model (E2E)
   ┌─────────────────────────────────────┐
   │                                     │
   │  RulePreviewPage encapsulates       │
   │  all interactions and locators      │
   │  Tests use high-level methods       │
   │                                     │
   └─────────────────────────────────────┘
```

---

## URUCHOMIENIE TESTÓW

```bash
# ╔═══════════════════════════════════════════════════════════════╗
# ║                    UNIT TESTS (Vitest)                        ║
# ╚═══════════════════════════════════════════════════════════════╝

# Wszystkie testy
npm run test

# Tylko RulePreview
npm run test -- RulePreview

# Watch mode
npm run test:watch -- RulePreview

# Coverage
npm run test:coverage

# UI mode
npm run test:ui


# ╔═══════════════════════════════════════════════════════════════╗
# ║                     E2E TESTS (Playwright)                    ║
# ╚═══════════════════════════════════════════════════════════════╝

# Wszystkie testy E2E
npm run test:e2e

# Tylko rule-preview
npx playwright test rule-preview

# UI mode
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug

# Update snapshots
npx playwright test --update-snapshots
```

---

## COVERAGE TARGETS

```
╔════════════════════════════════════════════════════════════════╗
║                      COVERAGE GOALS                            ║
╚════════════════════════════════════════════════════════════════╝

Component: RulePreview.tsx

✅ Unit Tests Coverage:     100%
   ├─ Lines:               100%
   ├─ Functions:           100%
   ├─ Branches:            100%
   └─ Statements:          100%

✅ E2E Tests Coverage:      100%
   ├─ User Flows:          100%
   ├─ Edge Cases:          100%
   └─ Visual Regression:   100%

═══════════════════════════════════════════════════════════════════
                  TOTAL COVERAGE: 100% ✅
═══════════════════════════════════════════════════════════════════
```

---

## DOKUMENTACJA I ZASOBY

```
📚 Dokumentacja Komponentu:
   └─ src/components/legal/README.md

📝 Pliki źródłowe:
   ├─ src/components/legal/RulePreview.tsx
   ├─ src/components/legal/RulePreview.test.tsx
   ├─ e2e/page-objects/RulePreviewPage.ts
   └─ e2e/rule-preview.spec.ts

🔗 Linki:
   ├─ Vitest: https://vitest.dev
   ├─ Playwright: https://playwright.dev
   ├─ Testing Library: https://testing-library.com
   └─ Shadcn/ui: https://ui.shadcn.com
```

---

**Created:** 2025-01-11
**Author:** Claude Code
**Version:** 1.0.0
