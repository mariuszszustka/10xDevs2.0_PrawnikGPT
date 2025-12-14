-- =====================================================
-- Seed Data for E2E Testing
-- =====================================================
-- Ten skrypt dodaje dane testowe do bazy danych
-- Uruchom w Supabase Dashboard (SQL Editor)
-- =====================================================

\echo '===================================================='
\echo '🌱 Dodawanie danych testowych'
\echo '===================================================='
\echo ''

-- =====================================================
-- 1. DODANIE AKTÓW PRAWNYCH
-- =====================================================
\echo '📜 1. Dodawanie aktów prawnych...'

INSERT INTO legal_acts (
    publisher, year, position, title, typ_aktu, status, 
    organ_wydajacy, published_date, effective_date
) VALUES 
-- Kodeks cywilny
('dz-u', 1964, 16, 'Kodeks cywilny', 'ustawa', 'obowiązująca', 'sejm', '1964-04-23', '1964-04-23'),

-- Ustawa o prawach konsumenta
('dz-u', 2014, 827, 'Ustawa o prawach konsumenta', 'ustawa', 'obowiązująca', 'sejm', '2014-05-30', '2014-12-25'),

-- Kodeks pracy
('dz-u', 1974, 24, 'Kodeks pracy', 'ustawa', 'obowiązująca', 'sejm', '1974-06-26', '1974-06-26'),

-- Ustawa o ochronie danych osobowych (RODO)
('dz-u', 2018, 1000, 'Ustawa o ochronie danych osobowych', 'ustawa', 'obowiązująca', 'sejm', '2018-05-10', '2018-05-25'),

-- Kodeks postępowania cywilnego
('dz-u', 1964, 43, 'Kodeks postępowania cywilnego', 'ustawa', 'obowiązująca', 'sejm', '1964-11-17', '1965-01-01'),

-- Ustawa o świadczeniu usług drogą elektroniczną
('dz-u', 2002, 144, 'Ustawa o świadczeniu usług drogą elektroniczną', 'ustawa', 'obowiązująca', 'sejm', '2002-07-18', '2002-08-14'),

-- Prawo zamówień publicznych
('dz-u', 2019, 2019, 'Prawo zamówień publicznych', 'ustawa', 'obowiązująca', 'sejm', '2019-09-11', '2021-01-01'),

-- Ustawa o zwalczaniu nieuczciwej konkurencji
('dz-u', 1993, 47, 'Ustawa o zwalczaniu nieuczciwej konkurencji', 'ustawa', 'obowiązująca', 'sejm', '1993-03-16', '1993-04-01'),

-- Prawo własności intelektualnej
('dz-u', 1994, 24, 'Ustawa o prawie autorskim i prawach pokrewnych', 'ustawa', 'obowiązująca', 'sejm', '1994-02-04', '1994-05-23'),

-- Kodeks karny
('dz-u', 1997, 88, 'Kodeks karny', 'ustawa', 'obowiązująca', 'sejm', '1997-06-06', '1998-09-01'),

-- Prawo o ruchu drogowym
('dz-u', 1997, 98, 'Prawo o ruchu drogowym', 'ustawa', 'obowiązująca', 'sejm', '1997-06-20', '1997-10-01'),

-- Ustawa o podatku od towarów i usług (VAT)
('dz-u', 2004, 54, 'Ustawa o podatku od towarów i usług', 'ustawa', 'obowiązująca', 'sejm', '2004-03-11', '2004-05-01'),

-- Prawo budowlane
('dz-u', 1994, 89, 'Prawo budowlane', 'ustawa', 'obowiązująca', 'sejm', '1994-07-07', '1995-01-01'),

-- Ustawa o działalności gospodarczej
('dz-u', 2018, 646, 'Ustawa o działalności gospodarczej', 'ustawa', 'obowiązująca', 'sejm', '2018-03-06', '2018-04-30'),

-- Prawo spółek handlowych
('dz-u', 2000, 94, 'Kodeks spółek handlowych', 'ustawa', 'obowiązująca', 'sejm', '2000-09-15', '2001-01-01'),

-- Prawo bankowe
('dz-u', 1997, 140, 'Prawo bankowe', 'ustawa', 'obowiązująca', 'sejm', '1997-08-29', '1998-01-01'),

-- Prawo upadłościowe
('dz-u', 2015, 978, 'Prawo upadłościowe', 'ustawa', 'obowiązująca', 'sejm', '2015-05-15', '2016-01-01'),

-- Prawo o postępowaniu egzekucyjnym
('dz-u', 1997, 98, 'Prawo o postępowaniu egzekucyjnym', 'ustawa', 'obowiązująca', 'sejm', '1997-06-17', '1998-01-01'),

-- Prawo o ochronie konkurencji i konsumentów
('dz-u', 2007, 50, 'Ustawa o ochronie konkurencji i konsumentów', 'ustawa', 'obowiązująca', 'sejm', '2007-02-16', '2007-04-18'),

-- Prawo o ochronie środowiska
('dz-u', 2001, 62, 'Prawo o ochronie środowiska', 'ustawa', 'obowiązująca', 'sejm', '2001-04-27', '2001-10-01')

ON CONFLICT (publisher, year, position) DO NOTHING;

\echo '✅ Dodano akty prawne'
\echo ''

-- =====================================================
-- 2. SPRAWDZENIE DODANYCH AKTÓW
-- =====================================================
\echo '📊 2. Sprawdzanie dodanych aktów...'

SELECT 
    COUNT(*) as "Liczba aktów",
    COUNT(CASE WHEN status = 'obowiązująca' THEN 1 END) as "Obowiązujące",
    COUNT(CASE WHEN typ_aktu = 'ustawa' THEN 1 END) as "Ustawy"
FROM legal_acts;

\echo ''
\echo '===================================================='
\echo '✅ Dane testowe dodane pomyślnie!'
\echo '===================================================='
\echo ''
\echo 'Następne kroki:'
\echo '  1. Uruchom skrypt Python do generowania embeddings:'
\echo '     python scripts/generate-test-embeddings.py'
\echo ''
\echo '  2. Lub użyj backend API do dodania chunks z embeddings'
\echo ''
