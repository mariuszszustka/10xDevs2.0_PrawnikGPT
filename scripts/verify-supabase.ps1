# ============================================
# PrawnikGPT - Verify Supabase Connection
# ============================================
# Ten skrypt sprawdza połączenie z Supabase i wyświetla konfigurację
# ============================================

Write-Host "🔍 PrawnikGPT - Weryfikacja połączenia Supabase" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Sprawdź, czy plik .env istnieje
if (!(Test-Path ".env")) {
    Write-Host "❌ Plik .env nie istnieje!" -ForegroundColor Red
    Write-Host "📝 Skopiuj .env.example do .env i wypełnij danymi" -ForegroundColor Yellow
    exit 1
}

# Wczytaj zmienne z .env
Write-Host "📄 Wczytuję konfigurację..." -ForegroundColor Yellow
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.+)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

Write-Host "✅ Konfiguracja wczytana" -ForegroundColor Green
Write-Host ""

# Wyświetl konfigurację (bez wrażliwych danych)
Write-Host "📋 Aktualna konfiguracja:" -ForegroundColor Cyan
Write-Host "   SUPABASE_URL: $env:SUPABASE_URL" -ForegroundColor Gray
Write-Host "   OLLAMA_HOST: $env:OLLAMA_HOST" -ForegroundColor Gray
Write-Host "   API_BASE_URL: $env:API_BASE_URL" -ForegroundColor Gray

if ($env:SUPABASE_ANON_KEY) {
    $anonPreview = $env:SUPABASE_ANON_KEY.Substring(0, [Math]::Min(20, $env:SUPABASE_ANON_KEY.Length)) + "..."
    Write-Host "   SUPABASE_ANON_KEY: $anonPreview" -ForegroundColor Gray
}

if ($env:SUPABASE_SERVICE_KEY) {
    $servicePreview = $env:SUPABASE_SERVICE_KEY.Substring(0, [Math]::Min(20, $env:SUPABASE_SERVICE_KEY.Length)) + "..."
    Write-Host "   SUPABASE_SERVICE_KEY: $servicePreview" -ForegroundColor Gray
}

Write-Host ""

# Test 1: Połączenie HTTP do Supabase API
Write-Host "🧪 Test 1: Połączenie HTTP do Supabase" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$env:SUPABASE_URL/rest/v1/" -Method GET -Headers @{
        "apikey" = $env:SUPABASE_ANON_KEY
    } -TimeoutSec 5 -ErrorAction Stop
    
    Write-Host "   ✅ Połączenie HTTP działa (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Błąd połączenia HTTP: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Sprawdź, czy Supabase działa: $env:SUPABASE_URL" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: Połączenie do PostgreSQL (jeśli psql dostępny)
Write-Host "🧪 Test 2: Połączenie PostgreSQL" -ForegroundColor Cyan
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (!$psqlPath) {
    Write-Host "   ⚠️  psql nie jest zainstalowany - pomijam test PostgreSQL" -ForegroundColor Yellow
} elseif ([string]::IsNullOrEmpty($env:DATABASE_URL)) {
    Write-Host "   ⚠️  DATABASE_URL nie jest ustawiony - pomijam test" -ForegroundColor Yellow
} else {
    # Parsuj DATABASE_URL
    if ($env:DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
        $dbUser = $matches[1]
        $dbPass = $matches[2]
        $dbHost = $matches[3]
        $dbPort = $matches[4]
        $dbName = $matches[5]
        
        $env:PGPASSWORD = $dbPass
        
        try {
            $tables = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Połączenie PostgreSQL działa" -ForegroundColor Green
                Write-Host "   📊 Liczba tabel w public schema: $($tables.Trim())" -ForegroundColor Gray
                
                # Sprawdź, czy migracje zostały zastosowane
                $migrationTables = @('query_history', 'ratings', 'legal_acts', 'legal_act_chunks', 'legal_act_relations')
                $foundTables = @()
                
                foreach ($table in $migrationTables) {
                    $result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>&1
                    if ($result -match 't') {
                        $foundTables += $table
                    }
                }
                
                Write-Host ""
                Write-Host "   📋 Tabele z migracji:" -ForegroundColor Cyan
                foreach ($table in $migrationTables) {
                    if ($foundTables -contains $table) {
                        Write-Host "      ✅ $table" -ForegroundColor Green
                    } else {
                        Write-Host "      ❌ $table (brak)" -ForegroundColor Red
                    }
                }
                
                if ($foundTables.Count -eq 0) {
                    Write-Host ""
                    Write-Host "   ⚠️  Brak tabel z migracji!" -ForegroundColor Yellow
                    Write-Host "   💡 Uruchom: .\scripts\apply-migrations.ps1" -ForegroundColor Yellow
                }
            } else {
                Write-Host "   ❌ Błąd połączenia PostgreSQL" -ForegroundColor Red
            }
        } catch {
            Write-Host "   ❌ Błąd: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
Write-Host ""

# Test 3: Połączenie do OLLAMA (opcjonalne)
Write-Host "🧪 Test 3: Połączenie OLLAMA" -ForegroundColor Cyan
if ([string]::IsNullOrEmpty($env:OLLAMA_HOST)) {
    Write-Host "   ⚠️  OLLAMA_HOST nie jest ustawiony - pomijam test" -ForegroundColor Yellow
} else {
    try {
        $response = Invoke-WebRequest -Uri "$env:OLLAMA_HOST/api/version" -Method GET -TimeoutSec 5 -ErrorAction Stop
        $version = ($response.Content | ConvertFrom-Json).version
        Write-Host "   ✅ OLLAMA działa (Wersja: $version)" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Błąd połączenia OLLAMA: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   💡 Sprawdź, czy OLLAMA działa: $env:OLLAMA_HOST" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✨ Weryfikacja zakończona" -ForegroundColor Cyan
Write-Host ""

