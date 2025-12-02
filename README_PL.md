# PrawnikGPT - Inteligentny Asystent Prawny

PrawnikGPT to inteligentny asystent prawny oparty na architekturze RAG (Retrieval-Augmented Generation), zaprojektowany do odpowiadania na pytania dotyczące polskiego prawa. Aplikacja wykorzystuje backend w FastAPI, bazę danych Supabase z rozszerzeniem pgvector do wyszukiwania semantycznego oraz OLLAMA do integracji z Dużymi Modelami Językowymi (LLM).

## ✨ Kluczowe Funkcje

- **Potok RAG**: Dostarcza precyzyjne, świadome kontekstu odpowiedzi na pytania prawne, pobierając relewantne informacje ze zwektoryzowanej bazy aktów prawnych.
- **System Podwójnej Odpowiedzi**: Oferuje zarówno "szybką odpowiedź" przy użyciu mniejszego, szybszego modelu, jak i bardziej szczegółową "dokładną odpowiedź" z większego, potężniejszego modelu.
- **Zarządzanie Zapytaniami**: Użytkownicy mogą przeglądać historię swoich zapytań, widzieć szczegółowe wyniki i zarządzać swoimi danymi.
- **Ocenianie Odpowiedzi**: System feedbacku pozwala użytkownikom oceniać jakość wygenerowanych odpowiedzi (ocena pozytywna/negatywna).
- **Przeglądarka Aktów Prawnych**: Kompleksowy interfejs do przeglądania, wyszukiwania (z wyszukiwaniem pełnotekstowym) i wizualizacji relacji między aktami prawnymi.
- **Bezpieczne Uwierzytelnianie**: Zarządzanie użytkownikami i uwierzytelnianie są bezpiecznie obsługiwane przez Supabase.

## 🛠️ Stos Technologiczny

- **Backend**: Python 3.11+, FastAPI, Uvicorn
- **Baza Danych**: Supabase (PostgreSQL z rozszerzeniem pgvector)
- **LLM i Embeddingi**: OLLAMA (uruchamiająca modele takie jak Mistral, Llama itp.)
- **Cache**: Redis (do cachowania kontekstu RAG)
- **Frontend**: Astro (z TypeScript)
- **Testowanie**: Pytest
- **Jakość Kodu**: Ruff, Prettier, ESLint
- **DevOps**: Docker, Husky (hooki pre-commit)

## 📂 Struktura Projektu

```
/
├── backend/            # Kod źródłowy aplikacji FastAPI
│   ├── db/             # Warstwa dostępu do danych (repozytoria)
│   ├── models/         # Modele Pydantic do walidacji danych
│   ├── routers/        # Definicje endpointów API
│   ├── services/       # Logika biznesowa (potok RAG, usługi LLM)
│   └── tests/          # Testy jednostkowe i integracyjne
├── src/                # Kod źródłowy frontendu Astro
│   ├── lib/            # Klient Supabase, klient API, typy
│   ├── pages/          # Strony/trasy aplikacji
│   └── layouts/        # Layouty Astro
├── supabase/           # Konfiguracja i migracje Supabase
│   └── migrations/     # Migracje schematu bazy danych
├── docs/               # Dokumentacja projektu
├── scripts/            # Skrypty narzędziowe i automatyzacyjne
├── .env.example        # Szablon zmiennych środowiskowych
├── package.json        # Zależności frontendu
└── requirements.txt    # Zależności backendu
```

## 🚀 Uruchomienie Projektu

### Wymagania Wstępne

- Python 3.11+
- Node.js (wersja określona w `.nvmrc`)
- Docker i Docker Compose
- Aktywny projekt Supabase
- OLLAMA zainstalowana i uruchomiona lokalnie

### 1. Sklonuj Repozytorium

```bash
git clone <url-repozytorium>
cd prawnik_v01
```

### 2. Skonfiguruj Zmienne Środowiskowe

Skopiuj przykładowy plik środowiskowy i uzupełnij swoje dane uwierzytelniające dla Supabase, OLLAMA i Redis.

```bash
cp .env.example .env
```

### 3. Konfiguracja Backendu

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Na Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Konfiguracja Frontendu

```bash
# Z głównego katalogu projektu
npm install
```

### 5. Zastosuj Migracje Bazy Danych

Upewnij się, że Twoje Supabase CLI jest skonfigurowane, a następnie zastosuj migracje.

```bash
supabase db push
```

## 🏃 Uruchamianie Aplikacji

### 1. Uruchom Serwer Backendu

```bash
# Z katalogu backend/
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Uruchom Serwer Deweloperski Frontendu

```bash
# Z głównego katalogu projektu
npm run dev
```

Aplikacja powinna być teraz dostępna pod adresem `http://localhost:4321`.

## 🧪 Testowanie

Aby uruchomić testy backendu, wykonaj następującą komendę z katalogu `backend/`:

```bash
pytest
```