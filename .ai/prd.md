# Dokument wymagań produktu (PRD) – PrawnikGPT

## 1. Przegląd produktu

PrawnikGPT to aplikacja typu MVP (Minimum Viable Product) mająca na celu wsparcie prawników i aplikantów w ich codziennej pracy poprzez dostarczenie inteligentnego asystenta do analizy aktów prawnych. Aplikacja wykorzystuje model językowy i technikę RAG (Retrieval-Augmented Generation) do odpowiadania na pytania zadawane w języku naturalnym. Użytkownicy mogą zadawać pytania dotyczące treści aktów prawnych i otrzymywać precyzyjne odpowiedzi wraz z odnośnikami do źródeł. MVP skupia się na walidacji rynkowego zapotrzebowania na tego typu narzędzie, oferując podstawowe funkcjonalności w minimalistycznym interfejsie.

**Kluczowa innowacja:** Dwupoziomowy system odpowiedzi – szybka odpowiedź (<15s) z mniejszego modelu oraz opcjonalna dokładna odpowiedź (do 240s) z większego modelu 120B, wszystko oparte na wyszukiwaniu semantycznym w bazie 20 000 najnowszych polskich ustaw.

## 2. Problem użytkownika

Prawnicy i aplikanci spędzają znaczną ilość czasu na manualnym przeszukiwaniu aktów prawnych, analizowaniu ich wzajemnych powiązań oraz szukaniu konkretnych przepisów. Obecne narzędzia często nie pozwalają na zadawanie pytań w języku naturalnym i nie dostarczają odpowiedzi w kontekście powiązanych dokumentów. Proces ten jest czasochłonny, nieefektywny i podatny na błędy. Brak jest narzędzia, które łączyłoby prostotę wyszukiwania z inteligencją analizy prawnej.

## 3. Wymagania funkcjonalne

### 3.1. Uwierzytelnianie użytkowników
- **Technologia:** Supabase Auth (email/hasło).
- Użytkownicy mogą tworzyć konto za pomocą adresu e-mail i hasła.
- Użytkownicy mogą logować się na swoje konto.
- Proces rejestracji **nie wymaga weryfikacji adresu e-mail** w celu minimalizacji barier wejścia.
- Sesja użytkownika jest zarządzana za pomocą tokenów JWT, które są przechowywane po stronie klienta i dołączane do każdego zapytania do backendu.

### 3.2. Interfejs czatowy i mechanizm RAG

#### Architektura RAG
Aplikacja wykorzystuje zaawansowany system RAG (Retrieval-Augmented Generation) składający się z następujących komponentów:

**Model danych (Supabase/PostgreSQL + pgvector):**
- **`legal_acts`**: Metadane aktów prawnych (tytuł, daty, status, organ wydający, typ aktu).
- **`legal_act_relations`**: Graf powiązań między aktami (modyfikuje, uchyla, wykonuje, implementuje).
- **`legal_act_chunks`**: Fragmenty tekstu aktów z wektorowymi reprezentacjami (embeddings) do wyszukiwania semantycznego.

**Model embeddings:**
- Wykorzystujemy dedykowany model do tworzenia wektorowych reprezentacji tekstu: **nomic-embed-text** lub **mxbai-embed-large**.
- Model działa na serwerze OLLAMA i konwertuje zapytania użytkownika oraz fragmenty aktów prawnych na wektory numeryczne.
- Embeddingi umożliwiają wyszukiwanie semantyczne – system znajduje fragmenty aktów prawnych, które są *tematycznie* podobne do zapytania, nawet jeśli nie zawierają tych samych słów kluczowych.
- Embeddingi są generowane podczas ingecji danych i przechowywane w kolumnie wektorowej w tabeli `legal_act_chunks`.

**Przepływ RAG:**
1. Zapytanie użytkownika zostaje przekształcone w embedding za pomocą modelu embeddings.
2. System wyszukuje w bazie `legal_act_chunks` najbardziej podobne fragmenty (similarity search).
3. Dla znalezionych fragmentów pobierane są metadane z `legal_acts` oraz powiązania z `legal_act_relations`.
4. Kontekst (fragmenty + metadane + relacje) jest konstruowany jako prompt dla LLM.
5. Model językowy generuje odpowiedź opartą na dostarczonym kontekście.

#### Dwupoziomowy mechanizm odpowiedzi
- **Szybka odpowiedź** (<15s): Generowana przez mniejszy model językowy (7B-13B parametrów). Domyślna odpowiedź dla każdego zapytania.
- **Dokładna odpowiedź** (timeout 240s): Generowana przez większy model **gpt-oss:120b** na żądanie użytkownika poprzez kliknięcie przycisku "Uzyskaj dokładniejszą odpowiedź".
- Zapytania szybkie i dokładne są obsługiwane przez oddzielne, asynchroniczne kolejki, aby nie blokować interfejsu.
- **Kontekst z wyszukiwania RAG jest buforowany na 5 minut**, aby mógł być ponownie użyty przy żądaniu dokładniejszej odpowiedzi (nie trzeba ponownie przeszukiwać bazy).
- Odpowiedzi zawierają **klikalne linki do źródeł** (tytuł aktu, numer artykułu).

#### Obsługa błędów i edge cases
- Aplikacja informuje użytkownika, jeśli jego zapytanie dotyczy dokumentu spoza bazy danych MVP (np. "Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu").
- Przyjazne komunikaty o błędach (timeout, problemy z połączeniem, błędy LLM).
- Interfejs pozostaje responsywny podczas generowania odpowiedzi (użytkownik może kontynuować interakcję).

### 3.3. Historia zapytań
- Aplikacja automatycznie zapisuje wszystkie zapytania i wygenerowane odpowiedzi.
- Użytkownik ma dostęp do **chronologicznej listy** swojej historii zapytań (od najnowszych).
- Historia przechowuje **obie wersje odpowiedzi** (szybką i dokładną), jeśli użytkownik skorzystał z opcji dokładnej odpowiedzi.
- Domyślnie w liście widoczna jest szybka odpowiedź z **ikoną informującą o istnieniu wersji dokładnej** (jeśli istnieje).
- Użytkownik może **rozwinąć wpis**, aby zobaczyć obie odpowiedzi.
- Użytkownik może **usunąć wybrane pozycje** ze swojej historii. Usunięcie zapytania powoduje **kaskadowe usunięcie powiązanych z nim ocen**.
- Historia nie jest przeszukiwalna w MVP.

### 3.4. Mechanizm oceny odpowiedzi
- Każda wygenerowana odpowiedź (zarówno szybka, jak i dokładna) posiada przyciski oceny **"kciuk w górę"** i **"kciuk w dół"**.
- Po oddaniu głosu, przycisk zmienia swój stan wizualny, a druga opcja jest blokowana.
- Oceny są zapisywane w bazie danych z informacją o tym, **który model wygenerował odpowiedź** (do analizy jakości modeli).
- Ocena jest powiązana z konkretną odpowiedzią i użytkownikiem.

### 3.5. Onboarding użytkownika
- Nowi użytkownicy po pierwszym zalogowaniu widzą **komunikat powitalny** wyjaśniający zakres i ograniczenia MVP.
- Interfejs w stanie pustym (przed zadaniem pierwszego pytania) wyświetla **3-4 klikalne, przykładowe pytania**, aby zachęcić do interakcji (np. "Jakie są podstawowe prawa konsumenta?", "Co to jest przedawnienie w prawie cywilnym?").
- Kliknięcie przykładowego pytania automatycznie wysyła je do systemu.

### 3.6. Baza danych i proces ingecji

#### Źródło danych
- **API:** Publiczne API ELI/ISAP (`https://api.sejm.gov.pl/eli`).
- **Zakres MVP:** 20 000 najnowszych ustaw z ISAP.
- **Zbiór danych jest statyczny** – proces automatycznej aktualizacji nie wchodzi w zakres MVP.

#### Proces pozyskiwania i przetwarzania danych (Data Ingestion)
Jednorazowa, pełna ingestia danych przed udostępnieniem aplikacji użytkownikom:

1. **Pobieranie listy aktów** z wybranego okresu (np. ostatnie 5 lat, aż do uzyskania 20k aktów).
2. **Dla każdego aktu:**
   - Pobierz pełne metadane z endpointu `/acts/{publisher}/{year}/{position}`.
   - Pobierz treść aktu (preferowany format: HTML; PDF jako fallback, wymaga parsowania).
   - Pobierz relacje z endpointu `/acts/{publisher}/{year}/{position}/references`.
3. **Przetwarzanie i zapis:**
   - **Metadane** → zapisz w tabeli `legal_acts`.
   - **Relacje** → zapisz w tabeli `legal_act_relations`.
   - **Treść aktu:**
     - Podziel tekst na logiczne fragmenty (per artykuł lub paragraf).
     - Dla każdego fragmentu wygeneruj embedding za pomocą modelu embeddings z OLLAMA.
     - Zapisz fragment, jego embedding i odniesienie do aktu w tabeli `legal_act_chunks`.
4. **Narzędzie orkiestracji:** **Crawl4AI** do zarządzania procesem pobierania i przetwarzania.

### 3.7. Testowanie i CI/CD
- **Testy jednostkowe** dla kluczowej logiki biznesowej backendu:
  - Formatowanie promptu dla LLM.
  - Kierowanie zapytań do odpowiednich modeli (szybki/dokładny).
  - Obsługa buforowania kontekstu RAG.
- Testy wykorzystują **mockowanie Supabase SDK**.
- Prosty workflow **CI/CD na GitHub Actions** automatycznie uruchamia testy po każdym pushu.
- **Testy End-to-End (E2E) nie wchodzą w zakres MVP.**

## 4. Stack technologiczny

- **Frontend:** Astro 5, React 19, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend:** Python, FastAPI
- **Baza danych:** Supabase (PostgreSQL + pgvector dla embeddingów)
- **Infrastruktura LLM:** OLLAMA (hosting lokalny)
  - **Model szybki:** 7B-13B (np. Llama 2 13B, Mistral 7B)
  - **Model dokładny:** gpt-oss:120b
  - **Model embeddings:** nomic-embed-text lub mxbai-embed-large
- **Orkiestracja RAG:** LangChain lub LlamaIndex
- **Crawling danych:** Crawl4AI
- **CI/CD:** GitHub Actions

## 5. Granice produktu

Następujące elementy są świadomie wyłączone z zakresu MVP:

- Pełne zasilenie bazy danych wszystkimi aktami prawnymi z ISAP (tylko 20k najnowszych ustaw).
- Zaawansowane rozumienie i interpretacja złożonych relacji między aktami (podstawowe powiązania są zapisywane, ale nie ma zaawansowanej analizy grafowej).
- Panel administracyjny do zarządzania użytkownikami.
- Funkcjonalności związane z płatnościami i subskrypcjami.
- Rozbudowany, skomplikowany interfejs użytkownika (skupiamy się na prostocie).
- Przeszukiwalna historia zapytań (tylko chronologiczna lista).
- Testy End-to-End (E2E).
- Mechanizm automatycznej aktualizacji bazy aktów prawnych (zbiór danych jest statyczny).
- Współdzielenie zapytań i odpowiedzi między użytkownikami.
- Eksport wyników do PDF/DOCX.
- Zaawansowane filtrowanie i wyszukiwanie w ramach interfejsu czatu.

## 6. Historyjki użytkowników

### US-001: Rejestracja nowego użytkownika
**Opis:** Jako nowy użytkownik, chcę móc utworzyć konto w aplikacji za pomocą mojego adresu e-mail i hasła, aby uzyskać dostęp do jej funkcjonalności.

**Kryteria akceptacji:**
- Po podaniu prawidłowego adresu e-mail i hasła, konto zostaje utworzone w systemie Supabase Auth.
- Użytkownik jest automatycznie zalogowany po pomyślnej rejestracji.
- Proces nie wymaga potwierdzenia adresu e-mail.
- W przypadku błędu (np. zajęty e-mail) użytkownik widzi stosowny komunikat.
- Hasło musi spełniać politykę złożoności: minimum 12 znaków, w tym małe i duże litery, cyfry oraz znaki specjalne (walidacja po stronie frontendu i backendu).
- Hasło jest hashowane przy użyciu silnego algorytmu (Argon2id lub Bcrypt) z unikalną solą (salt) dla każdego użytkownika przez Supabase Auth.
- Endpoint rejestracji jest objęty mechanizmem Rate Limiting (np. maksymalnie 5 prób rejestracji na 15 minut z jednego adresu IP).
- System nie ujawnia, czy podany email już istnieje w bazie (komunikat ogólny: "Nie można utworzyć konta").

---

### US-002: Logowanie do aplikacji
**Opis:** Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby kontynuować pracę z aplikacją.

**Kryteria akceptacji:**
- Po podaniu prawidłowego e-maila i hasła, użytkownik zostaje zalogowany.
- Token dostępowy (Access Token) JWT ma krótki czas życia (15 minut).
- Token odświeżania (Refresh Token) jest przechowywany wyłącznie w ciasteczku HttpOnly, Secure, SameSite (nie w LocalStorage), aby zapobiec atakom XSS.
- W przypadku błędnych danych logowania, użytkownik widzi ogólny komunikat: "Błędny login lub hasło" (system nie ujawnia, czy email istnieje w bazie).
- Endpoint logowania jest objęty mechanizmem Rate Limiting: po 5 nieudanych próbach logowanie jest blokowane na 15 minut (ochrona przed atakami Brute Force).
- Jeśli użytkownik ma włączone uwierzytelnianie dwuskładnikowe (MFA), po podaniu hasła system wymaga podania 6-cyfrowego kodu TOTP.
- Wylogowanie unieważnia token odświeżania po stronie serwera (czarna lista lub usunięcie z bazy sesji).

---

### US-003: Zadawanie pytania w języku naturalnym
**Opis:** Jako zalogowany użytkownik, chcę móc wpisać pytanie dotyczące aktu prawnego w polu czatu i wysłać je do systemu.

**Kryteria akceptacji:**
- Interfejs zawiera pole tekstowe do wprowadzania zapytań.
- Użytkownik może wysłać zapytanie za pomocą przycisku lub klawisza Enter.
- Po wysłaniu zapytania interfejs nie jest blokowany, a użytkownik może wpisać kolejne pytanie.
- Wysłane zapytanie pojawia się w oknie czatu.

---

### US-004: Otrzymywanie szybkiej odpowiedzi
**Opis:** Jako użytkownik, po zadaniu pytania chcę otrzymać szybką i trafną odpowiedź, aby sprawnie kontynuować moją pracę.

**Kryteria akceptacji:**
- Odpowiedź jest generowana w czasie poniżej 15 sekund.
- Odpowiedź zawiera treść wygenerowaną przez LLM oraz klikalny link do źródła (tytuł aktu i numer artykułu).
- Pod odpowiedzią widoczne są przyciski do oceny ("kciuk w górę"/"kciuk w dół").
- Pod odpowiedzią widoczny jest przycisk "Uzyskaj dokładniejszą odpowiedź".

**Wymagania Niefunkcjonalne (Bezpieczeństwo):**
- Endpoint API do generowania odpowiedzi wymaga walidacji JWT tokenu (tylko zalogowani użytkownicy).
- Zapytania użytkownika są sanityzowane przed wysłaniem do LLM (ochrona przed injection attacks).
- Endpoint jest objęty mechanizmem Rate Limiting (np. maksymalnie 10 zapytań na minutę na użytkownika, 30 zapytań na minutę na adres IP).
- Szczegółowe wymagania bezpieczeństwa dotyczące uwierzytelniania, haseł, sesji i MFA znajdują się w sekcji 9.2 "Wymagania bezpieczeństwa".

---

### US-005: Żądanie dokładniejszej odpowiedzi
**Opis:** Jako użytkownik, jeśli szybka odpowiedź jest niewystarczająca, chcę mieć możliwość uzyskania bardziej szczegółowej odpowiedzi.

**Kryteria akceptacji:**
- Po kliknięciu przycisku "Uzyskaj dokładniejszą odpowiedź", przycisk zmienia się we wskaźnik ładowania.
- Zapytanie jest kierowane do większego modelu językowego (gpt-oss:120b).
- Nowa, dokładniejsza odpowiedź pojawia się pod starą odpowiedzią, z wyraźnym oznaczeniem, że pochodzi z innego modelu.
- Jeśli generowanie trwa dłużej niż 240 sekund, użytkownik otrzymuje komunikat o błędzie z możliwością ponowienia próby.
- Dokładniejsza odpowiedź również posiada przyciski do oceny.

---

### US-006: Przeglądanie historii zapytań
**Opis:** Jako użytkownik, chcę mieć dostęp do listy moich poprzednich zapytań i odpowiedzi, aby móc do nich wrócić.

**Kryteria akceptacji:**
- W interfejsie dostępna jest sekcja "Historia".
- Historia wyświetla listę zapytań w porządku chronologicznym (od najnowszych).
- Domyślnie widoczna jest szybka odpowiedź z ikoną informującą o istnieniu wersji dokładnej (jeśli istnieje).
- Użytkownik może rozwinąć wpis, aby zobaczyć obie odpowiedzi.

---

### US-007: Usuwanie zapytania z historii
**Opis:** Jako użytkownik, chcę móc usunąć wybrane pozycje z mojej historii zapytań, aby zachować porządek.

**Kryteria akceptacji:**
- Każdy wpis w historii ma opcję usunięcia (np. ikona kosza).
- Po potwierdzeniu, wpis jest trwale usuwany z historii użytkownika.
- Usunięcie zapytania powoduje również usunięcie powiązanych z nim ocen z bazy danych (kaskadowe usuwanie).

---

### US-008: Udzielanie informacji zwrotnej na temat odpowiedzi
**Opis:** Jako użytkownik, chcę móc ocenić każdą odpowiedź, aby pomóc w ulepszaniu systemu.

**Kryteria akceptacji:**
- Kliknięcie przycisku "kciuk w górę" lub "kciuk w dół" zapisuje ocenę w bazie danych.
- Po oddaniu głosu, przycisk zmienia swój stan wizualny, a druga opcja jest blokowana.
- Ocena jest powiązana z konkretną odpowiedzią i użytym modelem (szybki/dokładny).
- Użytkownik może zobaczyć, że jego ocena została zapisana (zmiana koloru lub checkmark).

---

### US-009: Obsługa zapytań o akty spoza bazy
**Opis:** Jako użytkownik, zadając pytanie o akt prawny, którego nie ma w bazie, chcę otrzymać jasną informację o ograniczeniach systemu.

**Kryteria akceptacji:**
- Jeśli system RAG nie znajdzie relewantnych fragmentów (similarity score poniżej progu), aplikacja nie próbuje generować odpowiedzi na siłę.
- Użytkownik otrzymuje predefiniowany komunikat, np. "Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu. Aktualnie dysponuję informacjami o 20 000 najnowszych ustaw."

---

### US-010: Onboarding nowego użytkownika
**Opis:** Jako nowy użytkownik, po pierwszym zalogowaniu chcę zrozumieć, co aplikacja potrafi i jak z niej korzystać.

**Kryteria akceptacji:**
- Przy pierwszym logowaniu użytkownik widzi komunikat powitalny wyjaśniający zakres MVP (np. "Witaj w PrawnikGPT! Jestem twoim asystentem prawnym. Mogę odpowiadać na pytania dotyczące 20 000 najnowszych polskich ustaw. Zadaj pytanie lub wybierz jeden z przykładów poniżej.").
- Jeśli historia jest pusta, w głównym oknie czatu wyświetlane są 3-4 klikalne przykłady pytań.
- Kliknięcie przykładowego pytania automatycznie wysyła je do systemu.

## 7. Strategia wdrożenia MVP

Aby zminimalizować ryzyko techniczne i skrócić czas do pierwszej wersji funkcjonalnej, implementacja zostanie podzielona na dwa etapy:

### Etap 1: Przepływ z pojedynczym modelem
- Implementacja kompletnego przepływu użytkownika: logowanie, czat, historia, oceny.
- **Wyłącznie mniejszy model LLM** (7B-13B) do generowania wszystkich odpowiedzi.
- Cel: Stabilizacja infrastruktury RAG, frontendu, backendu i bazy danych.

### Etap 2: Integracja większego modelu
- Dodanie funkcjonalności "Uzyskaj dokładniejszą odpowiedź".
- Integracja z modelem gpt-oss:120b.
- Implementacja buforowania kontekstu RAG (5 minut).
- Implementacja timeoutu 240s dla dokładnych odpowiedzi.
- Testy obciążeniowe dla większego modelu.

## 8. Metryki sukcesu

Sukces MVP będzie mierzony za pomocą następujących wskaźników, które mają na celu walidację zapotrzebowania rynkowego:

### Metryki wydajności
- **Czas generowania szybkiej odpowiedzi:** Utrzymany poniżej 15 sekund w 95% przypadków.
- **Czas generowania dokładnej odpowiedzi:** Poniżej 240 sekund (timeout).

### Metryki adopcji i zaangażowania
- **Liczba zarejestrowanych użytkowników:** >100 użytkowników w pierwszym miesiącu po uruchomieniu.
- **Średnia liczba zapytań na aktywnego użytkownika:** >5 zapytań/użytkownik.
- **Retention:** >30% użytkowników wraca do aplikacji w ciągu tygodnia od pierwszego użycia.

### Metryki jakości
- **Stosunek ocen pozytywnych ("kciuk w górę") do wszystkich oddanych ocen:** >70%.
- **Porównanie jakości:** Odsetek pozytywnych ocen dla dokładnych odpowiedzi vs. szybkich odpowiedzi (do analizy, czy użytkownicy rzeczywiście preferują dokładniejsze odpowiedzi).

### Metryki użycia funkcji
- **Odsetek zapytań, dla których użytkownik żąda dokładniejszej odpowiedzi:** Oczekiwany: 20-40% (wskazuje, że szybka odpowiedź jest często niewystarczająca, ale nie zawsze).
- **Odsetek zapytań, które nie znajdują odpowiedzi w bazie:** Powinien być <10% (wskazuje, że 20k ustaw pokrywa większość potrzeb użytkowników).

### Metryki techniczne
- **Uptime backendu:** >99%.
- **Odsetek zapytań zakończonych błędem:** <5%.
- **Odsetek timeoutów dla dokładnych odpowiedzi:** <10%.

## 9. Wymagania prawne i bezpieczeństwo

### 9.1. Wymagania prawne
- **RODO:** Dane osobowe użytkowników (email, hasło) przechowywane zgodnie z RODO.
- **Prawo do usunięcia danych:** Użytkownik może usunąć swoje konto wraz z całą historią zapytań i ocenami.

### 9.2. Wymagania bezpieczeństwa

#### 9.2.1. Hashowanie i przechowywanie haseł
- **Hasła NIE MOGĄ być przechowywane w formie tekstu jawnego.**
- Wymagane jest użycie silnego algorytmu haszującego (Argon2id lub Bcrypt) z unikalną solą (salt) dla każdego użytkownika.
- Implementacja odbywa się przez Supabase Auth, który domyślnie używa Bcrypt.
- Hasło musi spełniać politykę złożoności: minimum 12 znaków, w tym małe i duże litery, cyfry oraz znaki specjalne (walidacja po stronie frontendu i backendu).

#### 9.2.2. Obsługa sesji i tokenów JWT
- Uwierzytelnianie oparte jest o stateless JWT (JSON Web Token).
- Token dostępowy (Access Token) ma krótki czas życia (15 minut).
- Token odświeżania (Refresh Token) jest przechowywany wyłącznie w ciasteczku HttpOnly, Secure, SameSite (nie w LocalStorage!), aby zapobiec atakom XSS.
- Wylogowanie musi unieważniać token odświeżania po stronie serwera (czarna lista lub usunięcie z bazy sesji).
- Supabase Auth domyślnie obsługuje te mechanizmy, ale wymagane jest skonfigurowanie odpowiednich flag dla ciasteczek.

#### 9.2.3. Uwierzytelnianie wieloetapowe (MFA/2FA)
- System musi umożliwiać włączenie uwierzytelniania dwuskładnikowego (2FA/MFA).
- Obsługiwana metoda to TOTP (Time-based One-Time Password), np. Google Authenticator / Authy.
- Przy logowaniu, jeśli MFA jest włączone, system po podaniu hasła wymaga podania 6-cyfrowego kodu.
- Wymagane jest wygenerowanie kodów zapasowych (backup codes) przy aktywacji MFA.
- Kody zapasowe muszą być wyświetlane użytkownikowi tylko raz podczas aktywacji i zapisane w bezpieczny sposób (haszowane w bazie danych).

#### 9.2.4. Zabezpieczenie przed popularnymi atakami
- **Rate Limiting:**
  - Endpointy logowania i rejestracji muszą być objęte mechanizmem Rate Limiting.
  - Po 5 nieudanych próbach logowania, dostęp jest blokowany na 15 minut (ochrona przed Brute Force).
  - Maksymalnie 5 prób rejestracji na 15 minut z jednego adresu IP.
- **CSRF Protection:**
  - Formularze muszą posiadać zabezpieczenie przed atakami CSRF (jeśli dotyczy architektury).
  - Supabase Auth domyślnie obsługuje CSRF protection dla sesji.
- **Sanityzacja danych wejściowych:**
  - Wszystkie dane wejściowe użytkownika muszą być sanityzowane (ochrona przed SQL Injection / XSS).
  - Backend używa parameterized queries (Supabase SDK automatycznie to zapewnia).
  - Frontend używa React, który domyślnie chroni przed XSS poprzez escapowanie.
- **Enumeracja użytkowników:**
  - System nie może zwracać informacji, czy podany email istnieje w bazie przy nieudanym logowaniu/rejestracji.
  - Komunikat ogólny: "Błędny login lub hasło" (logowanie) lub "Nie można utworzyć konta" (rejestracja).
  - Alternatywnie, system może "udawać", że wysłał maila resetującego hasło, nawet jeśli konto nie istnieje (zapobieganie enumeracji).

#### 9.2.5. Mechanizmy odzyskiwania dostępu
- Proces resetowania hasła odbywa się poprzez wysłanie unikalnego, jednorazowego linku z tokenem na adres email.
- Ważność tokenu resetującego hasło: maksymalnie 15-30 minut.
- Zmiana hasła po użyciu linku powoduje automatyczne wylogowanie ze wszystkich innych aktywnych sesji użytkownika.
- Jeśli konto nie istnieje, system "udaje", że wysłał maila (zapobieganie enumeracji użytkowników), lub wysyła informację, że konto nie istnieje (zależnie od polityki prywatności, bezpieczniej jest "udawać").

#### 9.2.6. Autoryzacja i kontrola dostępu
- Tylko zalogowany użytkownik może wyświetlać, edytować i usuwać swoje zapytania.
- Brak współdzielenia danych między użytkownikami.
- Każde zapytanie do API wymaga walidacji JWT tokenu.
- Backend weryfikuje, czy użytkownik ma dostęp do zasobu (np. zapytania) przed wykonaniem operacji.
