# Usunięcie email verification z rejestracji (zgodność z PRD)

**Data:** 2025-01-11  
**Problem:** Implementacja wymagała email verification, ale PRD wyraźnie stwierdza, że MVP **nie wymaga weryfikacji adresu e-mail** (PRD 3.1, linia 19)

## Problem

Użytkownik używa lokalnej bazy Supabase i nie ma serwera pocztowego, więc nie może wysyłać maili. Weryfikacja email nie jest możliwa w lokalnym środowisku.

**PRD 3.1 (linia 19):**
> "Proces rejestracji **nie wymaga weryfikacji adresu e-mail** w celu minimalizacji barier wejścia."

**PRD US-001 (linia 147):**
> "Proces nie wymaga potwierdzenia adresu e-mail."

**auth-spec.md (linia 38):**
> "Brak weryfikacji email w MVP"

## Rozwiązanie

Zmieniono implementację, aby używała endpointu `/api/auth/register` zamiast `/api/auth/signup`, który:
- ✅ **Nie wymaga email verification** (zgodnie z PRD)
- ✅ **Automatycznie loguje użytkownika** po rejestracji
- ✅ **Działa w lokalnym środowisku** bez serwera pocztowego

## Zmiany

### 1. SignupForm.tsx
**Przed:**
- Używał endpointu `/api/auth/signup` (z email verification)
- Wyświetlał komunikat o wysłaniu emaila weryfikacyjnego
- Wymagał kliknięcia linku w emailu przed logowaniem

**Po:**
- ✅ Używa endpointu `/api/auth/register` (bez email verification)
- ✅ Automatycznie loguje użytkownika po rejestracji
- ✅ Przekierowuje do `/app` po sukcesie
- ✅ Usunięto logikę związaną z email verification
- ✅ Dodano timeout handling (spójność z LoginForm)

### 2. signup.astro
**Przed:**
- Wyświetlał komunikat o wysłaniu emaila weryfikacyjnego
- Obsługiwał parametr `emailSent` w URL

**Po:**
- ✅ Usunięto komunikat o email verification
- ✅ Usunięto obsługę parametru `emailSent`

### 3. /api/auth/register.ts
**Przed:**
- Brak timeout handling

**Po:**
- ✅ Dodano timeout handling (15 sekund) - spójność z login
- ✅ Dodano obsługę błędów timeout (503)
- ✅ Dodano obsługę błędów parsowania JSON

### 4. RegisterForm.tsx
**Przed:**
- Brak timeout handling

**Po:**
- ✅ Dodano timeout handling (20 sekund) - spójność z LoginForm
- ✅ Dodano obsługę błędów timeout (AbortError)
- ✅ Dodano obsługę błędów 503 z serwera

## Endpointy

### `/api/auth/register` (MVP - zgodny z PRD)
- ✅ **Bez email verification** (`emailRedirectTo: undefined`)
- ✅ **Automatyczne logowanie** po rejestracji (session jest tworzona od razu)
- ✅ **Timeout handling** (15 sekund)
- ✅ **Error handling** z statusami 400, 503, 500

### `/api/auth/signup` (nieużywany w MVP)
- ⚠️ **Z email verification** (niezgodne z PRD dla MVP)
- ⚠️ **Wymaga serwera pocztowego**
- ⚠️ **Nie działa w lokalnym środowisku**

**Rekomendacja:** Endpoint `/api/auth/signup` może pozostać w kodzie na przyszłość, jeśli email verification będzie potrzebne w produkcji, ale **nie jest używany w MVP**.

## Zgodność z PRD

✅ **PRD 3.1:** "Proces rejestracji **nie wymaga weryfikacji adresu e-mail**"  
✅ **PRD US-001:** "Proces nie wymaga potwierdzenia adresu e-mail"  
✅ **PRD US-001:** "Użytkownik jest automatycznie zalogowany po pomyślnej rejestracji"  
✅ **PRD 9.2.2:** Session management z HttpOnly cookies

## Testy

### Test 1: Rejestracja nowego użytkownika
1. Wejdź na `/signup`
2. Wypełnij formularz (email, hasło, potwierdzenie hasła, akceptacja regulaminu)
3. Kliknij "Zarejestruj się"
4. **Oczekiwany wynik:** Automatyczne przekierowanie do `/app` (użytkownik jest zalogowany)

### Test 2: Rejestracja w lokalnym środowisku
1. Uruchom lokalną bazę Supabase (bez serwera pocztowego)
2. Zarejestruj nowego użytkownika
3. **Oczekiwany wynik:** Rejestracja działa bez problemów, użytkownik jest automatycznie zalogowany

### Test 3: Timeout handling
1. Symuluj timeout (np. wyłącz Supabase)
2. Spróbuj zarejestrować użytkownika
3. **Oczekiwany wynik:** Komunikat "Wystąpił błąd komunikacji z serwerem. Spróbuj ponownie za chwilę."

## Pliki zmodyfikowane

1. ✅ `src/components/auth/SignupForm.tsx` - Zmieniono endpoint na `/api/auth/register`, usunięto logikę email verification
2. ✅ `src/pages/signup.astro` - Usunięto komunikat o email verification
3. ✅ `src/pages/api/auth/register.ts` - Dodano timeout handling
4. ✅ `src/components/auth/RegisterForm.tsx` - Dodano timeout handling

## Status końcowy

✅ **PROBLEM ROZWIĄZANY**

Implementacja jest teraz zgodna z PRD:
- ✅ Brak wymagania email verification w MVP
- ✅ Automatyczne logowanie po rejestracji
- ✅ Działa w lokalnym środowisku bez serwera pocztowego
- ✅ Spójność z logowaniem (timeout handling, error handling)
