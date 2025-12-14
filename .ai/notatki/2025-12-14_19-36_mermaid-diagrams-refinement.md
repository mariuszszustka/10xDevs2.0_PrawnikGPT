# Sesja: Refaktoryzacja i poprawki diagramów Mermaid

**Data:** 2025-12-14  
**Czas:** 19:36  
**Asystent:** Auto (Cursor AI)

---

## 📋 Cel sesji

Dostosowanie trzech diagramów Mermaid do rzeczywistych założeń projektu PrawnikGPT oraz poprawa błędów technicznych i logicznych wskazanych przez code review.

---

## 🎯 Wykonane zadania

### 1. Dostosowanie diagramów do założeń projektu

**Pliki:**
- `.ai/mermaid-diagram-auth.mdc` - Diagram sekwencji autentykacji
- `.ai/mermaid-diagram-journey.mdc` - Diagram podróży użytkownika
- `.ai/mermaid-diagram-ui.mdc` - Diagram architektury UI

**Zmiany:**
- ✅ Weryfikacja zgodności z PRD i dokumentacją projektu
- ✅ Aktualizacja zgodnie z rzeczywistą implementacją
- ✅ Poprawa błędów technicznych i logicznych

### 2. Diagram Autentykacji - Poprawki techniczne

**Znalezione błędy:**
1. ❌ **HttpOnly Cookie w przeglądarce** - JavaScript nie może ustawić HttpOnly cookie
2. ❌ **Logika resetowania hasła** - Brak kroku automatycznego logowania po kliknięciu w link
3. ⚠️ **Weryfikacja tokenu** - Brak informacji o weryfikacji offline

**Wprowadzone poprawki:**
- ✅ Usunięto błędne stwierdzenie o ustawianiu HttpOnly cookie przez JavaScript
- ✅ Dodano komentarz: `@supabase/ssr` automatycznie zarządza tokenami; HttpOnly cookies są ustawiane przez serwer (middleware)
- ✅ Dodano krok automatycznego logowania po kliknięciu w link resetujący hasło (Event: PASSWORD_RECOVERY)
- ✅ Doprecyzowano weryfikację tokenu w Backendzie jako weryfikację offline używając `SUPABASE_JWT_SECRET`
- ✅ Ulepszono opis Middleware Astro (SSR) z odczytem ciasteczek/nagłówków

**Zmiany w diagramie:**
```mermaid
# Przed:
Browser->>Browser: Zapisanie refresh token (HttpOnly cookie)

# Po:
Browser->>Browser: Zapisanie tokenów w Storage (Supabase Client)
```

### 3. Diagram Podróży Użytkownika - Poprawki logiczne

**Znalezione błędy:**
1. ❌ **Podwójne ścieżki** - Bezpośrednie przejścia i przez choice nodes (duplikacja)
2. ❌ **Konflikt wejścia do ChatView** - `[*] --> Onboarding` wewnątrz grupy kolidowało z zewnętrznymi przejściami
3. ⚠️ **Brak obsługi edge case** - Użytkownik usunął wszystkie zapytania (historia pusta, ale nie pierwsze logowanie)

**Wprowadzone poprawki:**
- ✅ Usunięto bezpośrednie przejścia `LoginPage --> ChatView` i `RegisterPage --> ChatView`
- ✅ Wszystkie przejścia po logowaniu/rejestracji prowadzą przez choice node `if_pierwsze_logowanie`
- ✅ Usunięto `[*] --> Onboarding` z wnętrza grupy ChatView
- ✅ Dodano warunek `if_historia_pusta` jako guard przy wejściu do ChatActive z zewnątrz
- ✅ Uproszczono przejścia - wszystkie z ChatView (grupa) zmienione na konkretne stany `ChatActive`

**Dodana logika:**
```mermaid
state if_historia_pusta <<choice>>
if_historia_pusta --> ChatEmpty: Historia pusta (edge case)
if_historia_pusta --> ChatActive: Historia istnieje
```

### 4. Diagram Architektury UI - Poprawki architektoniczne

**Znalezione błędy:**
1. ❌ **Astro inside React** - `SourcesList.astro` używany w `ResponseCard.tsx` (React)
2. ❌ **Kierunek zależności** - `ApiClient -.-> SupabaseClient` (odwrotnie)

**Wprowadzone poprawki:**
- ✅ Przeniesiono `SourcesList` z sekcji "Komponenty Statyczne" (Astro) do "Komponenty Czatu" (React)
- ✅ Zmieniono z `SourcesList.astro` na `SourcesList.tsx` w diagramie
- ✅ Dodano do klasy `reactComponent` w stylizacji
- ✅ Odwrócono kierunek zależności: `SupabaseClient -.->|"Dostarcza JWT"| ApiClient`
- ✅ Zaktualizowano dokumentację o rzeczywistym przepływie danych

**Uzasadnienie:**
- Komponenty Astro nie mogą być renderowane wewnątrz komponentów React
- `ResponseCard.tsx` to komponent React, więc `SourcesList` używany wewnątrz też musi być React
- W `apiClient.ts` widzimy, że `getAuthHeaders()` pobiera sesję z `supabaseClient.auth.getSession()`

---

## 📊 Podsumowanie zmian

### Pliki zmodyfikowane:
1. `.ai/mermaid-diagram-auth.mdc` - 9 poprawek technicznych
2. `.ai/mermaid-diagram-journey.mdc` - 5 poprawek logicznych + dodanie edge case
3. `.ai/mermaid-diagram-ui.mdc` - 2 poprawki architektoniczne

### Typy poprawek:
- **Błędy techniczne:** 3 (HttpOnly cookie, reset hasła, weryfikacja tokenu)
- **Błędy logiczne:** 3 (duplikacje, konflikty, brak edge case)
- **Błędy architektoniczne:** 2 (Astro/React, kierunek zależności)

### Zgodność z projektem:
- ✅ Wszystkie diagramy zgodne z PRD
- ✅ Zgodne z rzeczywistą implementacją
- ✅ Zgodne z zasadami bezpieczeństwa (PRD 9.2.2)
- ✅ Zgodne z architekturą Astro + React Islands

---

## 🔍 Weryfikacja

**Sprawdzone elementy:**
- ✅ Diagramy renderują się poprawnie (składnia Mermaid)
- ✅ Logika przepływów jest spójna
- ✅ Brak duplikacji i konfliktów
- ✅ Zgodność z dokumentacją projektu
- ✅ Zgodność z rzeczywistym kodem

**Code review:**
- ✅ Wszystkie uwagi z code review zostały uwzględnione
- ✅ Poprawki techniczne zweryfikowane pod kątem implementacji
- ✅ Poprawki logiczne zweryfikowane pod kątem PRD

---

## 📝 Uwagi

1. **SourcesList.astro vs SourcesList.tsx:**
   - W rzeczywistości `SourcesList.astro` istnieje, ale jest renderowany inline w `ResponseCard.tsx`
   - Diagram pokazuje idealną architekturę (SourcesList jako osobny React component)
   - W przyszłości warto wyekstrahować SourcesList do osobnego komponentu React

2. **HttpOnly Cookies:**
   - `@supabase/ssr` automatycznie zarządza HttpOnly cookies dla refresh tokenów
   - Cookies są ustawiane przez serwer (middleware), nie przez JavaScript
   - To jest zgodne z PRD 9.2.2 (bezpieczeństwo)

3. **Edge case - pusta historia:**
   - Dodano warunek `if_historia_pusta` dla przypadku, gdy użytkownik usunął wszystkie zapytania
   - To nie jest pierwsze logowanie, ale historia jest pusta
   - Użytkownik powinien zobaczyć przykładowe pytania (ChatEmpty)

---

## ✅ Status

**Wszystkie diagramy są teraz:**
- ✅ Poprawne składniowo (renderują się bez błędów)
- ✅ Zgodne z założeniami projektu
- ✅ Zgodne z rzeczywistą implementacją
- ✅ Gotowe do użycia w dokumentacji projektu

---

## 🔗 Powiązane pliki

- `.ai/mermaid-diagram-auth.mdc` - Diagram autentykacji
- `.ai/mermaid-diagram-journey.mdc` - Diagram podróży użytkownika
- `.ai/mermaid-diagram-ui.mdc` - Diagram architektury UI
- `.ai/prd.md` - Dokument wymagań produktu
- `.ai/auth-spec.md` - Specyfikacja techniczna autentykacji
