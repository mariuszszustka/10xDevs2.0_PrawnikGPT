# Dokument wymagań produktu (PRD) - PrawnikGPT (MVP)

## 1. Przegląd produktu
PrawnikGPT to aplikacja typu MVP (Minimum Viable Product) mająca na celu wsparcie prawników i aplikantów w ich codziennej pracy poprzez dostarczenie inteligentnego asystenta do analizy aktów prawnych. Aplikacja wykorzystuje model językowy i technikę RAG (Retrieval-Augmented Generation) do odpowiadania na pytania zadawane w języku naturalnym. Użytkownicy mogą zadawać pytania dotyczące treści aktów prawnych i otrzymywać precyzyjne odpowiedzi wraz z odnośnikami do źródeł. MVP skupia się na walidacji rynkowego zapotrzebowania na tego typu narzędzie, oferując podstawowe funkcjonalności w minimalistycznym interfejsie.

## 2. Problem użytkownika
Prawnicy i aplikanci spędzają znaczną ilość czasu na manualnym przeszukiwaniu aktów prawnych, analizowaniu ich wzajemnych powiązań oraz szukaniu konkretnych przepisów. Obecne narzędzia często nie pozwalają na zadawanie pytań w języku naturalnym i nie dostarczają odpowiedzi w kontekście powiązanych dokumentów. Proces ten jest czasochłonny, nieefektywny i podatny na błędy.

## 3. Wymagania funkcjonalne
### 3.1. Uwierzytelnianie
- Użytkownicy mogą tworzyć konto za pomocą adresu e-mail i hasła.
- Użytkownicy mogą logować się na swoje konto.
- Proces rejestracji nie wymaga weryfikacji adresu e-mail w celu minimalizacji barier wejścia.
- Sesja użytkownika jest zarządzana za pomocą tokenów JWT, które są przechowywane po stronie klienta i dołączane do każdego zapytania do backendu.

### 3.2. Interfejs Czatowy i Mechanizm RAG
- Aplikacja udostępnia interfejs czatowy do zadawania pytań.
- System wykorzystuje dwupoziomowy mechanizm odpowiedzi:
  - Szybka odpowiedź (<15s) generowana przez mniejszy model językowy.
  - Opcjonalna "dokładniejsza odpowiedź" generowana przez większy model (120B) na żądanie użytkownika, z limitem czasu przetwarzania 240 sekund.
- Zapytania szybkie i dokładne są obsługiwane przez oddzielne, asynchroniczne kolejki, aby nie blokować interfejsu.
- Kontekst z wyszukiwania RAG jest buforowany na 5 minut, aby mógł być ponownie użyty przy żądaniu dokładniejszej odpowiedzi.
- Odpowiedzi zawierają klikalne linki do źródeł (tytuł aktu, numer artykułu).
- Aplikacja informuje użytkownika, jeśli jego zapytanie dotyczy dokumentu spoza bazy danych MVP.
- Aplikacja wyświetla przyjazne komunikaty o błędach.

### 3.3. Historia Zapytań
- Aplikacja automatycznie zapisuje wszystkie zapytania i wygenerowane odpowiedzi.
- Użytkownik ma dostęp do chronologicznej listy swojej historii zapytań.
- Historia przechowuje obie wersje odpowiedzi (szybką i dokładną), jeśli użytkownik skorzystał z tej opcji.
- Użytkownik może usunąć wybrane pozycje ze swojej historii. Usunięcie zapytania powoduje kaskadowe usunięcie powiązanych z nim ocen.

### 3.4. Mechanizm Oceny Odpowiedzi
- Każda wygenerowana odpowiedź (zarówno szybka, jak i dokładna) posiada przyciski oceny "kciuk w górę" i "kciuk w dół".
- Oceny są zapisywane w bazie danych z informacją o tym, który model wygenerował odpowiedź.

### 3.5. Onboarding Użytkownika
- Nowi użytkownicy po pierwszym zalogowaniu widzą komunikat powitalny wyjaśniający zakres i ograniczenia MVP.
- Interfejs w stanie pustym (przed zadaniem pierwszego pytania) wyświetla 3-4 klikalne, przykładowe pytania, aby zachęcić do interakcji.

### 3.6. Baza Danych
- Baza danych MVP zawiera 20 000 najnowszych ustaw.
- Zbiór danych jest statyczny. Proces aktualizacji nie wchodzi w zakres MVP.

### 3.7. Testowanie i CI/CD
- Zostaną stworzone testy jednostkowe dla kluczowej logiki biznesowej (np. formatowanie promptu, kierowanie zapytań do modeli).
- Testy będą wykorzystywać mockowanie Supabase SDK.
- Prosty workflow CI/CD na GitHub Actions będzie automatycznie uruchamiał testy po każdym pushu.

## 4. Granice produktu
Następujące elementy są świadomie wyłączone z zakresu MVP:
- Pełne zasilenie bazy danych wszystkimi aktami prawnymi z ISAP.
- Zaawansowane rozumienie i interpretacja złożonych relacji między aktami.
- Panel administracyjny do zarządzania użytkownikami.
- Funkcjonalności związane z płatnościami i subskrypcjami.
- Rozbudowany, skomplikowany interfejs użytkownika.
- Testy End-to-End (E2E).
- Mechanizm automatycznej aktualizacji bazy aktów prawnych.

## 5. Historyjki użytkowników

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc utworzyć konto w aplikacji za pomocą mojego adresu e-mail i hasła, aby uzyskać dostęp do jej funkcjonalności.
- Kryteria akceptacji:
  - Po podaniu prawidłowego adresu e-mail i hasła, konto zostaje utworzone w systemie Supabase Auth.
  - Użytkownik jest automatycznie zalogowany po pomyślnej rejestracji.
  - Proces nie wymaga potwierdzenia adresu e-mail.
  - W przypadku błędu (np. zajęty e-mail) użytkownik widzi stosowny komunikat.

- ID: US-002
- Tytuł: Logowanie do aplikacji
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na swoje konto, aby kontynuować pracę z aplikacją.
- Kryteria akceptacji:
  - Po podaniu prawidłowego e-maila i hasła, użytkownik zostaje zalogowany.
  - Token sesji (JWT) jest zapisywany w przeglądarce.
  - W przypadku błędnych danych logowania, użytkownik widzi stosowny komunikat.

- ID: US-003
- Tytuł: Zadawanie pytania w języku naturalnym
- Opis: Jako zalogowany użytkownik, chcę móc wpisać pytanie dotyczące aktu prawnego w polu czatu i wysłać je do systemu.
- Kryteria akceptacji:
  - Interfejs zawiera pole tekstowe do wprowadzania zapytań.
  - Użytkownik może wysłać zapytanie za pomocą przycisku lub klawisza Enter.
  - Po wysłaniu zapytania interfejs nie jest blokowany, a użytkownik może wpisać kolejne pytanie.
  - Wysłane zapytanie pojawia się w oknie czatu.

- ID: US-004
- Tytuł: Otrzymywanie szybkiej odpowiedzi
- Opis: Jako użytkownik, po zadaniu pytania chcę otrzymać szybką i trafną odpowiedź, aby sprawnie kontynuować moją pracę.
- Kryteria akceptacji:
  - Odpowiedź jest generowana w czasie poniżej 15 sekund.
  - Odpowiedź zawiera treść wygenerowaną przez LLM oraz klikalny link do źródła (tytuł aktu i numer artykułu).
  - Pod odpowiedzią widoczne są przyciski do oceny ("kciuk w górę"/"kciuk w dół").
  - Pod odpowiedzią widoczny jest przycisk "Uzyskaj dokładniejszą odpowiedź".

- ID: US-005
- Tytuł: Żądanie dokładniejszej odpowiedzi
- Opis: Jako użytkownik, jeśli szybka odpowiedź jest niewystarczająca, chcę mieć możliwość uzyskania bardziej szczegółowej odpowiedzi.
- Kryteria akceptacji:
  - Po kliknięciu przycisku "Uzyskaj dokładniejszą odpowiedź", przycisk zmienia się we wskaźnik ładowania.
  - Zapytanie jest kierowane do większego modelu językowego.
  - Nowa, dokładniejsza odpowiedź pojawia się pod starą odpowiedzią, z wyraźnym oznaczeniem, że pochodzi z innego modelu.
  - Jeśli generowanie trwa dłużej niż 240 sekund, użytkownik otrzymuje komunikat o błędzie.
  - Dokładniejsza odpowiedź również posiada przyciski do oceny.

- ID: US-006
- Tytuł: Przeglądanie historii zapytań
- Opis: Jako użytkownik, chcę mieć dostęp do listy moich poprzednich zapytań i odpowiedzi, aby móc do nich wrócić.
- Kryteria akceptacji:
  - W interfejsie dostępna jest sekcja "Historia".
  - Historia wyświetla listę zapytań w porządku chronologicznym (od najnowszych).
  - Domyślnie widoczna jest szybka odpowiedź z ikoną informującą o istnieniu wersji dokładnej (jeśli istnieje).
  - Użytkownik może rozwinąć wpis, aby zobaczyć obie odpowiedzi.

- ID: US-007
- Tytuł: Usuwanie zapytania z historii
- Opis: Jako użytkownik, chcę móc usunąć wybrane pozycje z mojej historii zapytań, aby zachować porządek.
- Kryteria akceptacji:
  - Każdy wpis w historii ma opcję usunięcia.
  - Po potwierdzeniu, wpis jest trwale usuwany z historii użytkownika.
  - Usunięcie zapytania powoduje również usunięcie powiązanych z nim ocen z bazy danych.

- ID: US-008
- Tytuł: Udzielanie informacji zwrotnej na temat odpowiedzi
- Opis: Jako użytkownik, chcę móc ocenić każdą odpowiedź, aby pomóc w ulepszaniu systemu.
- Kryteria akceptacji:
  - Kliknięcie przycisku "kciuk w górę" lub "kciuk w dół" zapisuje ocenę w bazie danych.
  - Po oddaniu głosu, przycisk zmienia swój stan wizualny, a druga opcja jest blokowana.
  - Ocena jest powiązana z konkretną odpowiedzią i użytym modelem.

- ID: US-009
- Tytuł: Obsługa zapytań o akty spoza bazy
- Opis: Jako użytkownik, zadając pytanie o akt prawny, którego nie ma w bazie, chcę otrzymać jasną informację o ograniczeniach systemu.
- Kryteria akceptacji:
  - Jeśli system RAG nie znajdzie relewantnych fragmentów, aplikacja nie próbuje generować odpowiedzi na siłę.
  - Użytkownik otrzymuje predefiniowany komunikat, np. "Przepraszam, moja baza wiedzy jest na razie ograniczona i nie zawiera tego aktu."

- ID: US-010
- Tytuł: Onboarding nowego użytkownika
- Opis: Jako nowy użytkownik, po pierwszym zalogowaniu chcę zrozumieć, co aplikacja potrafi i jak z niej korzystać.
- Kryteria akceptacji:
  - Przy pierwszym logowaniu użytkownik widzi komunikat powitalny wyjaśniający zakres MVP.
  - Jeśli historia jest pusta, w głównym oknie czatu wyświetlane są 3-4 klikalne przykłady pytań.
  - Kliknięcie przykładowego pytania automatycznie wysyła je do systemu.

## 6. Metryki sukcesu
Sukces MVP będzie mierzony za pomocą następujących wskaźników, które mają na celu walidację zapotrzebowania rynkowego:
- Wydajność: Czas generowania szybkiej odpowiedzi utrzymany poniżej 15 sekund.
- Adopcja: Osiągnięcie ponad 100 zarejestrowanych użytkowników w pierwszym miesiącu po uruchomieniu.
- Zaangażowanie: Średnia liczba zapytań na aktywnego użytkownika przekraczająca 5.
- Jakość: Stosunek ocen pozytywnych ("kciuk w górę") do wszystkich oddanych ocen przekraczający 70%.
