# Poprawa spójności dokumentacji - Email Verification

**Data:** 2025-01-11  
**Problem:** Dokumentacja zawierała nieścisłości dotyczące email verification i wymagań hasła

## Wykryte problemy

### 1. Email Verification w MVP
**Problem:** Dokumentacja wspominała o email verification jako wymaganej funkcjonalności, ale PRD wyraźnie stwierdza, że MVP **nie wymaga weryfikacji email** (PRD 3.1, linia 19).

**Znalezione dokumenty:**
- `2025-12-12_00-41_signup-email-verification-implementation.md` - opisuje implementację z email verification
- Różne dokumenty wspominały o `/signup` jako głównej ścieżce rejestracji

**Rozwiązanie:**
- ✅ Dodano ostrzeżenie w `2025-12-12_00-41_signup-email-verification-implementation.md` o przestarzałości
- ✅ Wyjaśniono różnicę między `/register` (MVP) a `/signup` (opcjonalne)
- ✅ Zaktualizowano informacje o tym, że MVP używa `/register` bez email verification

### 2. Wymagania hasła (8 vs 12 znaków)
**Problem:** `register-page-view-implementation-plan.md` wspominał o minimum 8 znaków hasła, ale PRD wymaga 12 znaków (PRD 3.1, US-001).

**Znalezione miejsca:**
- `register-page-view-implementation-plan.md` - linia 107: "Minimum 8 znaków"

**Rozwiązanie:**
- ✅ Zaktualizowano na minimum 12 znaków zgodnie z PRD
- ✅ Dodano informację o wymaganiach złożoności (małe/duże litery, cyfry, znaki specjalne)

### 3. Enumeracja użytkowników
**Problem:** `register-page-view-implementation-plan.md` wspominał o komunikatach, które ujawniają, czy email jest zajęty, co narusza PRD 9.2.4.

**Znalezione miejsca:**
- `register-page-view-implementation-plan.md` - linia 123: "Ten adres email jest już zarejestrowany"

**Rozwiązanie:**
- ✅ Zmieniono na generic komunikat: "Nie można utworzyć konta" (zgodnie z PRD 9.2.4)
- ✅ Dodano informację o braku enumeracji użytkowników

## Zmiany w dokumentacji

### 1. register-page-view-implementation-plan.md
**Zmiany:**
- ✅ Minimum hasła: 8 → 12 znaków
- ✅ Dodano wymagania złożoności hasła (małe/duże litery, cyfry, znaki specjalne)
- ✅ Komunikat błędu email: "Ten adres email jest już zarejestrowany" → "Nie można utworzyć konta" (brak enumeracji)
- ✅ Dodano informację o auto-login po rejestracji (MVP - brak email verification)
- ✅ Dodano informację o braku enumeracji użytkowników (PRD 9.2.4)

### 2. 2025-12-12_00-41_signup-email-verification-implementation.md
**Zmiany:**
- ✅ Dodano ostrzeżenie o przestarzałości dokumentu
- ✅ Wyjaśniono, że email verification zostało usunięte z MVP
- ✅ Dodano link do dokumentu o usunięciu email verification
- ✅ Zaktualizowano sekcję "Różnice między /register a /signup" z informacją o statusie w MVP

## Zgodność z PRD

### PRD 3.1 - Uwierzytelnianie użytkowników
✅ **"Proces rejestracji nie wymaga weryfikacji adresu e-mail"** - Dokumentacja teraz poprawnie odzwierciedla to wymaganie

### PRD US-001 - Rejestracja nowego użytkownika
✅ **"Hasło musi spełniać politykę złożoności: minimum 12 znaków"** - Dokumentacja zaktualizowana

### PRD 9.2.4 - Zabezpieczenie przed popularnymi atakami
✅ **"System nie może zwracać informacji, czy podany email istnieje w bazie"** - Dokumentacja zaktualizowana z generic komunikatami

## Status dokumentacji

### Zaktualizowane dokumenty:
1. ✅ `register-page-view-implementation-plan.md` - Wymagania hasła i enumeracja
2. ✅ `2025-12-12_00-41_signup-email-verification-implementation.md` - Ostrzeżenie o przestarzałości

### Dokumenty zgodne z PRD (nie wymagają zmian):
1. ✅ `auth-spec.md` - Zawiera poprawne informacje o braku email verification w MVP
2. ✅ `prd.md` - Źródło prawdy dla wymagań

## Rekomendacje

1. ✅ **Zakończone:** Wszystkie dokumenty są teraz zgodne z PRD i aktualną implementacją
2. 🔄 **Do rozważenia:** Regularne przeglądy dokumentacji pod kątem spójności z kodem
3. 🔄 **Do rozważenia:** Dodanie automatycznych testów, które weryfikują zgodność dokumentacji z kodem

## Pliki zmodyfikowane

1. ✅ `.ai/register-page-view-implementation-plan.md` - Wymagania hasła i enumeracja
2. ✅ `.ai/notatki/2025-12-12_00-41_signup-email-verification-implementation.md` - Ostrzeżenie o przestarzałości

## Status końcowy

✅ **DOKUMENTACJA ZAKTUALIZOWANA**

Wszystkie znalezione nieścisłości zostały poprawione. Dokumentacja jest teraz spójna z:
- ✅ PRD (brak email verification w MVP, 12 znaków hasła, brak enumeracji)
- ✅ Aktualną implementacją (użycie `/register` zamiast `/signup` w MVP)
- ✅ Wymaganiami bezpieczeństwa (brak enumeracji użytkowników)
