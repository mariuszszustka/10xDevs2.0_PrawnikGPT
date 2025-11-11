# PRD: Aplikacja "Asystent Prawnika"

## 1. Wizja produktu

Stworzenie inteligentnego asystenta dla prawników, który będzie odpowiadał na pytania dotyczące polskiego systemu prawnego w oparciu o publicznie dostępne dane z Internetowego Systemu Aktów Prawnych (ISAP). Aplikacja ma na celu przyspieszenie analizy prawnej poprzez dostarczanie precyzyjnych informacji o aktach prawnych, ich treści oraz wzajemnych powiązaniach.

## 2. Architektura systemu

System będzie składał się z następujących komponentów:

1.  **Data Ingestion (Pozyskiwanie danych):**
    *   **Źródło danych:** Publiczne API ELI/ISAP (`https://api.sejm.gov.pl/eli`).
    *   **Narzędzie:** `Crawl4AI` do orkiestracji procesu pobierania i przetwarzania danych.
    *   **Proces:** Skrypt w Crawl4AI będzie iteracyjnie pobierał akty prawne, ich metadane oraz relacje, a następnie zapisywał je w ustrukturyzowanej formie.

2.  **Baza danych (Magazyn wiedzy):**
    *   **System:** `Supabase` (PostgreSQL z wektorami `pgvector`).
    *   **Model danych:**
        *   Tabela `legal_acts` do przechowywania metadanych każdego aktu prawnego (tytuł, daty, status, organ wydający itp.).
        *   Tabela `legal_act_relations` do modelowania grafu powiązań między aktami (np. zmienia, uchyla, wykonuje).
        *   Tabela `legal_act_chunks` do przechowywania podzielonego na mniejsze części tekstu aktów prawnych wraz z ich wektorowymi reprezentacjami (embeddings).

3.  **Backend (API aplikacji):**
    *   **Framework:** FastAPI (Python).
    *   **Funkcjonalności:**
        *   Endpoint `/chat` przyjmujący zapytanie od użytkownika.
        *   Logika RAG (Retrieval-Augmented Generation):
            1.  Konwersja zapytania na wektor (embedding).
            2.  Wyszukiwanie w Supabase (w tabeli `legal_act_chunks`) najbardziej relewantnych fragmentów aktów prawnych.
            3.  Pobranie powiązanych metadanych i relacji z tabel `legal_acts` i `legal_act_relations`.
            4.  Skonstruowanie precyzyjnego promptu dla LLM, zawierającego zapytanie użytkownika oraz pobrany kontekst.
            5.  Wysłanie promptu do modelu językowego.
        *   Streaming odpowiedzi z LLM do frontendu.

4.  **Model Językowy (LLM):**
    *   **System:** `OLLAMA` na lokalnym serwerze.
    *   **Model generatywny:** `gpt-oss:120b` (lub `gpt-oss:latest`) do generowania odpowiedzi.
    *   **Model do embeddingów:** Dedykowany model do tworzenia wektorowych reprezentacji tekstu, np. `nomic-embed-text` lub `mxbai-embed-large`. Jest to kluczowy element systemu RAG.

5.  **Frontend:**
    *   **Framework:** React (Next.js) lub Streamlit (dla szybkiego prototypowania).
    *   **Interfejs:** Prosty interfejs czatowy, gdzie użytkownik może zadawać pytania w języku naturalnym.

## 3. Proces pozyskiwania danych (Data Ingestion)

1.  **Inicjalizacja:** Zaczniemy od pobrania listy aktów prawnych z wybranego okresu (np. ostatnie 5 lat).
2.  **Crawling:** Dla każdego aktu:
    *   Pobierz pełne metadane z endpointu `/acts/{publisher}/{year}/{position}`.
    *   Pobierz treść aktu (preferowany format to HTML, jeśli dostępny, w przeciwnym razie PDF, który będziemy musieli sparsować).
    *   Pobierz wszystkie relacje z endpointu `/acts/{publisher}/{year}/{position}/references`.
3.  **Przetwarzanie i zapis:**
    *   **Metadane:** Zapisz w tabeli `legal_acts`.
    *   **Relacje:** Zapisz w tabeli `legal_act_relations`.
    *   **Treść:**
        *   Podziel tekst na logiczne fragmenty (np. per artykuł, paragraf).
        *   Dla każdego fragmentu wygeneruj embedding za pomocą modelu z OLLAMA (np. `nomic-embed-text`).
        *   Zapisz fragment, jego embedding i odniesienie do aktu w tabeli `legal_act_chunks`.
4.  **Automatyzacja:** Skrypt będzie można uruchamiać cyklicznie, aby aktualizować bazę o nowe akty prawne.

## 4. Stack technologiczny

*   **Język programowania:** Python
*   **Orkiestracja danych:** Crawl4AI
*   **Baza danych:** Supabase (PostgreSQL + pgvector)
*   **Backend API:** FastAPI
*   **LLM:** OLLAMA
*   **Frontend:** Streamlit (do prototypu), Next.js (dla wersji produkcyjnej)
## 5. MVP (Minimum Viable Product) - Szczegółowa specyfikacja

### A. Główny problem i cel

*   **Problem:** Czasochłonne, manualne przeszukiwanie i analiza aktów prawnych przez prawników.
*   **Cel MVP:** Walidacja zapotrzebowania rynkowego na inteligentnego asystenta prawnego poprzez dostarczenie funkcjonalnego narzędzia, które skraca czas wyszukiwania informacji w ograniczonej bazie aktów prawnych.

### B. Zakres funkcjonalny MVP

#### B.1. Uwierzytelnianie Użytkowników
*   **Funkcjonalność:** Rejestracja i logowanie za pomocą emaila i hasła.
*   **Technologia:** Wbudowane mechanizmy Supabase Auth.

#### B.2. Główna funkcja biznesowa: Czat RAG
*   **Logika dwuetapowa:**
    1.  **Szybka odpowiedź (domyślna):** Użytkownik zadaje pytanie. System przy użyciu mniejszego modelu LLM (np. 7B/13B) generuje odpowiedź w czasie poniżej 15 sekund.
    2.  **Odpowiedź dokładna (opcjonalna):** Pod szybką odpowiedzią znajduje się przycisk "Uzyskaj dokładniejszą odpowiedź". Po jego kliknięciu, system używa większego modelu (`gpt-oss:120b`) do wygenerowania bardziej szczegółowej odpowiedzi. Proces ten ma timeout 240 sekund.
*   **Kontekst i źródła:** Obie odpowiedzi są generowane w oparciu o fragmenty tekstu znalezione w bazie wektorowej. Odpowiedzi zawierają klikalne linki do źródeł (tytuł aktu i numer artykułu).
*   **Interfejs:**
    *   Prosty interfejs czatowy.
    *   Wskaźnik ładowania podczas generowania odpowiedzi (interfejs pozostaje aktywny).
    *   Jednorazowy komunikat powitalny wyjaśniający zakres i ograniczenia MVP.
    *   Przyjazne komunikaty o błędach (np. przy timeout'cie).

#### B.3. Funkcja CRUD: Historia i Oceny
*   **Historia zapytań:**
    *   Automatyczny zapis każdego zapytania.
    *   W historii przechowywane są obie odpowiedzi (`fast_response` i `detailed_response`), jeśli użytkownik skorzystał z opcji.
    *   Użytkownik może przeglądać swoją historię (chronologiczna, nieprzeszukiwalna lista) i usuwać z niej wpisy.
*   **Oceny odpowiedzi:**
    *   Przy każdej odpowiedzi (szybkiej i dokładnej) znajdują się przyciski "kciuk w górę" / "kciuk w dół".
    *   Oceny są zapisywane w dedykowanej tabeli w celu analizy jakości modeli.

#### B.4. Testowanie i CI/CD
*   **Testy jednostkowe:** Scenariusze testowe dla kluczowej logiki backendu, w tym test sprawdzający, czy system poprawnie kieruje zapytania do odpowiednich modeli (mniejszego i większego).
*   **CI/CD:** Prosty workflow na GitHub Actions automatycznie uruchamiający testy po każdym pushu.

### C. Zakres danych MVP
*   **Źródło:** 20 000 najnowszych ustaw z API ISAP.
*   **Proces:** Jednorazowa, pełna ingestia danych (crawlowanie, generowanie embeddingów, zapis do bazy) przed udostępnieniem aplikacji użytkownikom.
*   **Aktualizacje:** Zbiór danych w MVP jest statyczny.

### D. Co NIE wchodzi w zakres MVP
*   Pełna baza wszystkich aktów prawnych z ISAP.
*   Zaawansowane rozumienie i interpretacja relacji między aktami.
*   Panel administracyjny do zarządzania użytkownikami.
*   Płatności i subskrypcje.
*   Przeszukiwalna historia zapytań.
*   Testy End-to-End (E2E).

### E. Architektura i Stack Technologiczny
*   **Język:** Python
*   **Baza danych:** Supabase (PostgreSQL + pgvector)
*   **Backend:** FastAPI
*   **LLM:** OLLAMA (zarządzanie dwoma modelami)
*   **Frontend:** Streamlit (dla szybkiego prototypu) lub Next.js
*   **Orkiestracja RAG:** `langchain` lub `llama-index`
*   **Crawling:** `Crawl4AI`

### F. Strategia wdrożenia MVP
1.  **Etap 1:** Implementacja kompletnego przepływu (logowanie, czat, historia, oceny) z wykorzystaniem **tylko mniejszego modelu LLM**.
2.  **Etap 2:** Po ustabilizowaniu Etapu 1, dodanie funkcjonalności "Uzyskaj dokładniejszą odpowiedź" i integracja z większym modelem LLM.

### G. Kryteria sukcesu MVP
*   **Funkcjonalne:** Użytkownik może się zalogować, zadać pytanie i otrzymać szybką odpowiedź w <15s. Opcja "Lepsza odpowiedź" działa i zwraca wynik w <240s.
*   **Techniczne:** Proces CI/CD działa. Aplikacja jest stabilna. Zużycie zasobów serwera jest monitorowane i mieści się w granicach możliwości sprzętowych.
*   **Biznesowe:** Zebrano dane z ocen (feedback) od co najmniej 20 unikalnych użytkowników, co pozwoli na wstępną ocenę zapotrzebowania rynkowego.
