# PrawnikGPT

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-24.11.0-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Astro](https://img.shields.io/badge/Astro-5.0-purple.svg)](https://astro.build/)

> Aplikacja typu MVP (Minimum Viable Product) mająca na celu wsparcie prawników i aplikantów w ich codziennej pracy poprzez dostarczenie inteligentnego asystenta do analizy aktów prawnych wykorzystującego technologię RAG (Retrieval-Augmented Generation).

## Spis Treści

- [Opis Projektu](#opis-projektu)
- [Stack Technologiczny](#stack-technologiczny)
- [Uruchomienie Lokalne](#uruchomienie-lokalne)
- [Dostępne Skrypty](#dostępne-skrypty)
- [Zakres Projektu](#zakres-projektu)
- [Status Projektu](#status-projektu)
- [Licencja](#licencja)
- [Dodatkowe Zasoby](#dodatkowe-zasoby)

## Opis Projektu

PrawnikGPT to inteligentny asystent prawny zaprojektowany do wsparcia prawników i aplikantów w ich codziennej pracy. Aplikacja umożliwia użytkownikom zadawanie pytań o polskie akty prawne w języku naturalnym i otrzymywanie precyzyjnych odpowiedzi opartych na bazie 20 000 najnowszych aktów prawnych.

### Kluczowa Innowacja

**Dwupoziomowy system odpowiedzi:**
- **Szybka odpowiedź** (<15s): Generowana przez mniejszy model językowy (7B-13B parametrów) - domyślna odpowiedź dla każdego zapytania
- **Dokładna odpowiedź** (timeout do 240s): Generowana przez większy model 120B (`gpt-oss:120b`) na żądanie użytkownika poprzez przycisk "Uzyskaj dokładniejszą odpowiedź"

### Kluczowe Funkcjonalności

- 🤖 **Interfejs czatowy z RAG** - Zadawaj pytania o akty prawne w języku naturalnym
- ⚡ **Szybkie odpowiedzi** - Otrzymuj odpowiedzi w czasie poniżej 15 sekund
- 🔍 **Wyszukiwanie semantyczne** - Znajdź relewantne akty prawne używając wektorowych embeddingów
- 📚 **Historia zapytań** - Chronologiczna lista wszystkich zapytań i odpowiedzi
- ⭐ **System ocen** - Oceniaj jakość odpowiedzi (kciuk w górę/dół)
- 🎯 **Cytowanie źródeł** - Klikalne linki do źródłowych aktów prawnych i artykułów

### Problem

Prawnicy i aplikanci spędzają znaczną ilość czasu na manualnym przeszukiwaniu aktów prawnych, analizowaniu ich wzajemnych powiązań oraz szukaniu konkretnych przepisów. Obecne narzędzia często nie pozwalają na zadawanie pytań w języku naturalnym i nie dostarczają odpowiedzi w kontekście powiązanych dokumentów. Proces ten jest czasochłonny, nieefektywny i podatny na błędy.

## Stack Technologiczny

### Frontend
- **[Astro 5](https://astro.build/)** - Nowoczesny framework webowy z minimalną ilością JavaScript
- **[React 19](https://react.dev/)** - Komponenty interaktywne (architektura islands)
- **[TypeScript 5](https://www.typescriptlang.org/)** - Rozwój z typowaniem statycznym
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[Shadcn/ui](https://ui.shadcn.com/)** - Biblioteka dostępnych komponentów React

### Backend
- **[Python 3.11+](https://www.python.org/)** - Język programowania
- **[FastAPI](https://fastapi.tiangolo.com/)** - Nowoczesny, szybki framework webowy do budowy API
- **[Pydantic](https://docs.pydantic.dev/)** - Walidacja danych używając adnotacji typów Pythona

### Baza Danych
- **[Supabase](https://supabase.com/)** - Open-source alternatywa dla Firebase
- **[PostgreSQL](https://www.postgresql.org/)** - Relacyjna baza danych
- **[pgvector](https://github.com/pgvector/pgvector)** - Rozszerzenie do wyszukiwania podobieństwa wektorowego

### Infrastruktura AI
- **[OLLAMA](https://ollama.ai/)** - Lokalne hostowanie LLM
  - **Model szybki**: Mistral 7B lub Llama 2 13B
  - **Model dokładny**: gpt-oss:120b
  - **Model embeddings**: nomic-embed-text (768-dim) lub mxbai-embed-large
- **[LangChain](https://www.langchain.com/)** / **[LlamaIndex](https://www.llamaindex.ai/)** - Orkiestracja RAG

### Narzędzia Deweloperskie
- **ESLint** + **Prettier** - Jakość kodu i formatowanie
- **Vitest** - Testy frontend
- **pytest** - Testy backend
- **GitHub Actions** - CI/CD

## Uruchomienie Lokalne

### Wymagania

- **Node.js** 24.11.0 (zobacz `.nvmrc` dla wersji)
- **Python** 3.11 lub wyższy
- **OLLAMA** zainstalowane lokalnie ([pobierz](https://ollama.ai/))
- **Docker** (dla lokalnego Supabase)
- **Supabase CLI** ([instrukcja instalacji](https://supabase.com/docs/guides/cli))

### Krok 1: Sklonuj Repozytorium

```bash
git clone https://github.com/mariuszszustka/10xDevs2.0_PrawnikGPT.git
cd 10xDevs2.0_PrawnikGPT
```

### Krok 2: Skonfiguruj Zmienne Środowiskowe

Skopiuj `.env.example` do `.env` i skonfiguruj zgodnie ze swoim scenariuszem deployment:

```bash
cp .env.example .env
```

**Obsługiwane scenariusze deployment:**
- 🏠 **All-in-one**: Wszystko na localhost
- 🔀 **Distributed**: Frontend/Backend osobno od serwisów
- ☁️ **Cloud/Production**: Wszystkie komponenty w chmurze
- 🔄 **Hybrid**: Dowolna kombinacja lokalna i chmurowa

Zobacz `.env.example` dla szczegółowych przykładów konfiguracji.

### Krok 3: Ustaw Wersję Node.js

Jeśli używasz `nvm`:

```bash
nvm use
# lub
nvm install 24.11.0
```

### Krok 4: Zainstaluj Modele OLLAMA

```bash
# Zainstaluj wymagane modele
ollama pull nomic-embed-text
ollama pull mistral:7b
ollama pull gpt-oss:120b

# Zweryfikuj instalację
ollama list
```

### Krok 5: Uruchom Supabase (Lokalnie)

```bash
# Uruchom lokalną instancję Supabase
supabase start

# Zanotuj dane połączenia z outputu
# Będziesz potrzebować: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET
```

### Krok 6: Zainstaluj Zależności Frontend

```bash
npm install
```

### Krok 7: Zainstaluj Zależności Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Na Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### Krok 8: Uruchom Serwery Deweloperskie

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn main:app --reload
# Backend dostępny pod http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Frontend dostępny pod http://localhost:4321
```

### Krok 9: Zweryfikuj Konfigurację

```bash
# Test Supabase
curl http://localhost:8444/health

# Test OLLAMA
curl http://localhost:11434/api/version

# Test Backend
curl http://localhost:8000/health
```

Otwórz przeglądarkę i przejdź do `http://localhost:4321`, aby zobaczyć aplikację.

## Dostępne Skrypty

### Skrypty Frontend

| Skrypt | Opis |
|--------|------|
| `npm run dev` | Uruchom serwer deweloperski Astro (port 4321) |
| `npm run build` | Zbuduj produkcyjną wersję statyczną |
| `npm run preview` | Podgląd produkcyjnej wersji lokalnie |
| `npm run lint` | Uruchom ESLint do sprawdzenia jakości kodu |
| `npm run lint:fix` | Uruchom ESLint i automatycznie napraw błędy |
| `npm run type-check` | Uruchom sprawdzanie typów TypeScript |
| `npm run format` | Sformatuj kod używając Prettier |

### Skrypty Backend

```bash
# Uruchom serwer deweloperski
cd backend
uvicorn main:app --reload

# Uruchom testy
pytest

# Sprawdzanie typów
mypy backend/
```

## Zakres Projektu

### ✅ W Zakresie (MVP)

- **Uwierzytelnianie**: Rejestracja i logowanie email/hasło (bez weryfikacji email)
- **Interfejs czatu**: Zapytania w języku naturalnym z szybkimi i dokładnymi odpowiedziami
- **Historia zapytań**: Chronologiczna lista zapytań i odpowiedzi
- **System ocen**: Opinie kciuk w górę/dół dla odpowiedzi
- **Onboarding**: Komunikat powitalny i przykładowe pytania dla nowych użytkowników
- **Statyczny zbiór danych**: 20 000 najnowszych polskich aktów prawnych
- **Pipeline RAG**: Wyszukiwanie semantyczne z wektorowymi embeddingami
- **Dwupoziomowe odpowiedzi**: Generowanie szybkich (<15s) i dokładnych (do 240s) odpowiedzi

### ❌ Poza Zakresem (MVP)

- Pełna baza danych ISAP (tylko 20k aktów)
- Zaawansowane wyszukiwanie/filtry w historii
- Współdzielenie zapytań między użytkownikami
- Eksport do PDF/DOCX
- Aplikacje mobilne (tylko web)
- Automatyczna aktualizacja aktów prawnych (statyczny zbiór danych)
- Testy End-to-End (E2E)
- Weryfikacja email
- Funkcjonalności płatności/subskrypcji
- Panel administracyjny do zarządzania użytkownikami

## Status Projektu

🚧 **W Aktywnym Rozwoju**

Projekt jest obecnie we wczesnej fazie rozwoju jako część kursu [10xDevs](https://www.10xdevs.pl/).

### Obecny Status

- ✅ Struktura projektu i konfiguracja
- ✅ Migracja frontendu do Astro 5 z React 19
- ✅ Podstawowe strony i layouty
- ✅ Narzędzia jakości kodu (ESLint, Prettier)
- ✅ Konfiguracja integracji Shadcn/ui
- 🚧 Implementacja API backend (w trakcie)
- 🚧 Migracje bazy danych (w trakcie)
- 🚧 Implementacja pipeline RAG (w trakcie)
- 🚧 Komponenty React dla interfejsu czatu (planowane)
- 🚧 Przepływ uwierzytelniania (planowane)
- 🚧 Pipeline ingecji danych (planowane)

### Plan Rozwoju

**Faza 1: Przepływ z Pojedynczym Modelem**
- Kompletny przepływ użytkownika: logowanie, czat, historia, oceny
- Pojedynczy mniejszy model LLM (7B-13B) dla wszystkich odpowiedzi
- Stabilizacja infrastruktury RAG, frontendu, backendu i bazy danych

**Faza 2: Integracja Większego Modelu**
- Dodanie funkcjonalności "Uzyskaj dokładniejszą odpowiedź"
- Integracja z modelem gpt-oss:120b
- Implementacja buforowania kontekstu RAG (5 minut)
- Implementacja timeoutu 240s dla dokładnych odpowiedzi

## Licencja

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

```
MIT License

Copyright (c) 2025 MariuszSzustka

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

## Dodatkowe Zasoby

### Dokumentacja Projektu

- 📋 [Dokument Wymagań Produktu (PRD)](.ai/prd.md)
- 🏗️ [Szczegóły Stacku Technologicznego](.ai/tech-stack.md)
- 🔧 [Plan API](.ai/api-plan.md)
- 💾 [Plan Bazy Danych](.ai/db-plan.md)
- 🎨 [Plan UI](.ai/ui-plan.md)
- 🤖 [Plan Implementacji RAG](.ai/rag-implementation-plan.md)

### Instrukcje dla Agentów AI

- 🤖 [Instrukcje Claude Code](.claude/CLAUDE.md)
- 🤖 [Instrukcje Gemini](.gemini/GEMINI.md)
- 🤖 [Reguły Cursor AI](.cursor/rules/)
- 🤖 [Instrukcje GitHub Copilot](.github/copilot-instructions.md)

### Dokumentacja Zewnętrzna

- [Dokumentacja Astro](https://docs.astro.build)
- [Dokumentacja React](https://react.dev)
- [Dokumentacja FastAPI](https://fastapi.tiangolo.com)
- [Dokumentacja Supabase](https://supabase.com/docs)
- [Dokumentacja OLLAMA](https://ollama.ai)
- [Dokumentacja LangChain](https://python.langchain.com)
- [Dokumentacja Tailwind CSS](https://tailwindcss.com/docs)
- [Dokumentacja Shadcn/ui](https://ui.shadcn.com)

---

**Uwaga**: Ten projekt jest częścią kursu [10xDevs](https://www.10xdevs.pl/) i jest rozwijany jako MVP w celu walidacji zapotrzebowania rynkowego na tego typu narzędzie asystenta prawnego.

