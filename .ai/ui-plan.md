# Architektura UI dla PrawnikGPT

## 1. Przegląd struktury UI

Interfejs użytkownika PrawnikGPT jest zbudowany wokół głównego widoku czatu, który umożliwia zadawanie pytań prawnych w języku naturalnym i otrzymywanie odpowiedzi opartych na wyszukiwaniu semantycznym w bazie 20 000 polskich ustaw. Architektura wykorzystuje **Astro 5** dla statycznych elementów layoutu oraz **React 19 islands** dla interaktywnych komponentów, co zapewnia minimalny bundle JavaScript (~40KB) przy zachowaniu pełnej funkcjonalności.

**Kluczowe założenia architektoniczne:**
- **Content-first approach:** Statyczne komponenty Astro dla treści, React islands tylko dla interaktywności
- **Partial hydration:** Strategiczne użycie `client:load`, `client:visible`, `client:idle` dla optymalizacji wydajności
- **Asynchroniczne operacje:** Polling z exponential backoff dla szybkich odpowiedzi (<15s), długi polling dla dokładnych odpowiedzi (do 240s)
- **Responsywność:** Mobile-first design z breakpoints Tailwind CSS
- **Dostępność:** Pełna zgodność z WCAG AA (ARIA attributes, keyboard navigation, semantic HTML)

**Struktura aplikacji:**
- **Publiczne widoki:** Landing page, logowanie, rejestracja (SSG/SSR)
- **Chronione widoki:** Chat, historia zapytań, ustawienia (SSR + middleware auth)
- **Główny przepływ:** Zadawanie pytań → Szybka odpowiedź → Opcjonalna dokładna odpowiedź → Ocena → Historia

---

## 2. Lista widoków

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

### 2.2. Login Page (Strona logowania)

**Ścieżka:** `/login`  
**Typ:** Astro SSR + React island (formularz)  
**Autentykacja:** Nie wymagana (publiczny)

**Główny cel:**
Logowanie istniejących użytkowników do aplikacji.

**Kluczowe informacje do wyświetlenia:**
- Formularz logowania z polami:
  - Email (input type="email")
  - Hasło (input type="password" z możliwością pokazania/ukrycia)
- Przycisk "Zaloguj się"
- Link do rejestracji: "Nie masz konta? Zarejestruj się" → `/register`
- Komunikaty błędów (inline pod polami lub Alert na górze formularza)
- Opcjonalnie: "Zapomniałeś hasła?" (post-MVP)

**Kluczowe komponenty widoku:**
- `LoginForm.tsx` (React island) - Formularz z walidacją i obsługą błędów
- `BaseLayout.astro` - Wrapper z meta tags

**UX, dostępność i względy bezpieczeństwa:**
- **UX:** 
  - Auto-focus na pole email przy załadowaniu
  - Enter do submit, Shift+Enter dla nowej linii (jeśli textarea)
  - Loading state podczas logowania (disabled input + spinner)
  - Redirect do `/app` po sukcesie
- **Dostępność:**
  - `aria-label` dla pól formularza
  - `aria-invalid` dla błędów walidacji
  - `aria-live="polite"` dla komunikatów błędów
  - Keyboard navigation (Tab, Enter, Escape)
- **Bezpieczeństwo:**
  - Ogólne komunikaty błędów ("Nieprawidłowy email lub hasło") bez ujawniania, czy email istnieje
  - Walidacja po stronie klienta (format email) i serwera
  - CSRF protection przez Supabase Auth SDK
  - Rate limiting na backendzie (10 prób/min)

---

### 2.3. Register Page (Strona rejestracji)

**Ścieżka:** `/register`  
**Typ:** Astro SSR + React island (formularz)  
**Autentykacja:** Nie wymagana (publiczny)

**Główny cel:**
Rejestracja nowych użytkowników. Auto-login po pomyślnej rejestracji.

**Kluczowe informacje do wyświetlenia:**
- Formularz rejestracji z polami:
  - Email (input type="email")
  - Hasło (input type="password" z wskaźnikiem siły hasła)
  - Potwierdzenie hasła (input type="password")
- Checkbox z akceptacją regulaminu (required)
- Przycisk "Zarejestruj się"
- Link do logowania: "Masz już konto? Zaloguj się" → `/login`
- Komunikaty błędów (walidacja hasła, zajęty email)

**Kluczowe komponenty widoku:**
- `RegisterForm.tsx` (React island) - Formularz z walidacją
- `BaseLayout.astro` - Wrapper

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Walidacja hasła w czasie rzeczywistym (min 8 znaków, komunikat inline)
  - Wskaźnik siły hasła (opcjonalnie)
  - Sprawdzanie zgodności haseł (komunikat pod polem)
  - Auto-login po rejestracji → redirect do `/app` z welcome message
  - Loading state podczas rejestracji
- **Dostępność:**
  - `aria-describedby` dla komunikatów pomocy (wymagania hasła)
  - `aria-invalid` dla błędów walidacji
  - Focus management (auto-focus na email, Tab order)
- **Bezpieczeństwo:**
  - Walidacja hasła: min 8 znaków (client + server)
  - Ogólne komunikaty błędów
  - Brak weryfikacji email w MVP (by design, minimalizacja barier wejścia)
  - Rate limiting na backendzie

---

### 2.4. App Layout (Główny layout aplikacji)

**Ścieżka:** `/app/*` (wszystkie chronione widoki)  
**Typ:** Astro layout z React islands  
**Autentykacja:** Wymagana (middleware redirect do `/login`)

**Główny cel:**
Wspólny layout dla wszystkich chronionych widoków aplikacji. Zapewnia spójną nawigację i zarządzanie sesją użytkownika.

**Kluczowe informacje do wyświetlenia:**
- **Header:**
  - Logo (link do `/app`)
  - Nawigacja pozioma: "Chat" | "Historia" (desktop) lub hamburger menu (mobile)
  - User menu (React island): Avatar użytkownika + dropdown z opcjami:
    - Email użytkownika (read-only)
    - "Ustawienia" → `/app/settings`
    - "Wyloguj" → wylogowanie + redirect do `/login`
  - Badge z liczbą aktywnych zapytań (np. "2 przetwarzane") - jeśli są aktywne
- **Main content area:** `<slot />` dla zawartości widoków
- **Footer (opcjonalny):** Linki pomocnicze, informacja o MVP

**Kluczowe komponenty widoku:**
- `AppLayout.astro` - Główny layout wrapper
- `Header.astro` - Statyczna nawigacja
- `UserMenu.tsx` (React island) - Menu użytkownika z dropdown
- `AppContext.tsx` (React Context) - Globalny stan (activeQueries, userSession, rateLimitInfo)

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Sticky header (zawsze widoczny)
  - Aktywny link w nawigacji (podświetlenie aktualnej strony)
  - Responsywność: hamburger menu na mobile, pozioma nawigacja na desktop
  - Wskaźnik aktywnych zapytań w nagłówku (badge)
- **Dostępność:**
  - Semantic HTML: `<nav>` dla nawigacji, `<header>` dla nagłówka
  - Skip link: "Przejdź do treści" (klawiatura)
  - ARIA landmarks (`role="navigation"`, `role="banner"`)
  - Keyboard navigation dla dropdown menu (Arrow keys, Escape)
- **Bezpieczeństwo:**
  - Middleware sprawdzający `auth.getSession()` przed renderowaniem
  - Redirect do `/login?expired=true` jeśli sesja wygasła
  - Automatyczne odświeżanie tokenów JWT (Supabase SDK)

---

### 2.5. Chat View (Główny widok czatu)

**Ścieżka:** `/app` lub `/app/chat`  
**Typ:** Astro SSR + React islands (główny interaktywny widok)  
**Autentykacja:** Wymagana

**Główny cel:**
Główny interfejs aplikacji umożliwiający zadawanie pytań prawnych i otrzymywanie odpowiedzi z systemu RAG.

**Kluczowe informacje do wyświetlenia:**

#### 2.5.1. Welcome Message (Onboarding)
- **Warunek wyświetlenia:** Użytkownik nie ma historii zapytań (pierwsze użycie)
- **Treść:**
  ```
  Witaj w PrawnikGPT! 👋

  Jestem twoim asystentem prawnym. Mogę odpowiadać na pytania
  dotyczące 20 000 najnowszych polskich ustaw.

  Zadaj pytanie lub wybierz jeden z przykładów poniżej:
  ```
- **Przykładowe pytania (klikalne):**
  - "Jakie są podstawowe prawa konsumenta w Polsce?"
  - "Co to jest przedawnienie w prawie cywilnym?"
  - "Jakie są zasady wypowiedzenia umowy o pracę?"
  - "Kiedy można odwołać się od wyroku sądu?"

#### 2.5.2. Chat Messages Area
- **Lista query/response pairs:**
  - **User question:** Right-aligned bubble, light blue background
  - **Fast response:** Left-aligned card, white background:
    - Response content (Markdown rendering z `react-markdown`)
    - Sekcja "Źródła" z klikalnymi linkami do ISAP (maksymalnie 10, z możliwością rozwinięcia)
    - Rating buttons: 👍 👎 (React island z optimistic updates)
    - "Uzyskaj dokładniejszą odpowiedź" button (jeśli nie została jeszcze wygenerowana)
    - Timer cache RAG context: "Dostępne przez 4:32" (zielony → żółty → czerwony)
    - Badge z czasem generowania: "<1s", "8.5s", "2m 15s"
  - **Detailed response (jeśli wygenerowana):**
    - Label: "Dokładniejsza odpowiedź (gpt-oss:120b)"
    - Response content (Markdown)
    - Sources list
    - Rating buttons: 👍 👎
    - Generation time badge: "Wygenerowano w 187s"
- **Loading states:**
  - Skeleton loader podczas generowania szybkiej odpowiedzi
  - Progress bar (indeterminate) w modal dla dokładnej odpowiedzi
  - Komunikat po 15s: "Odpowiedź może potrwać dłużej niż zwykle..."
- **Error states:**
  - `NoRelevantActsError`: Przyjazna karta z komunikatem i przyciskiem "Zobacz przykładowe pytania"
  - Network errors: Toast notification z przyciskiem retry
  - Timeout (240s): Komunikat "Generowanie przekroczyło limit czasu" + "Spróbuj ponownie"

#### 2.5.3. Chat Input Component
- Textarea z auto-resize (max 5 linii widocznych)
- Character counter: "45 / 1000" (czerwony gdy przekroczony)
- Send button (disabled jeśli <10 lub >1000 znaków)
- Wskaźnik rate limit: "7/10 zapytań" (disabled przy przekroczeniu)
- Enter to submit, Shift+Enter for newline
- Loading state: Disabled input + spinner podczas przetwarzania

**Kluczowe komponenty widoku:**
- `ChatMessagesContainer.tsx` (React island) - Główny kontener wiadomości z polling
- `ChatInput.tsx` (React island) - Pole wprowadzania pytań
- `ResponseCard.tsx` (React island) - Karta pojedynczej odpowiedzi
- `RatingButtons.tsx` (React island) - Przyciski oceny z optimistic updates
- `DetailedAnswerModal.tsx` (React island) - Modal dla dokładnej odpowiedzi (240s timeout)
- `WelcomeMessage.astro` - Komunikat powitalny (statyczny)
- `ExampleQuestions.astro` - Przykładowe pytania (statyczne, klikalne)
- `SourcesList.astro` - Lista źródeł z linkami do ISAP
- `NoRelevantActsCard.tsx` (React island) - Komunikat błędu dla aktów spoza bazy

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Auto-scroll do najnowszej wiadomości
  - Optimistic UI: Natychmiastowe wyświetlenie pytania użytkownika
  - Polling z exponential backoff (1s → 2s max) dla szybkich odpowiedzi
  - Długi polling (co 5s) dla dokładnych odpowiedzi w modal
  - Limit 3 równoczesnych zapytań (wskaźnik w nagłówku)
  - Timer cache RAG context z wizualnym wskaźnikiem
  - Rate limiting feedback w ChatInput
- **Dostępność:**
  - `aria-live="polite"` na kontenerze wiadomości (ogłaszanie nowych odpowiedzi)
  - `aria-busy="true"` na przycisku "Uzyskaj dokładniejszą odpowiedź" podczas generowania
  - `aria-label` dla wszystkich przycisków ikonowych (👍, 👎, 🗑️)
  - Semantic HTML: `<article>` dla każdej odpowiedzi, `<main>` dla głównej zawartości
  - Keyboard navigation: Tab order (input → messages → buttons)
  - Focus management: Auto-focus na input po załadowaniu
- **Bezpieczeństwo:**
  - Sanitizacja Markdown (`rehype-sanitize`) dla XSS prevention
  - Walidacja input: 10-1000 znaków (client + server)
  - Rate limiting: 10 zapytań/min (feedback w UI)
  - Timeout handling: 15s dla szybkich, 240s dla dokładnych odpowiedzi
  - Secure token handling przez Supabase Auth SDK

---

### 2.6. History View (Widok historii zapytań)

**Ścieżka:** `/app/history`  
**Typ:** Astro SSR + React islands  
**Autentykacja:** Wymagana

**Główny cel:**
Przeglądanie chronologicznej historii zapytań i odpowiedzi użytkownika.

**Kluczowe informacje do wyświetlenia:**
- **Lista zapytań (od najnowszych):**
  - **Query Card** dla każdego zapytania:
    - Question text (truncated do 100 znaków, expand on click)
    - Timestamp (relative: "2 godz. temu", "wczoraj", "3 dni temu")
    - Status badge: "Ukończone" / "Przetwarzanie..." (z możliwością odświeżenia)
    - Fast response (collapsed by default, expand icon ▼):
      - Response content (Markdown)
      - Sources list
      - Rating buttons (z aktualnym stanem)
      - Generation time badge
    - Detailed response indicator: Ikona 🔬 jeśli istnieje (collapsed by default)
    - Delete button (ikona 🗑️) → confirmation modal → DELETE `/api/v1/queries/{id}`
  - **Paginacja:**
    - Przycisk "Załaduj więcej" na dole listy
    - Licznik: "Załaduj więcej (45 pozostałych)"
    - Zachowanie scroll position po załadowaniu nowych elementów
- **Empty state:**
  - Ikona + nagłówek: "Nie masz jeszcze żadnych zapytań"
  - Opis: "Wróć do czatu i zadaj pierwsze pytanie!"
  - CTA button: "Przejdź do czatu" → `/app`

**Kluczowe komponenty widoku:**
- `HistoryList.tsx` (React island) - Główny kontener z paginacją
- `QueryCard.tsx` (React island) - Karta pojedynczego zapytania (collapsible)
- `DeleteQueryButton.tsx` (React island) - Przycisk usuwania z confirmation modal
- `EmptyState.tsx` (React island) - Stan pusty z CTA

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Collapsible responses (domyślnie zwinięte dla lepszej czytelności)
  - Smooth expand/collapse animation
  - Zachowanie scroll position przy paginacji
  - Confirmation modal przed usunięciem (zapobieganie przypadkowym usunięciom)
  - Status "Przetwarzanie..." z możliwością odświeżenia (jeśli zapytanie jest w trakcie)
  - Auto-refresh dla zapytań w statusie "processing" (opcjonalnie)
- **Dostępność:**
  - `aria-expanded` dla collapsible items
  - `aria-label` dla przycisków expand/collapse i delete
  - Keyboard navigation: Tab order, Enter do expand/collapse
  - Focus management: Restore focus po zamknięciu modala
  - Semantic HTML: `<article>` dla każdego query card
- **Bezpieczeństwo:**
  - RLS policies: Użytkownik widzi tylko swoje zapytania
  - Weryfikacja ownership przed usunięciem (backend)
  - Kaskadowe usuwanie ocen (handled by database)
  - Sanitizacja Markdown w odpowiedziach

---

### 2.7. Settings View (Widok ustawień)

**Ścieżka:** `/app/settings`  
**Typ:** Astro SSR + React islands (formularze)  
**Autentykacja:** Wymagana

**Główny cel:**
Zarządzanie kontem użytkownika i preferencjami aplikacji.

**Kluczowe informacje do wyświetlenia:**
- **Sekcja "Profil":**
  - Email (read-only, z Supabase Auth)
  - Formularz zmiany hasła:
    - Obecne hasło
    - Nowe hasło (z wskaźnikiem siły)
    - Potwierdzenie nowego hasła
    - Przycisk "Zmień hasło"
- **Sekcja "Preferencje" (opcjonalnie w MVP):**
  - Dark mode toggle (localStorage, post-MVP)
- **Sekcja "Konto":**
  - Przycisk "Usuń konto" (destructive, czerwony)
  - Confirmation modal z ostrzeżeniem:
    - "Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna."
    - "Wszystkie twoje zapytania i oceny zostaną trwale usunięte."
    - Przyciski: "Anuluj" | "Usuń konto" (destructive)

**Kluczowe komponenty widoku:**
- `ChangePasswordForm.tsx` (React island) - Formularz zmiany hasła
- `DeleteAccountButton.tsx` (React island) - Przycisk usuwania konta z modal
- `SettingsLayout.astro` - Layout z sekcjami

**UX, dostępność i względy bezpieczeństwa:**
- **UX:**
  - Jasna struktura sekcji (card-based layout)
  - Walidacja formularza w czasie rzeczywistym
  - Success toast po zmianie hasła
  - Destructive actions wyraźnie oznaczone (czerwony kolor)
  - Confirmation modal dla usunięcia konta (podwójne potwierdzenie)
- **Dostępność:**
  - `aria-describedby` dla komunikatów pomocy
  - `aria-invalid` dla błędów walidacji
  - Focus trap w modalach
  - Keyboard navigation dla wszystkich formularzy
- **Bezpieczeństwo:**
  - Wymagane obecne hasło do zmiany hasła
  - Walidacja siły hasła (min 8 znaków)
  - Ogólne komunikaty błędów
  - Weryfikacja ownership przed usunięciem konta (backend)
  - Kaskadowe usuwanie wszystkich danych użytkownika (zapytania, oceny)

---

## 3. Mapa podróży użytkownika

### 3.1. Nowy użytkownik (First-time user journey)

**Krok 1: Landing Page (`/`)**
- Użytkownik trafia na stronę główną
- Przegląda informacje o produkcie (hero, features)
- Kliknięcie CTA "Wypróbuj za darmo" → `/register`

**Krok 2: Rejestracja (`/register`)**
- Wypełnienie formularza (email, hasło, potwierdzenie hasła)
- Akceptacja regulaminu (checkbox)
- Kliknięcie "Zarejestruj się"
- Auto-login przez Supabase Auth
- Redirect do `/app` z flagą `firstLogin=true`

**Krok 3: Chat View - Onboarding (`/app`)**
- Wyświetlenie welcome message (warunek: brak historii zapytań)
- Przykładowe pytania (3-4 klikalne karty)
- Użytkownik klika przykładowe pytanie → automatyczne wypełnienie ChatInput i submit

**Krok 4: Otrzymanie szybkiej odpowiedzi**
- POST `/api/v1/queries` → 202 Accepted z `query_id`
- Rozpoczęcie polling (exponential backoff: 1s → 2s max)
- Wyświetlenie skeleton loader podczas generowania
- Otrzymanie fast response (<15s) → wyświetlenie odpowiedzi z:
  - Treścią (Markdown)
  - Źródłami (klikalne linki do ISAP)
  - Rating buttons (👍 👎)
  - Przyciskiem "Uzyskaj dokładniejszą odpowiedź"
  - Timer cache RAG context (5 minut)

**Krok 5: Żądanie dokładniejszej odpowiedzi (opcjonalnie)**
- Kliknięcie "Uzyskaj dokładniejszą odpowiedź"
- Otwarcie modal z progress barem
- POST `/api/v1/queries/{id}/accurate-response` → 202 Accepted
- Długi polling (co 5s) z timeoutem 240s
- Otrzymanie detailed response → wyświetlenie pod fast response z:
  - Label "Dokładniejsza odpowiedź (gpt-oss:120b)"
  - Treścią (Markdown)
  - Źródłami
  - Rating buttons
  - Generation time badge

**Krok 6: Ocena odpowiedzi**
- Kliknięcie 👍 lub 👎 na dowolnej odpowiedzi
- Optimistic update (natychmiastowa zmiana UI)
- POST `/api/v1/queries/{id}/ratings` w tle
- Toast notification: "Ocena zapisana"
- Wizualna zmiana: Kolor przycisku + checkmark ✓

**Krok 7: Przejście do historii**
- Kliknięcie "Historia" w nawigacji → `/app/history`
- Wyświetlenie listy zapytań (od najnowszych)
- Rozwinięcie zapytania (click na expand icon) → zobaczenie obu odpowiedzi
- Możliwość usunięcia zapytania (🗑️ → confirmation modal)

---

### 3.2. Powracający użytkownik (Returning user journey)

**Krok 1: Logowanie (`/login`)**
- Wprowadzenie email i hasła
- Kliknięcie "Zaloguj się"
- Weryfikacja przez Supabase Auth
- Redirect do `/app`

**Krok 2: Chat View z historią (`/app`)**
- Jeśli użytkownik ma historię zapytań → wyświetlenie ostatnich zapytań w chat area
- Brak welcome message (warunek: historia istnieje)
- Możliwość zadania nowego pytania

**Krok 3: Zadanie nowego pytania**
- Wprowadzenie pytania w ChatInput
- Submit → POST `/api/v1/queries`
- Polling → otrzymanie fast response
- Opcjonalnie: żądanie dokładniejszej odpowiedzi

**Krok 4: Zarządzanie historią**
- Przejście do `/app/history`
- Przeglądanie zapytań z paginacją ("Załaduj więcej")
- Usunięcie wybranych zapytań
- Powrót do czatu

---

### 3.3. Obsługa błędów i edge cases

**Scenariusz 1: Zapytanie o akt spoza bazy**
- System nie znajduje relewantnych fragmentów (similarity score < threshold)
- Wyświetlenie `NoRelevantActsCard` z komunikatem:
  - "Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu."
  - "Aktualnie dysponuję informacjami o 20 000 najnowszych ustaw."
- Przycisk "Zobacz przykładowe pytania" → scroll do sekcji ExampleQuestions

**Scenariusz 2: Timeout szybkiej odpowiedzi (>15s)**
- Komunikat: "Odpowiedź może potrwać dłużej niż zwykle..."
- Kontynuacja polling (max 30s)
- Jeśli nadal brak odpowiedzi → komunikat błędu z przyciskiem "Spróbuj ponownie"

**Scenariusz 3: Timeout dokładnej odpowiedzi (>240s)**
- Zamknięcie modal
- Toast notification: "Generowanie przekroczyło limit czasu (4 minuty)"
- Przycisk "Spróbuj ponownie" w ResponseCard

**Scenariusz 4: Wygasnięcie cache RAG context (>5 min)**
- Timer cache wyświetla "0:00" (czerwony)
- Przycisk "Uzyskaj dokładniejszą odpowiedź" disabled
- Komunikat: "Kontekst wygasł. Kliknij, aby ponownie przeszukać bazę"
- Przycisk "Ponów zapytanie" → automatyczne ponowienie POST `/api/v1/queries`

**Scenariusz 5: Rate limit exceeded**
- Toast notification: "Przekroczono limit zapytań. Spróbuj ponownie za X sekund."
- ChatInput disabled z komunikatem
- Wskaźnik w ChatInput: "10/10 zapytań" (czerwony)

**Scenariusz 6: Sesja wygasła**
- 401 Unauthorized z API
- Automatyczna próba refresh token (Supabase SDK)
- Jeśli refresh się nie powiedzie → redirect do `/login?expired=true`
- Komunikat: "Sesja wygasła. Zaloguj się ponownie."

**Scenariusz 7: Network error**
- Toast notification: "Błąd połączenia. Sprawdź internet."
- Przycisk "Spróbuj ponownie" dla failed API calls
- Automatyczny retry z exponential backoff (max 3 próby) dla krytycznych operacji

---

## 4. Układ i struktura nawigacji

### 4.1. Główna nawigacja

**Desktop (≥1024px):**
```
┌─────────────────────────────────────────────────────────┐
│ [Logo]  Chat  |  Historia  |  [User Avatar ▼]          │
└─────────────────────────────────────────────────────────┘
```

**Mobile (<1024px):**
```
┌─────────────────────────────────────┐
│ [☰]  [Logo]              [Avatar ▼] │
└─────────────────────────────────────┘
│ (Hamburger menu expanded)           │
│ • Chat                               │
│ • Historia                           │
│ • Ustawienia                         │
│ • Wyloguj                            │
└─────────────────────────────────────┘
```

### 4.2. Struktura nawigacji

**Publiczne widoki (brak nawigacji):**
- Landing Page (`/`) - Standalone, linki w footer
- Login (`/login`) - Link do `/register` w treści
- Register (`/register`) - Link do `/login` w treści

**Chronione widoki (AppLayout z nawigacją):**
- **Chat** (`/app`) - Główny widok, domyślny po zalogowaniu
- **Historia** (`/app/history`) - Lista zapytań
- **Ustawienia** (`/app/settings`) - Zarządzanie kontem (dostępne z User Menu)

### 4.3. User Menu (Dropdown)

**Desktop:**
- Avatar użytkownika (initials lub ikona) w prawym górnym rogu
- Kliknięcie → dropdown z opcjami:
  - Email użytkownika (read-only, szary)
  - Separator
  - "Ustawienia" → `/app/settings`
  - "Wyloguj" → wylogowanie + redirect do `/login`

**Mobile:**
- Avatar w headerze
- Dropdown z tymi samymi opcjami

### 4.4. Breadcrumbs (opcjonalnie)

W MVP nie są wymagane (prosta struktura 2-3 poziomów). Można dodać w przyszłości dla:
- `/app/history/{query_id}` (szczegóły zapytania, post-MVP)
- `/app/settings/{section}` (podsekcje ustawień)

### 4.5. Skip Links (Dostępność)

- Link "Przejdź do treści" (widoczny tylko przy Tab, `sr-only focus:not-sr-only`)
- Przekierowuje do `<main id="main-content">`

---

## 5. Kluczowe komponenty

### 5.1. React Islands (Interaktywne komponenty)

#### 5.1.1. `ChatInput.tsx`
**Cel:** Pole wprowadzania pytań z walidacją i rate limiting feedback.

**Kluczowe funkcjonalności:**
- Textarea z auto-resize (max 5 linii)
- Character counter (10-1000 znaków)
- Rate limit indicator (X/10 zapytań)
- Enter to submit, Shift+Enter for newline
- Loading state (disabled podczas przetwarzania)
- Debounced character counter (300ms)

**Props:**
- `onSubmit: (query: string) => void`
- `disabled?: boolean`
- `rateLimitInfo?: { used: number; limit: number; resetAt: Date }`

#### 5.1.2. `ChatMessagesContainer.tsx`
**Cel:** Główny kontener wiadomości z polling dla asynchronicznych odpowiedzi.

**Kluczowe funkcjonalności:**
- Auto-scroll do najnowszej wiadomości
- Lista query/response pairs
- Polling z exponential backoff dla szybkich odpowiedzi
- Skeleton loaders podczas generowania
- Obsługa równoczesnych zapytań (limit 3)
- ARIA live region dla screen readers

**Props:**
- `queries: Query[]` (z Context lub props)
- `onQuerySubmit: (text: string) => Promise<string>` (query_id)

#### 5.1.3. `ResponseCard.tsx`
**Cel:** Wyświetlanie pojedynczej odpowiedzi (fast lub accurate) z wszystkimi elementami.

**Kluczowe funkcjonalności:**
- Markdown rendering (`react-markdown` z `rehype-sanitize`)
- Sources list (klikalne linki do ISAP)
- Rating buttons (z optimistic updates)
- Detailed answer button (jeśli nie wygenerowana)
- Timer cache RAG context (5 minut)
- Generation time badge

**Props:**
- `response: FastResponse | AccurateResponse`
- `queryId: string`
- `showDetailedButton: boolean`
- `ragContextExpiresAt?: Date`

#### 5.1.4. `RatingButtons.tsx`
**Cel:** Przyciski oceny z optimistic updates i rollback przy błędzie.

**Kluczowe funkcjonalności:**
- Optimistic update (natychmiastowa zmiana UI)
- Wizualna różnica: Rated (kolor + checkmark) vs Not rated (szary)
- Rollback przy błędzie API
- Toast notification po sukcesie
- Disabled opposite button po oddaniu głosu

**Props:**
- `queryId: string`
- `responseType: 'fast' | 'accurate'`
- `initialRating: 'up' | 'down' | null`

#### 5.1.5. `DetailedAnswerModal.tsx`
**Cel:** Modal dla generowania dokładnej odpowiedzi (timeout 240s).

**Kluczowe funkcjonalności:**
- Modal zamykalny (zapytanie kontynuuje w tle)
- Progress bar (indeterminate)
- Długi polling (co 5s) z timeoutem 240s
- Toast notification po zakończeniu (jeśli modal zamknięty)
- Error handling (timeout, network errors)

**Props:**
- `queryId: string`
- `isOpen: boolean`
- `onClose: () => void`

#### 5.1.6. `HistoryList.tsx`
**Cel:** Lista historii zapytań z paginacją "Załaduj więcej".

**Kluczowe funkcjonalności:**
- Fetch GET `/api/v1/queries?page=1&per_page=20`
- Paginacja z przyciskiem "Załaduj więcej"
- Licznik pozostałych zapytań
- Zachowanie scroll position
- Empty state z CTA

**Props:**
- Brak (fetch wewnątrz komponentu)

#### 5.1.7. `QueryCard.tsx`
**Cel:** Karta pojedynczego zapytania w historii (collapsible).

**Kluczowe funkcjonalności:**
- Collapsible responses (domyślnie zwinięte)
- Expand/collapse animation
- Status badge ("Ukończone" / "Przetwarzanie...")
- Delete button z confirmation modal
- Detailed response indicator (ikona 🔬)

**Props:**
- `query: Query`
- `onDelete: (queryId: string) => Promise<void>`

#### 5.1.8. `UserMenu.tsx`
**Cel:** Menu użytkownika z dropdown (ustawienia, wyloguj).

**Kluczowe funkcjonalności:**
- Avatar użytkownika (initials lub ikona)
- Dropdown menu (Shadcn/ui)
- Email użytkownika (read-only)
- Link do ustawień
- Wylogowanie (Supabase Auth)

**Props:**
- `user: { email: string; avatar?: string }`

### 5.2. Astro Components (Statyczne komponenty)

#### 5.2.1. `WelcomeMessage.astro`
**Cel:** Komunikat powitalny dla nowych użytkowników.

**Zawartość:**
- Nagłówek: "Witaj w PrawnikGPT! 👋"
- Opis zakresu MVP
- CTA: "Zadaj pytanie lub wybierz jeden z przykładów poniżej"

#### 5.2.2. `ExampleQuestions.astro`
**Cel:** Przykładowe pytania (statyczne, klikalne).

**Zawartość:**
- 3-4 przykładowe pytania w grid (2x2 na desktop, 1 kolumna na mobile)
- Event delegation z `data-question` attribute
- Custom event `fillQuestion` do ChatInput

#### 5.2.3. `SourcesList.astro`
**Cel:** Lista źródeł z linkami do ISAP.

**Zawartość:**
- Sekcja "Źródła" pod treścią odpowiedzi
- Lista linków (maksymalnie 10, z możliwością rozwinięcia)
- Ikona zewnętrznego linku (target="_blank")
- Format: "Ustawa o prawach konsumenta, Art. 5" → link do ISAP

#### 5.2.4. `Header.astro`
**Cel:** Statyczna nawigacja w AppLayout.

**Zawartość:**
- Logo (link do `/app`)
- Navigation links (Chat, Historia)
- Slot dla UserMenu (React island)

#### 5.2.5. `Footer.astro`
**Cel:** Stopka z linkami pomocniczymi.

**Zawartość:**
- Linki: Regulamin, Polityka prywatności, Kontakt
- Informacja o MVP: "Aktualnie 20 000 najnowszych ustaw"

### 5.3. Custom Hooks

#### 5.3.1. `useQueryPolling.ts`
**Cel:** Exponential backoff polling dla szybkich odpowiedzi.

**Zwraca:**
- `status: 'processing' | 'completed' | 'error'`
- `elapsed: number` (sekundy)
- `query: Query | null`

#### 5.3.2. `useLongPolling.ts`
**Cel:** Długi polling dla dokładnych odpowiedzi (240s timeout).

**Zwraca:**
- `status: 'processing' | 'completed' | 'error' | 'timeout'`
- `elapsed: number` (sekundy)
- `error: string | null`

#### 5.3.3. `useActiveQueries.ts`
**Cel:** Zarządzanie limitem 3 aktywnych zapytań.

**Zwraca:**
- `activeQueries: Set<string>` (query_ids)
- `canSubmit: boolean`
- `addQuery: (queryId: string) => void`
- `removeQuery: (queryId: string) => void`

#### 5.3.4. `useRAGContextTimer.ts`
**Cel:** Timer odliczający cache TTL (5 minut).

**Zwraca:**
- `timeRemaining: number | null` (ms)
- `minutes: number`
- `seconds: number`
- `isExpiring: boolean` (<1 minuta)

#### 5.3.5. `useOptimisticRating.ts`
**Cel:** Optimistic updates dla ratingów z rollback.

**Zwraca:**
- `rating: 'up' | 'down' | null`
- `isSubmitting: boolean`
- `handleRating: (value: 'up' | 'down') => Promise<void>`

#### 5.3.6. `useDebounce.ts`
**Cel:** Reusable debounce logic.

**Zwraca:**
- `debouncedValue: T`
- `debouncedCallback: (value: T) => void`

### 5.4. Context Providers

#### 5.4.1. `AppContext.tsx`
**Cel:** Globalny stan aplikacji (activeQueries, userSession, rateLimitInfo).

**Zawartość:**
- `activeQueries: Set<string>`
- `userSession: Session | null`
- `rateLimitInfo: { used: number; limit: number; resetAt: Date } | null`
- `setActiveQueries`, `setUserSession`, `setRateLimitInfo`

**Użycie:**
- Provider w `AppLayout.astro`
- Consume w React islands przez `useContext(AppContext)`

### 5.5. Utility Components

#### 5.5.1. `EmptyState.tsx`
**Cel:** Spójny design dla pustych stanów.

**Props:**
- `icon?: ReactNode`
- `title: string`
- `description: string`
- `action?: { label: string; onClick: () => void }`

**Użycie:**
- Historia bez zapytań
- Chat bez odpowiedzi (edge case)
- Błędy wyszukiwania

#### 5.5.2. `ErrorBoundary.tsx`
**Cel:** Error boundary dla React islands.

**Funkcjonalności:**
- Przechwytywanie błędów React
- Przyjazny komunikat z przyciskiem odświeżenia
- Logowanie błędów (konsola w dev, Sentry w prod)
- Fallback UI dla krytycznych komponentów

---

## Podsumowanie

Architektura UI dla PrawnikGPT MVP jest zaprojektowana z myślą o:
- **Prostocie:** Minimalistyczny interfejs skupiony na głównej funkcjonalności (czat)
- **Wydajności:** Astro + React islands dla minimalnego JS bundle (~40KB)
- **Dostępności:** Pełna zgodność z WCAG AA
- **Bezpieczeństwie:** Sanitizacja, walidacja, rate limiting, secure token handling
- **UX:** Optimistic updates, polling dla asynchronicznych operacji, przyjazne komunikaty błędów

Wszystkie widoki, komponenty i przepływy użytkownika są zmapowane na endpointy API i wymagania z PRD, zapewniając spójne doświadczenie użytkownika od rejestracji do codziennego użytkowania aplikacji.

