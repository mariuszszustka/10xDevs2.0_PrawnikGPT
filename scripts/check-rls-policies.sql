-- =====================================================
-- Sprawdzenie konfiguracji Row Level Security (RLS)
-- =====================================================
-- Ten skrypt sprawdza RLS dla wszystkich tabel
-- Uruchom w Supabase Dashboard (SQL Editor)
-- =====================================================

\echo '===================================================='
\echo '🔒 Weryfikacja Row Level Security (RLS)'
\echo '===================================================='
\echo ''

-- =====================================================
-- 1. SPRAWDZENIE CZY RLS JEST WŁĄCZONE
-- =====================================================
\echo '📋 1. Status RLS dla tabel...'
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
\echo 'Wszystkie tabele powinny mieć RLS włączone.'
\echo ''

-- =====================================================
-- 2. SPRAWDZENIE POLITYK RLS
-- =====================================================
\echo '📜 2. Polityki RLS dla tabel...'
\echo ''

SELECT 
    schemaname as "Schema",
    tablename as "Tabela",
    policyname as "Polityka",
    permissive as "Permissive",
    roles as "Role",
    cmd as "Komenda",
    qual as "USING (warunek)",
    with_check as "WITH CHECK (warunek)"
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('legal_acts', 'legal_act_chunks', 'legal_act_relations', 'query_history', 'ratings')
ORDER BY tablename, policyname;

\echo ''
\echo 'Oczekiwane polityki:'
\echo ''
\echo 'legal_acts:'
\echo '  ✅ legal_acts_select_all_anon (SELECT dla anon)'
\echo '  ✅ legal_acts_select_all_authenticated (SELECT dla authenticated)'
\echo ''
\echo 'legal_act_chunks:'
\echo '  ✅ legal_act_chunks_select_all_anon (SELECT dla anon)'
\echo '  ✅ legal_act_chunks_select_all_authenticated (SELECT dla authenticated)'
\echo ''
\echo 'legal_act_relations:'
\echo '  ✅ legal_act_relations_select_all_anon (SELECT dla anon)'
\echo '  ✅ legal_act_relations_select_all_authenticated (SELECT dla authenticated)'
\echo ''
\echo 'query_history:'
\echo '  ✅ query_history_select_own (SELECT dla authenticated, własne zapytania)'
\echo '  ✅ query_history_insert_own (INSERT dla authenticated, własne zapytania)'
\echo '  ✅ query_history_delete_own (DELETE dla authenticated, własne zapytania)'
\echo ''
\echo 'ratings:'
\echo '  ✅ ratings_select_own (SELECT dla authenticated, własne oceny)'
\echo '  ✅ ratings_insert_own (INSERT dla authenticated, własne oceny)'
\echo '  ✅ ratings_update_own (UPDATE dla authenticated, własne oceny)'
\echo '  ✅ ratings_delete_own (DELETE dla authenticated, własne oceny)'
\echo ''

-- =====================================================
-- 3. SZCZEGÓŁOWA WERYFIKACJA POLITYK
-- =====================================================
\echo '🔍 3. Szczegółowa weryfikacja polityk...'
\echo ''

-- Sprawdź czy wszystkie wymagane polityki istnieją
DO $$
DECLARE
    required_policies TEXT[] := ARRAY[
        'legal_acts_select_all_anon',
        'legal_acts_select_all_authenticated',
        'legal_act_chunks_select_all_anon',
        'legal_act_chunks_select_all_authenticated',
        'legal_act_relations_select_all_anon',
        'legal_act_relations_select_all_authenticated',
        'query_history_select_own',
        'query_history_insert_own',
        'query_history_delete_own',
        'ratings_select_own',
        'ratings_insert_own',
        'ratings_update_own',
        'ratings_delete_own'
    ];
    policy_name TEXT;
    policy_exists BOOLEAN;
    missing_policies TEXT[];
BEGIN
    FOREACH policy_name IN ARRAY required_policies
    LOOP
        SELECT EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND policyname = policy_name
        ) INTO policy_exists;
        
        IF NOT policy_exists THEN
            missing_policies := array_append(missing_policies, policy_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_policies, 1) > 0 THEN
        RAISE NOTICE '❌ BRAKUJĄCE POLITYKI: %', array_to_string(missing_policies, ', ');
    ELSE
        RAISE NOTICE '✅ Wszystkie wymagane polityki istnieją';
    END IF;
END $$;

\echo ''

-- =====================================================
-- 4. TEST DOSTĘPU (symulacja)
-- =====================================================
\echo '🧪 4. Test dostępu (informacyjnie)...'
\echo ''

-- Sprawdź czy anon role może czytać publiczne tabele
SELECT 
    'legal_acts' as "Tabela",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'legal_acts'
            AND roles = '{anon}'
            AND cmd = 'SELECT'
        ) THEN '✅ anon może czytać'
        ELSE '❌ anon NIE może czytać'
    END as "Dostęp anon"
UNION ALL
SELECT 
    'legal_act_chunks',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'legal_act_chunks'
            AND roles = '{anon}'
            AND cmd = 'SELECT'
        ) THEN '✅ anon może czytać'
        ELSE '❌ anon NIE może czytać'
    END
UNION ALL
SELECT 
    'query_history',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'query_history'
            AND roles = '{authenticated}'
            AND cmd = 'SELECT'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ authenticated może czytać własne'
        ELSE '❌ authenticated NIE może czytać własnych'
    END
UNION ALL
SELECT 
    'ratings',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'ratings'
            AND roles = '{authenticated}'
            AND cmd = 'SELECT'
            AND qual LIKE '%auth.uid()%'
        ) THEN '✅ authenticated może czytać własne'
        ELSE '❌ authenticated NIE może czytać własnych'
    END;

\echo ''
\echo '===================================================='
\echo '✨ Weryfikacja RLS zakończona'
\echo '===================================================='
\echo ''
