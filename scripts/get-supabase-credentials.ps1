# ============================================
# Skrypt do pobrania danych dostępowych z Supabase (Docker)
# ============================================
# Ten skrypt łączy się z serwerem SSH i pobiera dane z docker-compose.yml lub zmiennych środowiskowych
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [string]$ServerIP = "192.168.0.11",
    
    [Parameter(Mandatory=$false)]
    [string]$SSHUser = "user"
)

Write-Host "🔐 Pobieranie danych dostępowych z Supabase" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Serwer: $ServerIP" -ForegroundColor Yellow
Write-Host ""

# Sprawdź, czy SSH jest dostępny
$sshPath = Get-Command ssh -ErrorAction SilentlyContinue
if (!$sshPath) {
    Write-Host "❌ SSH nie jest zainstalowany!" -ForegroundColor Red
    Write-Host "📥 Zainstaluj OpenSSH:" -ForegroundColor Yellow
    Write-Host "   Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Alternatywa: Użyj Opcji 2 poniżej (ręczne kopiowanie)" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔍 Próbuję pobrać dane przez SSH..." -ForegroundColor Yellow
Write-Host "💡 Jeśli zapyta o hasło, wprowadź hasło do konta: $SSHUser@$ServerIP" -ForegroundColor Gray
Write-Host ""

# Pobierz zmienne środowiskowe z kontenerów
Write-Host "📦 Sprawdzam zmienne środowiskowe w kontenerach..." -ForegroundColor Cyan
Write-Host ""

# ANON_KEY z kontenera Kong lub Auth
Write-Host "🔑 ANON_KEY:" -ForegroundColor Yellow
ssh "${SSHUser}@${ServerIP}" "docker exec supabase-kong env | grep -i 'ANON_KEY' || docker exec supabase-auth env | grep -i 'ANON_KEY' | head -1" 2>$null
Write-Host ""

# SERVICE_ROLE_KEY z kontenera Kong lub Auth
Write-Host "🔑 SERVICE_ROLE_KEY:" -ForegroundColor Yellow
ssh "${SSHUser}@${ServerIP}" "docker exec supabase-kong env | grep -i 'SERVICE.*KEY' || docker exec supabase-auth env | grep -i 'SERVICE.*KEY' | head -1" 2>$null
Write-Host ""

# JWT_SECRET z kontenera Auth
Write-Host "🔑 JWT_SECRET:" -ForegroundColor Yellow
ssh "${SSHUser}@${ServerIP}" "docker exec supabase-auth env | grep -i 'JWT_SECRET' | head -1" 2>$null
Write-Host ""

# Hasło do bazy PostgreSQL
Write-Host "🔑 POSTGRES_PASSWORD:" -ForegroundColor Yellow
ssh "${SSHUser}@${ServerIP}" "docker exec supabase-db env | grep -i 'POSTGRES_PASSWORD' | head -1" 2>$null
Write-Host ""

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ Gotowe!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Skopiuj powyższe wartości do pliku .env" -ForegroundColor Yellow
Write-Host ""

