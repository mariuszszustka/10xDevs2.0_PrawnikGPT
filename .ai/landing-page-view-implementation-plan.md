# Plan implementacji widoku Landing Page

## 1. Przegląd

Landing Page to publiczna strona główna aplikacji PrawnikGPT dostępna pod ścieżką `/`. Widok jest całkowicie statyczny (SSG - Static Site Generation) i nie wymaga autentykacji. Głównym celem widoku jest marketing i onboarding nowych użytkowników poprzez prezentację wartości produktu oraz zachętę do rejestracji.

**Kluczowe funkcje:**
- Prezentacja głównego komunikatu produktu: "Inteligentny asystent prawny oparty na AI"
- Call-to-action (CTA) prowadzący do rejestracji
- Prezentacja trzech głównych funkcjonalności (Szybko, Dokładnie, Wiarygodnie)
- Przykładowe pytania (opcjonalnie interaktywny widget)
- Informacja o zakresie MVP (20 000 najnowszych ustaw)
- Footer z linkami do regulaminu, polityki prywatności i kontaktu

**Charakterystyka techniczna:**
- Framework: Astro 5 (SSG)
- Styling: Tailwind CSS
- Komponenty: Astro components (statyczne, bez React islands)
- Performance: Minimalny JavaScript, optymalizacja obrazów, lazy loading
- Accessibility: Pełna zgodność z WCAG AA (semantic HTML, ARIA landmarks)
- SEO: Meta tags dla wyszukiwarek

## 2. Routing widoku

**Ścieżka:** `/`  
**Plik:** `src/pages/index.astro`  
**Typ:** Astro SSG (Static Site Generation)  
**Autentykacja:** Nie wymagana (publiczny dostęp)  
**Middleware:** Brak (widok publiczny)

Widok jest automatycznie dostępny pod główną ścieżką dzięki konwencji Astro, gdzie pliki w `src/pages/` stają się routami.

## 3. Struktura komponentów

```
index.astro (src/pages/index.astro)
├── BaseLayout.astro
│   ├── <head> (meta tags, SEO)
│   └── <body>
│       └── <main>
│           ├── HeroSection.astro
│           │   ├── <header> (semantic HTML)
│           │   ├── <h1> (główny tytuł)
│           │   ├── <p> (opis produktu)
│           │   └── <a> (CTA button → /register)
│           │
│           ├── FeaturesSection.astro
│           │   ├── <section> (aria-label)
│           │   ├── <h2> (nagłówek sekcji)
│           │   └── <div class="grid"> (3 kolumny)
│           │       ├── FeatureCard.astro (Szybko)
│           │       ├── FeatureCard.astro (Dokładnie)
│           │       └── FeatureCard.astro (Wiarygodnie)
│           │
│           ├── ExampleQuestionsPreview.astro (opcjonalnie)
│           │   ├── <section> (aria-label)
│           │   ├── <h2> (nagłówek)
│           │   ├── <p> (opis zakresu MVP)
│           │   └── <div> (przykładowe pytania - statyczne lub z API)
│           │       └── ExampleQuestionCard.astro (opcjonalnie, jeśli interaktywny)
│           │
│           └── Footer.astro
│               ├── <footer> (semantic HTML)
│               ├── <nav> (linki: Regulamin, Polityka prywatności, Kontakt)
│               └── <p> (copyright)
```

**Hierarchia komponentów:**

1. **Astro Page (`index.astro`):**
   - Główny plik strony
   - Importuje BaseLayout i wszystkie sekcje
   - Definiuje strukturę strony
   - Przekazuje meta tags do BaseLayout

2. **BaseLayout (`BaseLayout.astro`):**
   - Root HTML structure
   - Meta tags (title, description, og:image)
   - Viewport, charset, favicon
   - Slot dla treści strony

3. **HeroSection (`HeroSection.astro`):**
   - Główna sekcja z komunikatem produktu
   - CTA button prowadzący do `/register`
   - Responsywny design (mobile-first)

4. **FeaturesSection (`FeaturesSection.astro`):**
   - Sekcja prezentująca 3 główne funkcjonalności
   - Grid layout (3 kolumny na desktop, 1 kolumna na mobile)
   - Używa komponentu FeatureCard

5. **FeatureCard (`FeatureCard.astro`):**
   - Pojedyncza karta funkcjonalności
   - Ikona, tytuł, opis
   - Reużywalny komponent

6. **ExampleQuestionsPreview (`ExampleQuestionsPreview.astro`):**
   - Sekcja z przykładowymi pytaniami
   - Opcjonalnie: interaktywny widget (wymaga React island)
   - Informacja o zakresie MVP

7. **Footer (`Footer.astro`):**
   - Stopka z linkami
   - Regulamin, Polityka prywatności, Kontakt
   - Copyright

## 4. Szczegóły komponentów

### BaseLayout.astro

**Opis komponentu:**  
Root layout dla całej strony. Zawiera podstawową strukturę HTML, meta tags dla SEO oraz slot dla treści strony.

**Główne elementy:**
- `<html lang="pl">` - język strony
- `<head>` - meta tags, title, description, og:image, viewport, charset, favicon
- `<body>` - slot dla treści strony

**Obsługiwane zdarzenia:**  
Brak (komponent statyczny)

**Obsługiwana walidacja:**  
Brak (komponent statyczny)

**Typy:**
```typescript
interface Props {
  title: string;
  description?: string;
  ogImage?: string;
}
```

**Propsy:**
- `title: string` - Tytuł strony (używany w `<title>` i og:title)
- `description?: string` - Opis strony (meta description, og:description)
- `ogImage?: string` - URL do obrazu Open Graph (opcjonalnie)

---

### HeroSection.astro

**Opis komponentu:**  
Główna sekcja hero z komunikatem produktu i call-to-action. Prezentuje główną wartość produktu i zachęca użytkownika do rejestracji.

**Główne elementy:**
- `<header>` - semantic HTML landmark
- `<h1>` - główny tytuł: "Inteligentny asystent prawny oparty na AI"
- `<p>` - opis produktu (1-2 zdania)
- `<a href="/register">` - CTA button: "Wypróbuj za darmo"
- Opcjonalnie: `<a href="/login">` - link do logowania

**Obsługiwane zdarzenia:**  
Brak (komponent statyczny, linki używają standardowej nawigacji)

**Obsługiwana walidacja:**  
Brak (komponent statyczny)

**Typy:**  
Brak (komponent nie przyjmuje propsów lub przyjmuje opcjonalne klasy CSS)

**Propsy:**
- Brak lub opcjonalne klasy CSS dla customizacji

---

### FeaturesSection.astro

**Opis komponentu:**  
Sekcja prezentująca trzy główne funkcjonalności produktu w układzie grid (3 kolumny na desktop, 1 kolumna na mobile).

**Główne elementy:**
- `<section aria-label="Funkcjonalności">` - semantic HTML landmark z ARIA
- `<h2>` - nagłówek sekcji: "Dlaczego PrawnikGPT?"
- `<div class="grid grid-cols-1 md:grid-cols-3 gap-8">` - grid layout
- 3x `<FeatureCard>` - komponenty kart funkcjonalności

**Obsługiwane zdarzenia:**  
Brak (komponent statyczny)

**Obsługiwana walidacja:**  
Brak (komponent statyczny)

**Typy:**  
Brak (komponent statyczny)

**Propsy:**  
Brak (komponent statyczny)

---

### FeatureCard.astro

**Opis komponentu:**  
Reużywalna karta prezentująca pojedynczą funkcjonalność produktu. Zawiera ikonę, tytuł i opis.

**Główne elementy:**
- `<div class="card">` - kontener karty
- `<div class="icon">` - ikona (SVG lub emoji)
- `<h3>` - tytuł funkcjonalności
- `<p>` - opis funkcjonalności

**Obsługiwane zdarzenia:**  
Brak (komponent statyczny)

**Obsługiwana walidacja:**  
Brak (komponent statyczny)

**Typy:**
```typescript
interface Props {
  icon: string; // SVG path lub emoji
  title: string;
  description: string;
}
```

**Propsy:**
- `icon: string` - Ikona funkcjonalności (SVG path lub emoji)
- `title: string` - Tytuł funkcjonalności (np. "Szybko", "Dokładnie", "Wiarygodnie")
- `description: string` - Opis funkcjonalności

**Przykładowe dane:**
1. **Szybko:**
   - icon: ⚡ (lub SVG)
   - title: "Szybko"
   - description: "Odpowiedzi w <15 sekund"

2. **Dokładnie:**
   - icon: 🎯 (lub SVG)
   - title: "Dokładnie"
   - description: "Opcjonalna szczegółowa odpowiedź z modelu 120B"

3. **Wiarygodnie:**
   - icon: 📚 (lub SVG)
   - title: "Wiarygodnie"
   - description: "Źródła z 20 000 najnowszych polskich ustaw"

---

### ExampleQuestionsPreview.astro

**Opis komponentu:**  
Sekcja prezentująca przykładowe pytania dla nowych użytkowników. Może być statyczna (hardcoded) lub interaktywna (z API). Zawiera również informację o zakresie MVP.

**Główne elementy:**
- `<section aria-label="Przykładowe pytania">` - semantic HTML landmark
- `<h2>` - nagłówek sekcji
- `<p>` - informacja o zakresie MVP: "Aktualnie 20 000 najnowszych ustaw"
- `<div class="questions-grid">` - grid z przykładowymi pytaniami
  - Statyczne: lista `<div>` z pytaniami
  - Interaktywne: React island z `ExampleQuestionCard.tsx`

**Obsługiwane zdarzenia:**  
- Jeśli statyczne: brak
- Jeśli interaktywne: `onClick` na karcie pytania (przekierowanie do `/register` z parametrem query)

**Obsługiwana walidacja:**  
Brak (komponent prezentacyjny)

**Typy:**  
Jeśli interaktywny, wymaga typów z API:
```typescript
import type { ExampleQuestion } from '@/lib/types';
```

**Propsy:**  
Brak (komponent statyczny) lub opcjonalnie:
- `questions?: ExampleQuestion[]` - jeśli dane są przekazywane z rodzica

**Warianty implementacji:**

**Wariant 1: Statyczny (hardcoded)**
```astro
<div class="questions-grid">
  <div class="question-card">
    Jakie są podstawowe prawa konsumenta w Polsce?
  </div>
  <div class="question-card">
    Co to jest przedawnienie w prawie cywilnym?
  </div>
  <!-- ... więcej pytań ... -->
</div>
```

**Wariant 2: Interaktywny (z API)**
```astro
---
import ExampleQuestionsWidget from '../components/onboarding/ExampleQuestionsWidget.tsx';
---
<ExampleQuestionsWidget client:visible />
```

---

### ExampleQuestionsWidget.tsx (opcjonalnie, React island)

**Opis komponentu:**  
Interaktywny widget pobierający przykładowe pytania z API i wyświetlający je jako klikalne karty. Po kliknięciu przekierowuje do `/register` z parametrem query zawierającym pytanie.

**Główne elementy:**
- `<div class="questions-grid">` - kontener grid
- `<button>` - klikalne karty pytań
- Loading state (skeleton lub spinner)
- Error state (komunikat błędu)

**Obsługiwane zdarzenia:**
- `onClick` na karcie pytania → przekierowanie do `/register?question={encodedQuestion}`
- `onLoad` - pobranie danych z API przy montowaniu komponentu

**Obsługiwana walidacja:**
- Walidacja odpowiedzi API (sprawdzenie struktury danych)
- Obsługa błędów sieciowych

**Typy:**
```typescript
import type { ExampleQuestion, ExampleQuestionsResponse } from '@/lib/types';
```

**Propsy:**  
Brak (komponent pobiera dane samodzielnie)

**Stan komponentu:**
- `questions: ExampleQuestion[] | null` - lista pytań
- `loading: boolean` - stan ładowania
- `error: string | null` - komunikat błędu

---

### Footer.astro

**Opis komponentu:**  
Stopka strony z linkami do regulaminu, polityki prywatności i kontaktu. Zawiera również informację o copyright.

**Główne elementy:**
- `<footer>` - semantic HTML landmark
- `<nav aria-label="Stopka">` - nawigacja z linkami
- `<ul>` - lista linków
- `<li><a href="/regulamin">` - link do regulaminu
- `<li><a href="/polityka-prywatnosci">` - link do polityki prywatności
- `<li><a href="/kontakt">` - link do kontaktu
- `<p>` - copyright: "© 2025 PrawnikGPT. Wszelkie prawa zastrzeżone."

**Obsługiwane zdarzenia:**  
Brak (komponent statyczny, linki używają standardowej nawigacji)

**Obsługiwana walidacja:**  
Brak (komponent statyczny)

**Typy:**  
Brak (komponent statyczny)

**Propsy:**  
Brak (komponent statyczny)

## 5. Typy

### Typy statyczne (hardcoded)

Widok Landing Page jest głównie statyczny i nie wymaga typów TypeScript, ponieważ wszystkie dane są hardcoded w komponentach Astro.

### Typy opcjonalne (dla interaktywnego widgetu)

Jeśli widget przykładowych pytań jest interaktywny i korzysta z API, wymagane są następujące typy:

**Lokalizacja:** `src/lib/types.ts`

#### ExampleQuestion

```typescript
export interface ExampleQuestion {
  id: number;
  question: string;
  category: "consumer_rights" | "civil_law" | "labor_law" | "criminal_law";
}
```

**Pola:**
- `id: number` - Unikalny identyfikator pytania
- `question: string` - Treść pytania przykładowego
- `category: "consumer_rights" | "civil_law" | "labor_law" | "criminal_law"` - Kategoria pytania

**Powiązane typy:**  
Brak (typ bazowy)

#### ExampleQuestionsResponse

```typescript
export interface ExampleQuestionsResponse {
  examples: ExampleQuestion[];
}
```

**Pola:**
- `examples: ExampleQuestion[]` - Tablica przykładowych pytań

**Powiązane typy:**
- `ExampleQuestion` - typ elementu tablicy

## 6. Zarządzanie stanem

### Stan statyczny (główny widok)

Widok Landing Page jest całkowicie statyczny (SSG), więc **nie wymaga zarządzania stanem**. Wszystkie dane są hardcoded w komponentach Astro i generowane w czasie build.

### Stan opcjonalny (dla interaktywnego widgetu)

Jeśli widget przykładowych pytań jest interaktywny, wymaga lokalnego stanu w komponencie React:

**Komponent:** `ExampleQuestionsWidget.tsx`

**Stan:**
```typescript
const [questions, setQuestions] = useState<ExampleQuestion[] | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
```

**Zarządzanie stanem:**
- `useState` - lokalny stan komponentu
- `useEffect` - pobranie danych z API przy montowaniu
- Brak globalnego stanu (nanostores nie jest wymagany)

**Custom hook:**  
Brak (prosty stan lokalny wystarczy)

**Przepływ danych:**
1. Komponent montuje się → `loading = true`
2. `useEffect` wywołuje API `GET /api/v1/onboarding/example-questions`
3. Sukces → `setQuestions(data.examples)`, `setLoading(false)`
4. Błąd → `setError("Nie udało się załadować pytań")`, `setLoading(false)`

## 7. Integracja API

### Główny widok

Widok Landing Page **nie korzysta z żadnych endpointów API** - jest całkowicie statyczny (SSG).

### Opcjonalna integracja (dla interaktywnego widgetu)

Jeśli widget przykładowych pytań jest interaktywny, wymaga integracji z następującym endpointem:

**Endpoint:** `GET /api/v1/onboarding/example-questions`

**Typ żądania:**  
Brak (GET request bez body)

**Typ odpowiedzi:**
```typescript
{
  examples: ExampleQuestion[];
}
```

**Status codes:**
- `200 OK` - Sukces, zwraca listę przykładowych pytań
- `500 Internal Server Error` - Błąd serwera

**Implementacja w komponencie:**
```typescript
useEffect(() => {
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/onboarding/example-questions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const data: ExampleQuestionsResponse = await response.json();
      setQuestions(data.examples);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  fetchQuestions();
}, []);
```

**Lokalizacja API client:**  
Jeśli istnieje centralny API client (`src/lib/apiClient.ts`), można użyć go zamiast bezpośredniego `fetch`.

**Caching:**  
Opcjonalnie można dodać caching w przeglądarce (localStorage) lub użyć Astro's `fetch` z cache headers, ale dla statycznej zawartości nie jest to konieczne.

## 8. Interakcje użytkownika

### Interakcje statyczne (standardowa nawigacja)

1. **Kliknięcie CTA "Wypróbuj za darmo"**
   - **Akcja:** Przekierowanie do `/register`
   - **Implementacja:** `<a href="/register">` w `HeroSection.astro`
   - **Oczekiwany wynik:** Użytkownik zostaje przekierowany do strony rejestracji

2. **Kliknięcie linku "Zaloguj się"** (opcjonalnie)
   - **Akcja:** Przekierowanie do `/login`
   - **Implementacja:** `<a href="/login">` w `HeroSection.astro`
   - **Oczekiwany wynik:** Użytkownik zostaje przekierowany do strony logowania

3. **Kliknięcie linku w stopce** (Regulamin, Polityka prywatności, Kontakt)
   - **Akcja:** Przekierowanie do odpowiedniej strony
   - **Implementacja:** `<a href="/regulamin">`, `<a href="/polityka-prywatnosci">`, `<a href="/kontakt">` w `Footer.astro`
   - **Oczekiwany wynik:** Użytkownik zostaje przekierowany do wybranej strony

### Interakcje interaktywne (dla widgetu pytań)

4. **Kliknięcie przykładowego pytania** (jeśli widget jest interaktywny)
   - **Akcja:** Przekierowanie do `/register?question={encodedQuestion}`
   - **Implementacja:** `window.location.href = `/register?question=${encodeURIComponent(question)}` w `ExampleQuestionsWidget.tsx`
   - **Oczekiwany wynik:** Użytkownik zostaje przekierowany do strony rejestracji z wypełnionym polem pytania (jeśli strona rejestracji obsługuje parametr query)

5. **Scrollowanie strony**
   - **Akcja:** Użytkownik przewija stronę w dół
   - **Implementacja:** Natywne zachowanie przeglądarki
   - **Oczekiwany wynik:** Płynne przewijanie z możliwością zobaczenia wszystkich sekcji

### Interakcje klawiaturowe (accessibility)

6. **Nawigacja klawiszami Tab**
   - **Akcja:** Użytkownik używa klawisza Tab do nawigacji między elementami interaktywnymi
   - **Implementacja:** Natywna obsługa przez przeglądarkę (wszystkie linki i przyciski są focusable)
   - **Oczekiwany wynik:** Wizualny wskaźnik fokusa (outline) na aktywnym elemencie

7. **Aktywacja linku klawiszem Enter**
   - **Akcja:** Użytkownik naciska Enter na aktywnym linku
   - **Implementacja:** Natywna obsługa przez przeglądarkę
   - **Oczekiwany wynik:** Przekierowanie do docelowej strony

## 9. Warunki i walidacja

### Warunki statyczne (główny widok)

Widok Landing Page jest statyczny, więc **nie wymaga walidacji danych wejściowych** od użytkownika.

### Warunki dla interaktywnego widgetu

Jeśli widget przykładowych pytań jest interaktywny, wymagane są następujące warunki:

#### Walidacja odpowiedzi API

**Komponent:** `ExampleQuestionsWidget.tsx`

**Warunki:**
1. **Struktura odpowiedzi:**
   - Sprawdzenie, czy odpowiedź zawiera pole `examples`
   - Sprawdzenie, czy `examples` jest tablicą
   - Sprawdzenie, czy każdy element tablicy ma pola: `id`, `question`, `category`

2. **Typy danych:**
   - `id` musi być liczbą
   - `question` musi być niepustym stringiem
   - `category` musi być jednym z dozwolonych wartości: `"consumer_rights" | "civil_law" | "labor_law" | "criminal_law"`

3. **Walidacja w komponencie:**
```typescript
const validateResponse = (data: unknown): data is ExampleQuestionsResponse => {
  if (!data || typeof data !== 'object') return false;
  if (!('examples' in data)) return false;
  if (!Array.isArray(data.examples)) return false;
  
  return data.examples.every((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    if (!('id' in item) || typeof item.id !== 'number') return false;
    if (!('question' in item) || typeof item.question !== 'string' || item.question.length === 0) return false;
    if (!('category' in item)) return false;
    const validCategories = ['consumer_rights', 'civil_law', 'labor_law', 'criminal_law'];
    return validCategories.includes(item.category as string);
  });
};
```

**Wpływ na stan interfejsu:**
- Jeśli walidacja nie przejdzie → `error = "Nieprawidłowy format danych"`
- Jeśli walidacja przejdzie → `questions = data.examples`, `error = null`

#### Obsługa błędów sieciowych

**Warunki:**
1. **Status code != 200:**
   - Ustawienie `error = "Nie udało się załadować pytań"`
   - Wyświetlenie komunikatu błędu w interfejsie

2. **Timeout:**
   - Jeśli request trwa dłużej niż 5 sekund, przerwanie i ustawienie `error = "Przekroczono czas oczekiwania"`

3. **Brak połączenia:**
   - Obsługa `NetworkError` → `error = "Brak połączenia z internetem"`

**Wpływ na stan interfejsu:**
- `loading = false` (w każdym przypadku błędu)
- `error = "komunikat błędu"` (jeśli wystąpi błąd)
- `questions = null` (jeśli wystąpi błąd)

## 10. Obsługa błędów

### Błędy statyczne (główny widok)

Widok Landing Page jest statyczny, więc **nie generuje błędów runtime**. Wszystkie błędy są związane z build time (np. błędy składni Astro).

### Błędy dla interaktywnego widgetu

Jeśli widget przykładowych pytań jest interaktywny, wymagana jest obsługa następujących scenariuszy błędów:

#### 1. Błąd sieciowy (Network Error)

**Scenariusz:**  
Brak połączenia z internetem lub serwer API jest niedostępny.

**Obsługa:**
```typescript
catch (err) {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    setError('Brak połączenia z internetem. Sprawdź swoje połączenie.');
  } else {
    setError('Nie udało się załadować przykładowych pytań. Spróbuj odświeżyć stronę.');
  }
  setLoading(false);
}
```

**Wyświetlenie w interfejsie:**
- Komunikat błędu w sekcji widgetu
- Opcjonalnie: przycisk "Spróbuj ponownie"

#### 2. Błąd odpowiedzi API (Invalid Response)

**Scenariusz:**  
API zwraca nieprawidłowy format danych (brak pola `examples`, nieprawidłowe typy).

**Obsługa:**
```typescript
if (!validateResponse(data)) {
  setError('Nieprawidłowy format danych z serwera.');
  setLoading(false);
  return;
}
```

**Wyświetlenie w interfejsie:**
- Komunikat błędu: "Nie udało się załadować pytań"
- Fallback: wyświetlenie statycznych przykładowych pytań (hardcoded)

#### 3. Timeout

**Scenariusz:**  
Request trwa dłużej niż 5 sekund.

**Obsługa:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/v1/onboarding/example-questions', {
    signal: controller.signal
  });
  // ... reszta kodu
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    setError('Przekroczono czas oczekiwania. Spróbuj ponownie.');
  }
}
```

**Wyświetlenie w interfejsie:**
- Komunikat błędu: "Przekroczono czas oczekiwania"
- Opcjonalnie: przycisk "Spróbuj ponownie"

#### 4. Pusta lista pytań

**Scenariusz:**  
API zwraca pustą tablicę `examples: []`.

**Obsługa:**
```typescript
if (data.examples.length === 0) {
  // Fallback: użyj statycznych pytań
  setQuestions(STATIC_EXAMPLE_QUESTIONS);
  return;
}
```

**Wyświetlenie w interfejsie:**
- Wyświetlenie statycznych przykładowych pytań (hardcoded w komponencie)

#### 5. Graceful degradation (fallback)

**Strategia:**  
Jeśli widget nie może załadować danych z API, wyświetl statyczne przykładowe pytania hardcoded w komponencie.

**Implementacja:**
```typescript
const STATIC_EXAMPLE_QUESTIONS: ExampleQuestion[] = [
  { id: 1, question: "Jakie są podstawowe prawa konsumenta w Polsce?", category: "consumer_rights" },
  { id: 2, question: "Co to jest przedawnienie w prawie cywilnym?", category: "civil_law" },
  // ... więcej pytań
];

// W catch block:
catch (err) {
  console.error('Failed to load questions from API, using static fallback:', err);
  setQuestions(STATIC_EXAMPLE_QUESTIONS);
  setLoading(false);
}
```

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utworzenie katalogów dla komponentów:
   ```bash
   mkdir -p src/components/landing
   mkdir -p src/components/onboarding  # jeśli widget interaktywny
   ```

2. Utworzenie plików komponentów:
   - `src/components/landing/HeroSection.astro`
   - `src/components/landing/FeaturesSection.astro`
   - `src/components/landing/FeatureCard.astro`
   - `src/components/landing/ExampleQuestionsPreview.astro`
   - `src/components/layout/Footer.astro`
   - `src/components/onboarding/ExampleQuestionsWidget.tsx` (opcjonalnie)

### Krok 2: Implementacja BaseLayout z meta tags SEO

1. Edycja `src/layouts/BaseLayout.astro`:
   - Dodanie meta tags dla SEO (og:title, og:description, og:image)
   - Dodanie opcjonalnego parametru `ogImage` do props
   - Weryfikacja, że wszystkie wymagane meta tags są obecne

2. Testowanie meta tags:
   - Użycie narzędzi: Facebook Sharing Debugger, Twitter Card Validator
   - Weryfikacja w przeglądarce (DevTools → Elements → `<head>`)

### Krok 3: Implementacja HeroSection

1. Utworzenie `src/components/landing/HeroSection.astro`:
   - Dodanie semantic HTML (`<header>`)
   - Implementacja głównego tytułu (`<h1>`)
   - Implementacja opisu produktu (`<p>`)
   - Implementacja CTA button (`<a href="/register">`)
   - Stylowanie z Tailwind CSS (responsive, mobile-first)

2. Testowanie:
   - Weryfikacja responsywności (mobile, tablet, desktop)
   - Weryfikacja accessibility (ARIA, keyboard navigation)
   - Weryfikacja działania linku CTA

### Krok 4: Implementacja FeaturesSection i FeatureCard

1. Utworzenie `src/components/landing/FeatureCard.astro`:
   - Implementacja props (icon, title, description)
   - Stylowanie karty (shadow, padding, hover effects)
   - Testowanie komponentu w izolacji

2. Utworzenie `src/components/landing/FeaturesSection.astro`:
   - Implementacja sekcji z `<section aria-label>`
   - Implementacja grid layout (3 kolumny na desktop, 1 na mobile)
   - Użycie `FeatureCard` dla trzech funkcjonalności:
     - Szybko: "Odpowiedzi w <15 sekund"
     - Dokładnie: "Opcjonalna szczegółowa odpowiedź z modelu 120B"
     - Wiarygodnie: "Źródła z 20 000 najnowszych polskich ustaw"

3. Testowanie:
   - Weryfikacja grid layout na różnych rozdzielczościach
   - Weryfikacja accessibility (semantic HTML, ARIA)

### Krok 5: Implementacja ExampleQuestionsPreview

**Wariant A: Statyczny (hardcoded)**

1. Utworzenie `src/components/landing/ExampleQuestionsPreview.astro`:
   - Implementacja sekcji z `<section aria-label>`
   - Dodanie informacji o zakresie MVP: "Aktualnie 20 000 najnowszych ustaw"
   - Hardcoded lista przykładowych pytań (4-6 pytań)
   - Stylowanie grid z pytaniami

2. Testowanie:
   - Weryfikacja wyświetlania pytań
   - Weryfikacja responsywności

**Wariant B: Interaktywny (z API)**

1. Utworzenie `src/components/onboarding/ExampleQuestionsWidget.tsx`:
   - Implementacja React component z `useState` i `useEffect`
   - Implementacja fetch do API `GET /api/v1/onboarding/example-questions`
   - Implementacja loading state (skeleton lub spinner)
   - Implementacja error state (komunikat błędu)
   - Implementacja klikalnych kart pytań (przekierowanie do `/register?question=...`)
   - Implementacja graceful degradation (fallback do statycznych pytań)

2. Dodanie typów do `src/lib/types.ts` (jeśli jeszcze nie istnieją):
   - `ExampleQuestion`
   - `ExampleQuestionsResponse`

3. Utworzenie `src/components/landing/ExampleQuestionsPreview.astro`:
   - Import `ExampleQuestionsWidget` jako React island
   - Użycie `client:visible` dla lazy hydration
   - Dodanie informacji o zakresie MVP

4. Testowanie:
   - Weryfikacja pobierania danych z API
   - Weryfikacja obsługi błędów
   - Weryfikacja przekierowania po kliknięciu pytania
   - Weryfikacja fallback do statycznych pytań

### Krok 6: Implementacja Footer

1. Utworzenie `src/components/layout/Footer.astro`:
   - Implementacja semantic HTML (`<footer>`)
   - Implementacja nawigacji z linkami (`<nav aria-label>`)
   - Dodanie linków: Regulamin, Polityka prywatności, Kontakt
   - Dodanie copyright: "© 2025 PrawnikGPT. Wszelkie prawa zastrzeżone."
   - Stylowanie z Tailwind CSS

2. Testowanie:
   - Weryfikacja działania linków
   - Weryfikacja accessibility (semantic HTML, ARIA)

### Krok 7: Integracja komponentów w index.astro

1. Edycja `src/pages/index.astro`:
   - Import wszystkich komponentów
   - Ułożenie komponentów w odpowiedniej kolejności:
     - HeroSection
     - FeaturesSection
     - ExampleQuestionsPreview
     - Footer
   - Przekazanie meta tags do BaseLayout:
     - `title="PrawnikGPT - Inteligentny asystent prawny oparty na AI"`
     - `description="Zadawaj pytania w języku naturalnym o polskie akty prawne. Otrzymuj precyzyjne odpowiedzi oparte na 20 000 najnowszych ustaw."`
     - `ogImage="/og-image.png"` (opcjonalnie)

2. Testowanie:
   - Weryfikacja wyświetlania wszystkich sekcji
   - Weryfikacja responsywności całej strony

### Krok 8: Optymalizacja i accessibility

1. Optymalizacja obrazów (jeśli są używane):
   - Użycie Astro Image integration
   - Lazy loading dla obrazów poniżej fold
   - Optymalizacja rozmiaru plików

2. Accessibility:
   - Weryfikacja semantic HTML (`<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`)
   - Dodanie ARIA labels gdzie potrzebne
   - Weryfikacja keyboard navigation (Tab, Enter)
   - Weryfikacja kontrastu kolorów (WCAG AA - 4.5:1)
   - Weryfikacja focus indicators

3. Performance:
   - Weryfikacja Lighthouse score (cel: >90)
   - Optymalizacja CSS (usunięcie nieużywanych klas Tailwind)
   - Weryfikacja rozmiaru bundle (cel: minimalny JS)

### Krok 9: Testy wizualne

1. Testowanie na różnych urządzeniach:
   - Mobile (320px, 375px, 414px)
   - Tablet (768px, 1024px)
   - Desktop (1280px, 1920px)

2. Testowanie w różnych przeglądarkach:
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (jeśli dostępne)

3. Testowanie accessibility:
   - Użycie narzędzi: axe DevTools, WAVE
   - Testowanie z screen readerem (NVDA/JAWS)

### Krok 10: Dokumentacja i finalizacja

1. Aktualizacja dokumentacji:
   - Sprawdzenie, czy wszystkie komponenty są udokumentowane
   - Aktualizacja `.ai/view-implementation-index.md` (jeśli istnieje)

2. Code review:
   - Weryfikacja zgodności z coding guidelines
   - Weryfikacja zgodności z PRD
   - Weryfikacja zgodności z accessibility standards

3. Deployment:
   - Build aplikacji: `npm run build`
   - Weryfikacja wygenerowanych plików statycznych
   - Testowanie na środowisku staging (jeśli dostępne)
   - Deployment na produkcję

---

**Powrót do:** [View Implementation Index](../view-implementation-index.md) | [UI Plan](../ui-plan.md) | [PRD](../prd.md)

