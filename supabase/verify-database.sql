-- =====================================================
-- Database Verification Script for E2E Testing
-- =====================================================
-- Ten skrypt weryfikuje strukturę bazy danych i dane
-- Uruchom w Supabase Dashboard (SQL Editor) lub przez psql
-- =====================================================

\echo '===================================================='
\echo '🔍 Weryfikacja struktury bazy danych - PrawnikGPT'
\echo '===================================================='
\echo ''

-- =====================================================
-- 1. SPRAWDZENIE ROZSZERZEŃ (EXTENSIONS)
-- =====================================================
\echo '📦 1. Sprawdzanie rozszerzeń PostgreSQL...'
\echo ''

SELECT 
    extname as "Rozszerzenie",
    extversion as "Wersja",
    CASE 
        WHEN extname IN ('vector', 'unaccent') THEN '✅ Wymagane'
        ELSE 'ℹ️  Opcjonalne'
    END as "Status"
FROM pg_extension
WHERE extname IN ('vector', 'unaccent')
ORDER BY extname;

\echo ''
\echo 'Oczekiwane rozszerzenia:'
\echo '  ✅ vector (dla embeddings)'
\echo '  ✅ unaccent (dla polskiego wyszukiwania)'
\echo ''

-- =====================================================
-- 2. SPRAWDZENIE TYPÓW ENUM
-- =====================================================
\echo '📋 2. Sprawdzanie typów ENUM...'
\echo ''

SELECT 
    t.typname as "Typ ENUM",
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as "Wartości",
    CASE 
        WHEN t.typname IN ('response_type_enum', 'rating_value_enum', 'relation_type_enum', 'legal_act_status_enum') 
        THEN '✅ Wymagane'
        ELSE 'ℹ️  Opcjonalne'
    END as "Status"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('response_type_enum', 'rating_value_enum', 'relation_type_enum', 'legal_act_status_enum')
GROUP BY t.typname
ORDER BY t.typname;

\echo ''
\echo 'Oczekiwane typy ENUM:'
\echo '  ✅ response_type_enum (fast, accurate)'
\echo '  ✅ rating_value_enum (up, down)'
\echo '  ✅ relation_type_enum (modifies, repeals, implements, based_on, amends)'
\echo '  ✅ legal_act_status_enum (obowiązująca, uchylona, nieobowiązująca)'
\echo ''

-- =====================================================
-- 3. SPRAWDZENIE TABEL
-- =====================================================
\echo '📊 3. Sprawdzanie tabel...'
\echo ''

SELECT 
    table_name as "Tabela",
    CASE 
        WHEN table_name IN ('legal_acts', 'legal_act_chunks', 'legal_act_relations', 'query_history', 'ratings') 
        THEN '✅ Wymagana'
        ELSE 'ℹ️  Opcjonalna'
    END as "Status"
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    CASE 
        WHEN table_name = 'legal_acts' THEN 1
        WHEN table_name = 'legal_act_chunks' THEN 2
        WHEN table_name = 'legal_act_relations' THEN 3
        WHEN table_name = 'query_history' THEN 4
        WHEN table_name = 'ratings' THEN 5
        ELSE 99
    END,
    table_name;

\echo ''
\echo 'Oczekiwane tabele (5):'
\echo '  ✅ legal_acts - Akty prawne'
\echo '  ✅ legal_act_chunks - Fragmenty aktów z embeddings'
\echo '  ✅ legal_act_relations - Relacje między aktami'
\echo '  ✅ query_history - Historia zapytań użytkowników'
\echo '  ✅ ratings - Oceny odpowiedzi'
\echo ''

-- =====================================================
-- 4. SPRAWDZENIE INDEKSÓW
-- =====================================================
\echo '🔍 4. Sprawdzanie kluczowych indeksów...'
\echo ''

SELECT 
    schemaname as "Schema",
    tablename as "Tabela",
    indexname as "Indeks",
    CASE 
        WHEN indexname LIKE 'idx_%' OR indexname LIKE '%_pkey' OR indexname LIKE '%_unique%'
        THEN '✅'
        ELSE 'ℹ️ '
    END as "Status"
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('legal_acts', 'legal_act_chunks', 'legal_act_relations', 'query_history', 'ratings')
ORDER BY tablename, indexname;

\echo ''
\echo 'Kluczowe indeksy:'
\echo '  ✅ idx_legal_act_chunks_embedding_ivfflat (dla RAG)'
\echo '  ✅ idx_query_history_user_id (dla RLS)'
\echo '  ✅ idx_ratings_query_history_id (dla joinów)'
\echo ''

-- =====================================================
-- 5. SPRAWDZENIE FUNKCJI RPC
-- =====================================================
\echo '⚙️  5. Sprawdzanie funkcji RPC...'
\echo ''

SELECT 
    routine_name as "Funkcja",
    routine_type as "Typ",
    CASE 
        WHEN routine_name IN ('health_check', 'semantic_search_chunks', 'fetch_related_acts', 'list_user_queries')
        THEN '✅ Wymagana'
        ELSE 'ℹ️  Opcjonalna'
    END as "Status"
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
ORDER BY routine_name;

\echo ''
\echo 'Oczekiwane funkcje RPC:'
\echo '  ✅ health_check() - Health check endpoint'
\echo '  ✅ semantic_search_chunks() - Wyszukiwanie semantyczne'
\echo '  ✅ fetch_related_acts() - Pobieranie powiązanych aktów'
\echo '  ✅ list_user_queries() - Listowanie zapytań użytkownika'
\echo ''

-- =====================================================
-- 6. SPRAWDZENIE ROW LEVEL SECURITY (RLS)
-- =====================================================
\echo '🔒 6. Sprawdzanie Row Level Security (RLS)...'
\echo ''

SELECT 
    schemaname as "Schema",
    tablename as "Tabela",
    CASE 
        WHEN rowsecurity THEN '✅ Włączone'
        ELSE '❌ Wyłączone'
    END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('legal_acts', 'legal_act_chunks', 'legal_act_relations', 'query_history', 'ratings')
ORDER BY tablename;

\echo ''
\echo 'RLS powinno być włączone dla wszystkich tabel.'
\echo ''

-- =====================================================
-- 7. SPRAWDZENIE POLITYK RLS
-- =====================================================
\echo '📜 7. Sprawdzanie polityk RLS...'
\echo ''

SELECT 
    schemaname as "Schema",
    tablename as "Tabela",
    policyname as "Polityka",
    permissive as "Permissive",
    roles as "Role",
    cmd as "Komenda"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('legal_acts', 'legal_act_chunks', 'legal_act_relations', 'query_history', 'ratings')
ORDER BY tablename, policyname;

\echo ''
\echo 'Oczekiwane polityki:'
\echo '  ✅ legal_acts: select dla anon + authenticated'
\echo '  ✅ legal_act_chunks: select dla anon + authenticated'
\echo '  ✅ legal_act_relations: select dla anon + authenticated'
\echo '  ✅ query_history: select/insert/delete dla authenticated (własne zapytania)'
\echo '  ✅ ratings: select/insert/update/delete dla authenticated (własne oceny)'
\echo ''

-- =====================================================
-- 8. SPRAWDZENIE DANYCH (LICZBA REKORDÓW)
-- =====================================================
\echo '📈 8. Sprawdzanie danych w tabelach...'
\echo ''

SELECT 
    'legal_acts' as "Tabela",
    COUNT(*) as "Liczba rekordów",
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Zawiera dane'
        ELSE '⚠️  Pusta (wymaga danych testowych dla E2E)'
    END as "Status"
FROM legal_acts
UNION ALL
SELECT 
    'legal_act_chunks',
    COUNT(*),
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Zawiera dane'
        ELSE '⚠️  Pusta (wymaga danych testowych dla E2E)'
    END
FROM legal_act_chunks
UNION ALL
SELECT 
    'legal_act_relations',
    COUNT(*),
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Zawiera dane'
        ELSE 'ℹ️  Opcjonalna (może być pusta)'
    END
FROM legal_act_relations
UNION ALL
SELECT 
    'query_history',
    COUNT(*),
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ OK (może być pusta dla nowych użytkowników)'
        ELSE '❌ Błąd'
    END
FROM query_history
UNION ALL
SELECT 
    'ratings',
    COUNT(*),
    CASE 
        WHEN COUNT(*) >= 0 THEN '✅ OK (może być pusta dla nowych użytkowników)'
        ELSE '❌ Błąd'
    END
FROM ratings
ORDER BY "Tabela";

\echo ''
\echo 'Uwagi:'
\echo '  ⚠️  legal_acts i legal_act_chunks powinny zawierać dane dla testów E2E'
\echo '  ℹ️  query_history i ratings mogą być puste (dane użytkowników)'
\echo ''

-- =====================================================
-- 9. SPRAWDZENIE UŻYTKOWNIKÓW TESTOWYCH (dla E2E)
-- =====================================================
\echo '👤 9. Sprawdzanie użytkowników testowych...'
\echo ''

SELECT 
    id,
    email,
    created_at,
    CASE 
        WHEN email LIKE '%test%' OR email LIKE '%e2e%' OR email LIKE '%example%' 
        THEN '✅ Użytkownik testowy'
        ELSE 'ℹ️  Użytkownik produkcyjny'
    END as "Typ"
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo 'Dla testów E2E potrzebni są użytkownicy testowi:'
\echo '  ✅ test@example.com (lub podobny)'
\echo '  ✅ e2e-test@example.com (lub podobny)'
\echo ''
\echo 'Możesz utworzyć użytkowników testowych przez:'
\echo '  1. Supabase Dashboard → Authentication → Users → Add user'
\echo '  2. Lub przez API: POST /auth/v1/signup'
\echo ''

-- =====================================================
-- 10. PODSUMOWANIE
-- =====================================================
\echo '===================================================='
\echo '📊 PODSUMOWANIE WERYFIKACJI'
\echo '===================================================='
\echo ''

-- Sprawdź czy wszystkie wymagane tabele istnieją
DO $$
DECLARE
    missing_tables TEXT[];
    required_tables TEXT[] := ARRAY['legal_acts', 'legal_act_chunks', 'legal_act_relations', 'query_history', 'ratings'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '❌ BRAKUJĄCE TABELE: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ Wszystkie wymagane tabele istnieją';
    END IF;
END $$;

-- Sprawdź czy są dane w kluczowych tabelach
DO $$
DECLARE
    legal_acts_count INTEGER;
    chunks_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO legal_acts_count FROM legal_acts;
    SELECT COUNT(*) INTO chunks_count FROM legal_act_chunks;
    
    IF legal_acts_count = 0 THEN
        RAISE NOTICE '⚠️  UWAGA: Tabela legal_acts jest pusta - potrzebne dane dla testów E2E';
    ELSE
        RAISE NOTICE '✅ Tabela legal_acts zawiera % rekordów', legal_acts_count;
    END IF;
    
    IF chunks_count = 0 THEN
        RAISE NOTICE '⚠️  UWAGA: Tabela legal_act_chunks jest pusta - potrzebne dane dla testów E2E';
    ELSE
        RAISE NOTICE '✅ Tabela legal_act_chunks zawiera % rekordów', chunks_count;
    END IF;
END $$;

\echo ''
\echo '===================================================='
\echo '✨ Weryfikacja zakończona'
\echo '===================================================='
\echo ''
\echo 'Następne kroki dla testów E2E:'
\echo '  1. ✅ Upewnij się, że wszystkie tabele istnieją'
\echo '  2. ✅ Sprawdź, czy legal_acts i legal_act_chunks zawierają dane'
\echo '  3. ✅ Utwórz użytkowników testowych (jeśli potrzebne)'
\echo '  4. ✅ Uruchom testy: npm run test:e2e'
\echo ''
