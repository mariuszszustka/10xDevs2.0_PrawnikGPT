# PrawnikGPT

PrawnikGPT to aplikacja typu MVP (Minimum Viable Product) mająca na celu wsparcie prawników i aplikantów w ich codziennej pracy poprzez dostarczenie inteligentnego asystenta do analizy aktów prawnych.

Projekt realizowany w ramach kursu [10xDevs](https://www.10xdevs.pl/).

**Dokumentacja projektu:**
- 📋 [Product Requirements](.ai/prd.md)
- 🏗️ [Tech Stack](.ai/tech-stack.md)
- 🔧 [API Plan](.ai/api-plan.md)
- 💾 [Database Plan](.ai/db-plan.md)
- 🎨 [UI Plan](.ai/ui-plan.md)
- 🤖 [RAG Implementation](.ai/rag-implementation-plan.md)

**Instrukcje dla AI agentów:**
- 🤖 [Claude Code](.claude/CLAUDE.md)
- 🤖 [Gemini](.gemini/GEMINI.md)
- 🤖 [Cursor](.cursor/rules/)
- 🤖 [GitHub Copilot](.github/copilot-instructions.md)

## Problem

Prawnicy i aplikanci spędzają znaczną ilość czasu na manualnym przeszukiwaniu aktów prawnych, analizowaniu ich wzajemnych powiązań oraz szukaniu konkretnych przepisów. Obecne narzędzia często nie pozwalają na zadawanie pytań w języku naturalnym i nie dostarczają odpowiedzi w kontekście powiązanych dokumentów.

## Kluczowe Funkcjonalności

*   **Interfejs Czatowy:** Zadawaj pytania dotyczące aktów prawnych w języku naturalnym.
*   **Mechanizm RAG:** Otrzymuj precyzyjne odpowiedzi oparte na treści 20 000 najnowszych ustaw.
*   **Dwupoziomowe Odpowiedzi:** Uzyskaj szybką odpowiedź lub poproś o bardziej szczegółową analizę od większego modelu AI.
*   **Historia Zapytań:** Przeglądaj i zarządzaj swoją historią zapytań i odpowiedzi.
*   **System Ocen:** Oceniaj jakość odpowiedzi, aby pomóc w ulepszaniu systemu.

## Stack Technologiczny

*   **Frontend:** [Astro 5](https://astro.build/), [React 19](https://react.dev/) (islands), [Tailwind CSS](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/)
*   **Backend:** [Python](https://www.python.org/) 3.11+, [FastAPI](https://fastapi.tiangolo.com/)
*   **Baza Danych:** [Supabase](https://supabase.com/) (PostgreSQL + pgvector)
*   **AI:**
    *   Hostowanie modeli: [OLLAMA](https://ollama.ai/)
    *   Orkiestracja: [LangChain](https://www.langchain.com/) / [LlamaIndex](https://www.llamaindex.ai/)
*   **CI/CD:** [GitHub Actions](https://github.com/features/actions)

## Uruchomienie Projektu

### Wymagania

*   [Node.js](https://nodejs.org/)
*   [Python](https://www.python.org/) 3.9+
*   [OLLAMA](https://ollama.ai/) zainstalowana lokalnie
*   [Docker](https://www.docker.com/) (do uruchomienia Supabase)
*   [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. Klonowanie Repozytorium

```bash
git clone https://github.com/mariuszszustka/10xDevs2.0_PrawnikGPT.git
cd 10xDevs2.0_PrawnikGPT
```

### 2. Konfiguracja Zmiennych Środowiskowych

Stwórz plik `.env` w głównym katalogu projektu i uzupełnij go na podstawie pliku `.env.example`.

**Aplikacja obsługuje wiele scenariuszy deployment:**
- 🏠 All-in-one (wszystko na localhost)
- 🔀 Distributed (frontend/backend osobno od serwisów)
- ☁️ Cloud/Production (komponenty w chmurze)
- 🔄 Hybrid (dowolna kombinacja)

Zobacz `.env.example` dla szczegółowych przykładów konfiguracji.

### 3. Uruchomienie Bazy Danych (Supabase)

Postępuj zgodnie z instrukcjami Supabase, aby uruchomić lokalną instancję bazy danych.

```bash
supabase start
```

### 4. Uruchomienie Backendu

```bash
# Przejdź do katalogu backendu
cd backend

# Zainstaluj zależności
pip install -r requirements.txt

# Uruchom serwer
uvicorn main:app --reload
```

Serwer backendu będzie dostępny pod adresem `http://localhost:8000`.

### 5. Uruchomienie Frontendu

```bash
# Wróć do głównego katalogu i zainstaluj zależności
npm install

# Uruchom serwer deweloperski (Astro)
npm run dev
```

Aplikacja będzie dostępna pod adresem `http://localhost:4321`.