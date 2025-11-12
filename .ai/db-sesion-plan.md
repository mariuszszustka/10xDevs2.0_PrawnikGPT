<conversation_summary>

<decisions>

1. **Relacje użytkowników z historią zapytań**: Zaimplementowano relację jeden-do-wielu między `users` a `query_history` z kluczem obcym `user_id` i regułą `ON DELETE CASCADE`, zapewniającą automatyczne usuwanie historii przy usunięciu użytkownika (zgodnie z RODO i US-007).

2. **Modelowanie ocen odpowiedzi**: Tabela `ratings` jest powiązana bezpośrednio z odpowiedzią poprzez `query_history_id` i `response_type` (ENUM 'fast', 'accurate'), umożliwiając jednoznaczne powiązanie oceny z konkretnym modelem i odpowiedzią.

3. **Typy ENUM dla stałych wartości**: Zdefiniowano dedykowane typy ENUM w PostgreSQL dla: `response_type` ('fast', 'accurate'), `rating_value` ('up', 'down'), `relation_type` (modyfikuje, uchyla, implementuje), `status` aktu prawnego, zapewniając integralność danych na poziomie bazy.

4. **Indeks pgvector dla MVP**: Wybrano indeks `IVFFlat` jako kompromis między szybkością budowy a wydajnością zapytań dla bazy 20k aktów. Parametr `lists` dobrany jako pierwiastek kwadratowy z liczby wierszy. HNSW rozważany na przyszłość przy większej bazie.

5. **Polityki RLS**: Zdefiniowano polityki RLS dla `query_history` i `ratings` z regułami SELECT, UPDATE, DELETE opartymi na `user_id = auth.uid()`, oraz INSERT wymuszającym `auth.uid()` jako `user_id`, zapewniając ścisłą izolację danych między użytkownikami.

6. **Cascade dla ocen**: Klucz obcy łączący `ratings` z `query_history` ma opcję `ON DELETE CASCADE`, automatycznie usuwając powiązane oceny przy usunięciu zapytania (zgodnie z US-007).

7. **Relacje między aktami**: Przechowywanie jednej krotki na relację `(source_act_id, target_act_id, relation_type)` zamiast relacji dwukierunkowych, oszczędzając miejsce i upraszczając logikę zapisu.

8. **Partycjonowanie w MVP**: Zdecydowano o braku partycjonowania w MVP, ale użyciu typu `TIMESTAMPTZ` dla dat (`created_at` w `query_history`), umożliwiając łatwe wprowadzenie partycjonowania opartego na zakresie dat w przyszłości.

9. **Indeksy B-tree**: Utworzono standardowe indeksy B-tree na wszystkich kluczach obcych oraz indeks na `created_at DESC` w `query_history` dla optymalnej wydajności sortowania chronologicznego.

10. **Przechowywanie odpowiedzi**: Tabela `query_history` zawiera kolumny `fast_response_content` (TEXT, NOT NULL) oraz `accurate_response_content` (TEXT, NULLABLE), wypełniane tylko na żądanie użytkownika, unikając nadmiernej normalizacji w MVP.

11. **Klucze główne**: Zdecydowano o użyciu UUID jako kluczy głównych we wszystkich tabelach, zgodnie z domyślną praktyką Supabase, ułatwiając migracje i zapobiegając wyciekowi informacji o liczbie rekordów.

12. **Wymiar embeddingów**: Zdefiniowano kolumnę `embedding` jako `vector(1024)` dla elastyczności, umożliwiając użycie zarówno nomic-embed-text (768) jak i mxbai-embed-large (1024) bez zmiany schematu.

13. **Metadane fragmentów**: Dodano kolumnę `metadata` typu JSONB w `legal_act_chunks` dla przechowywania lokalizacji fragmentu (np. numer artykułu, paragrafu) w formacie `{"type": "article", "number": "10a"}`.

14. **Wyszukiwanie pełnotekstowe (FTS)**: Zaimplementowano wsparcie dla FTS na kolumnie `content` w `legal_act_chunks` poprzez kolumnę typu `tsvector` i indeks GIN, umożliwiając zapytania hybrydowe (semantyczne + słowa kluczowe).

15. **Typy danych dla legal_acts**: Użyto TEXT dla `title`, VARCHAR(255) dla `organ_wydajacy` i `typ_aktu`, DATE dla dat publikacji (bez informacji o godzinie).

16. **Unikalne ograniczenia**: Zdefiniowano unikalny klucz złożony na `(source_act_id, target_act_id, relation_type)` w `legal_act_relations`, zapobiegając duplikowaniu relacji.

17. **Walidacja odpowiedzi**: Dodano ograniczenie CHECK `(length(content) > 0)` dla `fast_response_content` i `accurate_response_content`, z logiką aplikacji przechwytującą puste odpowiedzi LLM i zapisującą predefiniowany komunikat.

18. **Walidacja zapytań**: Kolumna `query_text` typu TEXT z ograniczeniem CHECK `(length(query_text) > 0)`, uniemożliwiając zapisywanie pustych zapytań.

19. **Komentarze w ocenach**: Dodano NULLABLE kolumnę `comment` typu TEXT w `ratings` dla przyszłej rozbudowy, pozostawiając ją pustą w MVP.

20. **Idempotencja importu**: Zdefiniowano unikalny identyfikator aktu w `legal_acts` (kombinacja `publisher, year, position`) i użycie `INSERT ... ON CONFLICT DO NOTHING` w skrypcie importującym, zapewniając idempotencję dla aktów, chunks i relations.

21. **Auto-update updated_at**: Utworzono trigger automatycznie aktualizujący `updated_at` na `now()` przy każdej operacji UPDATE na `legal_acts` i `ratings`, zapewniając spójność danych.

22. **Metryka odległości pgvector**: Zdecydowano o użyciu `vector_cosine_ops` (podobieństwo kosinusowe) zamiast `vector_l2_ops` dla znormalizowanych embeddingów, zapewniając bardziej trafne wyniki wyszukiwania semantycznego.

23. **Zmiana ocen**: Usunięto ograniczenie UNIQUE na `(query_history_id, user_id, response_type)` w `ratings`, umożliwiając zmianę oceny przez użytkownika. Logika UPSERT (wstaw lub zaktualizuj) obsługiwana na poziomie aplikacji.

24. **Usuwanie aktów prawnych**: Zmieniono `ON DELETE CASCADE` na `ON DELETE RESTRICT` dla relacji `legal_act_chunks` i `legal_act_relations` z `legal_acts`, uniemożliwiając przypadkowe usunięcie aktu z powiązanymi fragmentami. Usuwanie zarządzane przez aplikację jako proces wieloetapowy.

25. **Walidacja pól z API ISAP**: Zdecydowano o weryfikacji dostępności pól z API ISAP (np. `publication_date`, `status`) i ustawieniu NOT NULL dla pól kluczowych zawsze występujących w odpowiedziach API.

26. **Konfiguracja FTS**: Użyto konfiguracji języka 'polish' dla wyszukiwania pełnotekstowego, obejmującej odmianę słów (stemming) dla tekstów polskich.

27. **Idempotencja chunks**: Idempotencję na poziomie fragmentów zapewnia skrypt importujący poprzez usunięcie wszystkich istniejących chunków dla danego `legal_act_id` przed ponownym wstawieniem nowych.

28. **Nazewnictwo**: Przyjęto konsekwentne nazewnictwo w stylu snake_case dla tabel i kolumn (np. `query_history`, `legal_act_id`), zgodnie ze standardową konwencją PostgreSQL.

29. **Model embeddingów**: Dodano kolumnę `embedding_model_name` (VARCHAR(100)) w `legal_act_chunks` dla przechowywania informacji o modelu użytym do wygenerowania embeddingu, umożliwiając przyszłą re-indeksację lub filtrowanie.

30. **Logowanie błędów LLM**: Dla MVP obecne podejście (przechowywanie tylko finalnej odpowiedzi) jest wystarczające. Rozważono stworzenie osobnej tabeli `llm_requests_log` w przyszłości dla szczegółów zapytań (prompt, parametry, czas odpowiedzi, błędy).

</decisions>

<matched_recommendations>

1. **Relacje z ON DELETE CASCADE**: Rekomendacja z sesji 1 dotycząca `ON DELETE CASCADE` dla relacji users-query_history została przyjęta i rozszerzona o cascade dla ratings przy usunięciu query_history, zapewniając zgodność z RODO i US-007.

2. **ENUM dla typów danych**: Rekomendacja z sesji 1 dotycząca użycia ENUM została w pełni przyjęta dla `response_type`, `rating_value`, `relation_type` i `status`, zapewniając integralność danych na poziomie bazy.

3. **Indeks IVFFlat dla MVP**: Rekomendacja z sesji 1 dotycząca użycia IVFFlat została przyjęta z parametrem `lists` dobranym jako pierwiastek kwadratowy z liczby wierszy, stanowiąc optymalny kompromis dla MVP.

4. **Polityki RLS**: Rekomendacja z sesji 1 dotycząca polityk RLS została w pełni zaimplementowana z regułami SELECT, INSERT, UPDATE, DELETE opartymi na `auth.uid()`, zapewniając ścisłą izolację danych.

5. **UUID jako klucze główne**: Rekomendacja z sesji 2 dotycząca UUID została przyjęta jako standard dla wszystkich tabel, zgodnie z praktyką Supabase.

6. **Vector(1024) dla embeddingów**: Rekomendacja z sesji 2 dotycząca większego wymiaru została przyjęta, zapewniając elastyczność dla różnych modeli embeddingów.

7. **JSONB metadata**: Rekomendacja z sesji 2 dotycząca kolumny metadata typu JSONB została przyjęta dla przechowywania lokalizacji fragmentów w `legal_act_chunks`.

8. **FTS z tsvector i GIN**: Rekomendacja z sesji 2 dotycząca wyszukiwania pełnotekstowego została przyjęta, umożliwiając zapytania hybrydowe semantyczne + słowa kluczowe.

9. **Idempotencja importu**: Rekomendacja z sesji 2 dotycząca `INSERT ... ON CONFLICT DO NOTHING` została przyjęta dla aktów, chunks i relations, zapewniając bezpieczny wielokrotny import.

10. **Trigger dla updated_at**: Rekomendacja z sesji 3 dotycząca automatycznego aktualizowania `updated_at` została przyjęta i zaimplementowana jako reusable function z triggerami.

11. **Vector_cosine_ops**: Rekomendacja z sesji 3 dotycząca użycia podobieństwa kosinusowego została przyjęta zamiast L2, zapewniając lepsze wyniki dla znormalizowanych embeddingów.

12. **ON DELETE RESTRICT dla aktów**: Rekomendacja z sesji 3 dotycząca zmiany z CASCADE na RESTRICT została przyjęta, zwiększając bezpieczeństwo przed przypadkowym usunięciem aktów z powiązanymi danymi.

13. **Embedding_model_name**: Rekomendacja z sesji 3 dotycząca przechowywania nazwy modelu embeddingów została przyjęta, umożliwiając przyszłą re-indeksację i filtrowanie.

14. **Usunięcie UNIQUE z ratings**: Rekomendacja z sesji 3 dotycząca usunięcia ograniczenia UNIQUE i obsługi UPSERT w aplikacji została przyjęta, umożliwiając zmianę ocen przez użytkowników.

15. **Konfiguracja 'polish' dla FTS**: Rekomendacja z sesji 3 dotycząca użycia konfiguracji 'polish' została potwierdzona jako optymalna dla tekstów polskich z obsługą stemmingu.

</matched_recommendations>

<database_planning_summary>

## Główne wymagania dotyczące schematu bazy danych

Schemat bazy danych dla PrawnikGPT MVP został zaprojektowany w oparciu o trzy sesje planowania, koncentrując się na następujących wymaganiach:

### Architektura danych

**Tabele użytkowników i zapytań:**
- `auth.users` - zarządzana przez Supabase Auth (UUID jako PK)
- `query_history` (alternatywnie `queries`) - przechowuje pytania użytkowników z kolumnami `fast_response_content` (NOT NULL) i `accurate_response_content` (NULLABLE)
- `ratings` - oceny odpowiedzi powiązane z `query_history_id` i `response_type` (ENUM: 'fast', 'accurate')

**Tabele aktów prawnych:**
- `legal_acts` - metadane aktów z unikalnym identyfikatorem `(publisher, year, position)`
- `legal_act_chunks` - fragmenty tekstowe z embeddingami `vector(1024)`, kolumną `metadata` (JSONB) i `embedding_model_name`
- `legal_act_relations` - relacje między aktami z unikalnym constraint na `(source_act_id, target_act_id, relation_type)`

### Kluczowe encje i ich relacje

**Relacje jeden-do-wielu:**
- `auth.users` → `query_history` (ON DELETE CASCADE)
- `query_history` → `ratings` (ON DELETE CASCADE)
- `legal_acts` → `legal_act_chunks` (ON DELETE RESTRICT)
- `legal_acts` → `legal_act_relations` jako source i target (ON DELETE RESTRICT)

**Integralność danych:**
- Wszystkie klucze główne to UUID
- Wszystkie klucze obce mają odpowiednie reguły ON DELETE (CASCADE dla danych użytkownika, RESTRICT dla aktów)
- Unikalne constrainty zapobiegają duplikatom (aktów, relacji)
- CHECK constraints zapewniają walidację długości i wartości

### Ważne kwestie dotyczące bezpieczeństwa

**Row-Level Security (RLS):**
- Polityki RLS dla `query_history` i `ratings` z regułami opartymi na `auth.uid()`
- Użytkownicy mają dostęp wyłącznie do swoich danych (SELECT, INSERT, UPDATE, DELETE)
- Tabele aktów prawnych są publiczne (brak RLS) - read-only w MVP

**Ochrona przed przypadkowym usunięciem:**
- `ON DELETE RESTRICT` dla aktów prawnych zapobiega usunięciu przy istniejących fragmentach/relacjach
- `ON DELETE CASCADE` dla danych użytkownika zapewnia zgodność z RODO (automatyczne usuwanie historii)

**Walidacja danych:**
- CHECK constraints na długość tekstu (query_text, response_content)
- ENUM types zapewniają integralność wartości (response_type, rating_value, relation_type)
- NOT NULL dla pól kluczowych po weryfikacji dostępności w API ISAP

### Skalowalność i wydajność

**Indeksy:**
- B-tree indeksy na wszystkich kluczach obcych
- Indeks na `created_at DESC` w `query_history` dla sortowania chronologicznego
- Indeks IVFFlat na `embedding` w `legal_act_chunks` z `vector_cosine_ops` i parametrem `lists = sqrt(total_rows)`
- Indeks GIN na `tsvector` dla wyszukiwania pełnotekstowego (FTS) z konfiguracją 'polish'

**Optymalizacje:**
- Vector(1024) dla embeddingów umożliwia użycie różnych modeli bez zmiany schematu
- JSONB dla metadanych zapewnia elastyczność bez konieczności zmian schematu
- TIMESTAMPTZ dla dat umożliwia przyszłe partycjonowanie (nie w MVP)

**Szacunki wolumenu danych (MVP):**
- `legal_acts`: ~20,000 wierszy (~40 MB)
- `legal_act_chunks`: ~500,000 wierszy (~2 GB z embeddingami)
- `legal_act_relations`: ~100,000 wierszy (~50 MB)
- `query_history`: ~10,000 wierszy/miesiąc (~5 MB)
- `ratings`: ~5,000 wierszy (~1.5 MB)
- **Całkowity rozmiar**: ~2.13 GB danych + ~3 GB indeksów = ~5-6 GB

### Funkcjonalności RAG

**Wyszukiwanie semantyczne:**
- Embeddingi w `legal_act_chunks` z indeksem IVFFlat
- Metryka podobieństwa kosinusowego (`vector_cosine_ops`)
- Wsparcie dla modeli 768-dim (nomic-embed-text) i 1024-dim (mxbai-embed-large)

**Wyszukiwanie pełnotekstowe:**
- Kolumna `tsvector` z indeksem GIN
- Konfiguracja języka 'polish' z obsługą stemmingu
- Możliwość zapytań hybrydowych (semantyczne + słowa kluczowe)

**Idempotencja importu:**
- Unikalny identyfikator aktów: `(publisher, year, position)`
- `INSERT ... ON CONFLICT DO NOTHING` dla bezpiecznego wielokrotnego importu
- Skrypt importujący usuwa istniejące chunks przed ponownym wstawieniem

### Automatyzacja i konserwacja

**Triggers:**
- Automatyczna aktualizacja `updated_at` na `now()` przy UPDATE w `legal_acts` i `ratings`
- Reusable function `update_updated_at_column()` dla spójności

**Nazewnictwo:**
- Konsekwentne użycie snake_case dla tabel i kolumn (standard PostgreSQL)

**Przyszłe rozszerzenia:**
- Kolumna `comment` (NULLABLE) w `ratings` przygotowana na przyszłość
- Kolumna `embedding_model_name` umożliwia re-indeksację przy zmianie modelu
- Rozważenie tabeli `llm_requests_log` dla szczegółowego logowania zapytań LLM

</database_planning_summary>

<unresolved_issues>

1. **Weryfikacja dostępności pól z API ISAP**: Wymagana jest analiza odpowiedzi z API ISAP dla różnych aktów prawnych, aby potwierdzić, które pola (np. `publication_date`, `status`, `issuing_body`) są zawsze dostępne i powinny mieć ograniczenie NOT NULL. Do czasu weryfikacji, niektóre pola pozostają NULLABLE.

2. **Parametry indeksu IVFFlat**: Dokładna wartość parametru `lists` dla indeksu IVFFlat wymaga doprecyzowania po zaimportowaniu danych. Obecna rekomendacja to `sqrt(total_rows)`, ale może wymagać dostrojenia w oparciu o rzeczywiste wyniki wydajności.

3. **Strategia obsługi pustych odpowiedzi LLM**: Wymagane jest zdefiniowanie precyzyjnego komunikatu błędu, który będzie zapisywany w miejsce pustych odpowiedzi z LLM. Komunikat powinien być przyjazny dla użytkownika i zgodny z językiem interfejsu (polski).

4. **Logika UPSERT dla ratings**: Szczegóły implementacji logiki "wstaw lub zaktualizuj" (UPSERT) dla ocen w aplikacji backendowej wymagają doprecyzowania. Należy zdecydować, czy użyć `INSERT ... ON CONFLICT UPDATE` na poziomie bazy, czy obsłużyć to w logice aplikacji.

5. **Proces wieloetapowego usuwania aktów**: Szczegółowa procedura usuwania aktów prawnych w aplikacji (wieloetapowy proces zarządzany przez aplikację) wymaga zdefiniowania. Należy określić kolejność usuwania (chunks → relations → act) oraz sposób obsługi błędów.

6. **Walidacja długości query_text**: Obecnie brak ograniczenia górnej granicy długości dla `query_text` (tylko CHECK `length > 0`). Wymagane jest zdefiniowanie maksymalnej długości zapytania (np. 1000 znaków) zgodnie z wymaganiami API.

7. **Konfiguracja języka FTS**: Wymagana jest weryfikacja, czy PostgreSQL w Supabase ma zainstalowany słownik języka polskiego dla `to_tsvector('polish', ...)`. W przypadku braku, należy rozważyć alternatywne rozwiązanie lub instalację rozszerzenia.

8. **Strategia re-indeksacji przy zmianie modelu embeddingów**: W przypadku zmiany modelu embeddingów w przyszłości, wymagana jest strategia re-indeksacji istniejących chunków. Należy określić, czy będzie to proces jednorazowy (usunięcie i ponowne wstawienie) czy przyrostowy (tylko nowe chunks).

9. **Monitoring i analityka**: Brak zdefiniowanej strategii monitorowania wydajności zapytań RAG, analityki jakości odpowiedzi LLM oraz śledzenia użycia systemu. Rozważenie dodatkowych tabel lub integracji z narzędziami analitycznymi.

10. **Backup i disaster recovery**: Szczegółowa strategia backupu i odzyskiwania danych wymaga doprecyzowania. Supabase oferuje automatyczne backupy, ale należy określić procedury ręcznego backupu przed migracjami oraz strategię testowania przywracania.

</unresolved_issues>

</conversation_summary>

