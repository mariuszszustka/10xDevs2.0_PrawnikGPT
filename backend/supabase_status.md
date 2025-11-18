# ✅ Status Supabase - PrawnikGPT

**Data weryfikacji:** 2025-01-17

## 📊 Podsumowanie

### ✅ Połączenie z Supabase
- **URL:** `https://192.168.0.11:8443`
- **Status:** ✅ **DZIAŁA POPRAWNIE**
- **Health endpoint:** Odpowiada (wymaga autoryzacji)
- **Konfiguracja:** ✅ Wszystkie zmienne środowiskowe ustawione

### 🔧 Zmienne środowiskowe

#### Frontend (.env)
```
PUBLIC_SUPABASE_URL=http://192.168.0.11:8443  ⚠️ Powinno być HTTPS
PUBLIC_SUPABASE_ANON_KEY=✅ Ustawiony
```

#### Backend (backend/.env)
```
SUPABASE_URL=https://192.168.0.11:8443  ✅ Poprawne (HTTPS)
SUPABASE_ANON_KEY=✅ Ustawiony
SUPABASE_SERVICE_KEY=✅ Ustawiony
SUPABASE_JWT_SECRET=✅ Ustawiony
```

### ⚠️ Migracje bazy danych

**Status:** ❓ **NIEZNANY** (wymaga manualnej weryfikacji)

REST API zwraca 401 Unauthorized, co może oznaczać:
1. Tabele nie zostały utworzone (migracje nie wykonane)
2. Row Level Security (RLS) blokuje dostęp
3. Problem z konfiguracją API Gateway

### 📝 Wymagane migracje

W folderze `supabase/migrations/` znajdują się 8 plików migracji:

1. ✅ `20250112095900_setup_polish_text_search.sql` - Polski full-text search
2. ✅ `20250112100000_enable_extensions.sql` - Rozszerzenia (vector, unaccent)
3. ✅ `20250112100100_create_enums.sql` - Typy ENUM
4. ✅ `20250112100200_create_query_history_table.sql` - Historia zapytań
5. ✅ `20250112100300_create_ratings_table.sql` - Oceny odpowiedzi
6. ✅ `20250112100400_create_legal_acts_table.sql` - Akty prawne
7. ✅ `20250112100500_create_legal_act_chunks_table.sql` - Fragmenty aktów (z embeddings)
8. ✅ `20250112100600_create_legal_act_relations_table.sql` - Relacje między aktami

## 🔧 Jak zweryfikować migracje

### Opcja 1: Supabase Dashboard (ZALECANE)

1. Otwórz w przeglądarce:
   ```
   https://192.168.0.11:8443
   ```

2. Zaloguj się (użyj danych admina Supabase)

3. Przejdź do **SQL Editor** → **New query**

4. Sprawdź tabele:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

   **Oczekiwany wynik (5 tabel):**
   - `legal_act_chunks`
   - `legal_act_relations`
   - `legal_acts`
   - `query_history`
   - `ratings`

5. Sprawdź rozszerzenia:
   ```sql
   SELECT extname, extversion 
   FROM pg_extension 
   WHERE extname IN ('vector', 'unaccent');
   ```

   **Oczekiwany wynik:**
   - `vector` (np. wersja 0.7.0)
   - `unaccent` (np. wersja 1.1)

### Opcja 2: PostgreSQL CLI (jeśli masz dostęp)

```bash
# Z serwera 192.168.0.11
docker exec -it supabase-db psql -U postgres -d postgres

# Sprawdź tabele
\dt public.*

# Sprawdź rozszerzenia
\dx
```

## 🚀 Następne kroki

### Jeśli migracje NIE SĄ wykonane:

Wykonaj migracje ręcznie przez Supabase Dashboard (SQL Editor).  
Zobacz szczegółowe instrukcje w pliku: `QUICK_SETUP.md`

**Kolejność wykonania (WAŻNE!):**
1. `20250112095900_setup_polish_text_search.sql`
2. `20250112100000_enable_extensions.sql`
3. `20250112100100_create_enums.sql`
4. `20250112100200_create_query_history_table.sql`
5. `20250112100300_create_ratings_table.sql`
6. `20250112100400_create_legal_acts_table.sql`
7. `20250112100500_create_legal_act_chunks_table.sql` ⚠️ (może trwać dłużej)
8. `20250112100600_create_legal_act_relations_table.sql`

### Jeśli migracje SĄ wykonane:

✅ Możesz uruchomić aplikację:

**Terminal 1 - Backend:**
```powershell
cd D:\DEV_MASZ\prawnik_v01\backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```powershell
cd D:\DEV_MASZ\prawnik_v01
npm install
npm run dev
```

**Frontend będzie dostępny pod:**
- http://localhost:4321

**Backend API będzie dostępny pod:**
- http://localhost:8000
- Dokumentacja: http://localhost:8000/docs

## ⚙️ Poprawki konfiguracji

### 1. Popraw URL w głównym .env

W pliku `D:\DEV_MASZ\prawnik_v01\.env` zmień:

```diff
- PUBLIC_SUPABASE_URL=http://192.168.0.11:8443
+ PUBLIC_SUPABASE_URL=https://192.168.0.11:8443
```

### 2. Weryfikuj połączenie

```powershell
cd D:\DEV_MASZ\prawnik_v01\backend
python test_supabase.py
```

Powinno pokazać:
```
✅ Supabase działa poprawnie!
```

## 📚 Dodatkowe zasoby

- **Dokumentacja Supabase:** https://supabase.com/docs
- **Supabase Local Development:** https://supabase.com/docs/guides/cli
- **PrawnikGPT README:** `../README.md`
- **Quick Setup Guide:** `../QUICK_SETUP.md`

## 🐛 Rozwiązywanie problemów

### Problem: 401 Unauthorized na REST API

**Możliwe przyczyny:**
1. Tabele mają włączone RLS (Row Level Security) bez polityk
2. Tabele nie istnieją
3. Nieprawidłowy klucz API

**Rozwiązanie:**
- Sprawdź czy tabele istnieją (SQL Editor)
- Jeśli tabele istnieją, sprawdź RLS policies:
  ```sql
  SELECT tablename, policyname 
  FROM pg_policies 
  WHERE schemaname = 'public';
  ```

### Problem: Port 8443 zwraca 400 Bad Request

**Przyczyna:** Próba połączenia HTTP na port HTTPS

**Rozwiązanie:**
- Zmień `http://` na `https://` w pliku .env
- Użyj portu 54321 dla HTTP API (jeśli dostępny)

### Problem: Nie można połączyć się z Dashboard

**Możliwe porty:**
- `https://192.168.0.11:8443` - Kong API Gateway
- `http://192.168.0.11:54323` - Supabase Studio (Dashboard)
- `http://192.168.0.11:54321` - PostgREST API

**Rozwiązanie:**
- Spróbuj alternatywnych portów
- Sprawdź czy Docker kontenery działają na serwerze
- Sprawdź firewall na serwerze

---

**Weryfikowane przez:** Cursor AI  
**Narzędzia:** `test_supabase.py`, `check_migrations.py`

