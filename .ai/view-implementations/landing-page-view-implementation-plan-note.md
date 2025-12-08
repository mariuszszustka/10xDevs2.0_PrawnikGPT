# Landing Page View - Implementation Plan

**Widok:** Landing Page (Strona główna)  
**Ścieżka:** `/`  
**Typ:** Astro SSG (statyczna generacja)  
**Autentykacja:** Nie wymagana (publiczny)

---

## 1. Product Requirements Document (PRD)

@.ai/prd.md

---

## 2. Opis widoku

### 2.1. Landing Page (Strona główna)

**Ścieżka:** `/`  
**Typ:** Astro SSG (statyczna generacja)  
**Autentykacja:** Nie wymagana (publiczny)

**Główny cel:**
Marketing i onboarding nowych użytkowników. Prezentacja wartości produktu i zachęta do rejestracji.

**Kluczowe informacje do wyświetlenia:**
- Hero section z głównym komunikatem: "Inteligentny asystent prawny oparty na AI"
- Call-to-action (CTA): "Wypróbuj za darmo" → przekierowanie do `/register`
- Opis funkcjonalności w 3 kolumnach:
  - **Szybko:** Odpowiedzi w <15 sekund
  - **Dokładnie:** Opcjonalna szczegółowa odpowiedź z modelu 120B
  - **Wiarygodnie:** Źródła z 20 000 najnowszych polskich ustaw
- Przykładowe pytania (screenshot lub interaktywny widget)
- Informacja o zakresie MVP: "Aktualnie 20 000 najnowszych ustaw"
- Footer z linkami: Regulamin, Polityka prywatności, Kontakt

**Kluczowe komponenty widoku:**
- `HeroSection.astro` - Główna sekcja z CTA
- `FeaturesSection.astro` - Prezentacja funkcjonalności (3 kolumny)
- `ExampleQuestionsPreview.astro` - Podgląd przykładowych pytań
- `Footer.astro` - Stopka z linkami

**UX, dostępność i względy bezpieczeństwa:**
- **UX:** Jasny CTA, minimalne kroki do rejestracji, wizualna hierarchia informacji
- **Dostępność:** Semantic HTML (`<header>`, `<main>`, `<section>`), ARIA landmarks, keyboard navigation
- **Bezpieczeństwo:** Brak wrażliwych danych, statyczna generacja (brak SSR)

---

## 3. User Stories

Ten widok nie adresuje bezpośrednio żadnych user stories z PRD, ale jest częścią przepływu onboardingowego dla nowych użytkowników:

**Powiązane user stories:**
- **US-001: Rejestracja nowego użytkownika** - Landing page prowadzi do rejestracji
- **US-010: Onboarding nowego użytkownika** - Landing page jest pierwszym punktem kontaktu

---

## 4. Endpoint Description

Ten widok **nie korzysta z żadnych endpointów API** - jest całkowicie statyczny (SSG).

**Opcjonalnie (dla interaktywnego widgetu przykładowych pytań):**
- `GET /api/v1/onboarding/example-questions` - Przykładowe pytania dla nowych użytkowników
  - **Implementacja:** @.ai/implementations/09-onboarding.md
  - **Typ:** Publiczny, statyczna zawartość
  - **Response:** Lista przykładowych pytań (4-6 pytań)

---

## 5. Endpoint Implementation

**Brak endpointów** - widok jest statyczny.

**Opcjonalnie (jeśli widget przykładowych pytań jest interaktywny):**
- `GET /api/v1/onboarding/example-questions`
  - **Backend router:** `backend/routers/onboarding.py`
  - **Model:** `backend/models/onboarding.py` (ExampleQuestion, ExampleQuestionsResponse)
  - **Implementacja:** Zobacz @.ai/implementations/09-onboarding.md

---

## 6. Type Definitions

**Brak typów API** - widok jest statyczny.

**Opcjonalnie (jeśli widget przykładowych pytań jest interaktywny):**
- **Frontend types:** `src/lib/types.ts`
  - `ExampleQuestion` (linie 387-391)
  - `ExampleQuestionsResponse` (linie 397-399)

**Przykład:**
```typescript
export interface ExampleQuestion {
  id: number;
  question: string;
  category: "consumer_rights" | "civil_law" | "labor_law" | "criminal_law";
}

export interface ExampleQuestionsResponse {
  examples: ExampleQuestion[];
}
```

---

## 7. Tech Stack

**Frontend:**
- **Framework:** Astro 5 (SSG - Static Site Generation)
- **Styling:** Tailwind CSS
- **Components:** Astro components (statyczne, bez React islands)
- **Build:** Astro build (generuje statyczne HTML/CSS/JS)

**Backend (opcjonalnie, tylko dla widgetu):**
- **Framework:** FastAPI (Python 3.11+)
- **Database:** Nie wymagana (statyczna zawartość)
- **Authentication:** Nie wymagana (publiczny endpoint)

**Deployment:**
- **Frontend:** Vercel, Netlify, lub dowolny hosting statyczny
- **Backend (opcjonalnie):** Taki sam jak główny backend aplikacji

**Zobacz:** @.ai/tech-stack.md dla szczegółów infrastruktury i deployment scenarios

---

## 8. Checklist Implementacji

### Frontend (Astro)
- [ ] Utworzenie `src/pages/index.astro`
- [ ] Komponent `HeroSection.astro` z CTA
- [ ] Komponent `FeaturesSection.astro` (3 kolumny)
- [ ] Komponent `ExampleQuestionsPreview.astro` (opcjonalnie z API)
- [ ] Komponent `Footer.astro` z linkami
- [ ] BaseLayout z meta tags (SEO)
- [ ] Responsywność (mobile-first)
- [ ] Accessibility (ARIA, semantic HTML)
- [ ] Testy wizualne (różne rozdzielczości)

### Backend (opcjonalnie)
- [ ] Endpoint `GET /api/v1/onboarding/example-questions` (jeśli widget interaktywny)
- [ ] Pydantic models (`ExampleQuestion`, `ExampleQuestionsResponse`)
- [ ] Static data (lista przykładowych pytań)
- [ ] Testy endpointu

### Integracja
- [ ] Linki nawigacyjne (CTA → `/register`)
- [ ] Spójność wizualna z resztą aplikacji
- [ ] Performance (Lighthouse score >90)

---

## 9. Uwagi Implementacyjne

1. **Statyczna generacja:** Cały widok jest generowany w czasie build, bez potrzeby SSR
2. **SEO:** Ważne meta tags dla wyszukiwarek (title, description, og:image)
3. **Performance:** Minimalny JavaScript, optymalizacja obrazów, lazy loading
4. **Accessibility:** Pełna zgodność z WCAG AA (semantic HTML, ARIA landmarks)
5. **CTA:** Wyraźny, widoczny przycisk "Wypróbuj za darmo" prowadzący do `/register`

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md)

