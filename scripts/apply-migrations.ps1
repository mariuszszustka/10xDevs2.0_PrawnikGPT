# ============================================
# PrawnikGPT - Apply Database Migrations
# ============================================
# Ten skrypt aplikuje wszystkie migracje na zdalną bazę Supabase
# ============================================

Write-Host "🚀 PrawnikGPT - Migracja bazy danych" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Sprawdź, czy plik .env istnieje
if (!(Test-Path ".env")) {
    Write-Host "❌ Błąd: Plik .env nie istnieje!" -ForegroundColor Red
    Write-Host "📝 Skopiuj .env.example do .env i wypełnij danymi:" -ForegroundColor Yellow
    Write-Host "   Copy-Item .env.example .env" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📖 Więcej informacji w SETUP_INSTRUCTIONS.md" -ForegroundColor Yellow
    exit 1
}

# Wczytaj zmienne z .env
Write-Host "📄 Wczytuję konfigurację z .env..." -ForegroundColor Yellow
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

# Sprawdź, czy DATABASE_URL jest ustawiony
if ([string]::IsNullOrEmpty($env:DATABASE_URL)) {
    Write-Host "❌ Błąd: DATABASE_URL nie jest ustawiony w .env!" -ForegroundColor Red
    Write-Host "📝 Dodaj do .env:" -ForegroundColor Yellow
    Write-Host "   DATABASE_URL=postgresql://postgres:<HASLO>@192.168.0.11:5432/postgres" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Konfiguracja wczytana" -ForegroundColor Green
Write-Host ""

# Opcja 1: Supabase CLI (jeśli obsługuje direct connection)
Write-Host "📦 Metoda 1: Supabase CLI" -ForegroundColor Cyan
Write-Host "Próba zastosowania migracji przez supabase db push..." -ForegroundColor Yellow
Write-Host ""

try {
    supabase db push --db-url $env:DATABASE_URL 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "✅ Migracje zastosowane pomyślnie przez Supabase CLI!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host ""
        Write-Host "⚠️  Supabase CLI nie działał. Próbuję metodą psql..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Supabase CLI nie zadziałał. Próbuję metodą psql..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Metoda 2: Bezpośrednie połączenie psql" -ForegroundColor Cyan
Write-Host ""

# Sprawdź, czy psql jest zainstalowany
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (!$psqlPath) {
    Write-Host "❌ psql nie jest zainstalowany!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Zainstaluj PostgreSQL Client:" -ForegroundColor Yellow
    Write-Host "   Opcja A: Scoop (zalecane)" -ForegroundColor Yellow
    Write-Host "     scoop install postgresql" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Opcja B: Pobierz z oficjalnej strony:" -ForegroundColor Yellow
    Write-Host "     https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Opcja C: Ręczne zastosowanie w Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "     1. Otwórz http://192.168.0.11:8444" -ForegroundColor Gray
    Write-Host "     2. Przejdź do SQL Editor" -ForegroundColor Gray
    Write-Host "     3. Skopiuj zawartość każdego pliku z supabase/migrations/" -ForegroundColor Gray
    Write-Host "     4. Wykonaj po kolei (sortując po nazwie)" -ForegroundColor Gray
    exit 1
}

# Parsuj DATABASE_URL
if ($env:DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
    $dbUser = $matches[1]
    $dbPass = $matches[2]
    $dbHost = $matches[3]
    $dbPort = $matches[4]
    $dbName = $matches[5]
    
    Write-Host "🔗 Parametry połączenia:" -ForegroundColor Cyan
    Write-Host "   Host: $dbHost" -ForegroundColor Gray
    Write-Host "   Port: $dbPort" -ForegroundColor Gray
    Write-Host "   Database: $dbName" -ForegroundColor Gray
    Write-Host "   User: $dbUser" -ForegroundColor Gray
    Write-Host ""
    
    # Ustaw hasło w zmiennej środowiskowej (psql czyta z PGPASSWORD)
    $env:PGPASSWORD = $dbPass
    
    # Znajdź wszystkie pliki migracji i posortuj je
    $migrations = Get-ChildItem supabase\migrations\*.sql | Sort-Object Name
    
    if ($migrations.Count -eq 0) {
        Write-Host "❌ Nie znaleziono plików migracji w supabase/migrations/" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📋 Znaleziono $($migrations.Count) migracji:" -ForegroundColor Green
    $migrations | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }
    Write-Host ""
    
    Write-Host "🚀 Aplikuję migracje..." -ForegroundColor Cyan
    Write-Host ""
    
    $successCount = 0
    $failCount = 0
    
    foreach ($migration in $migrations) {
        Write-Host "📄 $($migration.Name)" -ForegroundColor Yellow
        
        try {
            psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migration.FullName 2>&1 | ForEach-Object {
                Write-Host "   $_" -ForegroundColor Gray
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Sukces" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "   ❌ Błąd (kod: $LASTEXITCODE)" -ForegroundColor Red
                $failCount++
            }
        } catch {
            Write-Host "   ❌ Wyjątek: $($_.Exception.Message)" -ForegroundColor Red
            $failCount++
        }
        
        Write-Host ""
    }
    
    # Podsumowanie
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "📊 Podsumowanie:" -ForegroundColor Cyan
    Write-Host "   ✅ Sukces: $successCount" -ForegroundColor Green
    Write-Host "   ❌ Błędy: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($failCount -eq 0) {
        Write-Host "🎉 Wszystkie migracje zastosowane pomyślnie!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Weryfikacja - sprawdź tabele:" -ForegroundColor Yellow
        Write-Host "   psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c ""\dt""" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host "⚠️  Niektóre migracje zakończyły się błędem." -ForegroundColor Yellow
        Write-Host "📖 Sprawdź logi powyżej i napraw błędy." -ForegroundColor Yellow
        exit 1
    }
    
} else {
    Write-Host "❌ Nieprawidłowy format DATABASE_URL!" -ForegroundColor Red
    Write-Host "📝 Oczekiwany format:" -ForegroundColor Yellow
    Write-Host "   postgresql://user:password@host:port/database" -ForegroundColor Gray
    exit 1
}

