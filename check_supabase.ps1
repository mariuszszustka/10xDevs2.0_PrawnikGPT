# Quick Supabase Health Check for PrawnikGPT
# Sprawdza czy Supabase jest dostępny

Write-Host "`n" -NoNewline
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "=" * 58 -NoNewline
Write-Host "=" -ForegroundColor Cyan
Write-Host "  Weryfikacja Supabase - PrawnikGPT" -ForegroundColor Yellow
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "=" * 58 -NoNewline
Write-Host "=" -ForegroundColor Cyan

# Load .env
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "`n   Wczytano konfiguracje z .env" -ForegroundColor Gray
} else {
    Write-Host "`n   Brak pliku .env" -ForegroundColor Red
    exit 1
}

$supabaseUrl = $env:PUBLIC_SUPABASE_URL
if (-not $supabaseUrl) {
    $supabaseUrl = $env:SUPABASE_URL
}

Write-Host "`n   URL: " -NoNewline -ForegroundColor Gray
Write-Host $supabaseUrl -ForegroundColor White

# Test connection
Write-Host "`n   Testowanie polaczenia..." -ForegroundColor Gray

try {
    # Skip certificate validation for self-signed certs (PowerShell 5.1 compatible)
    if (-not ([System.Management.Automation.PSTypeName]'ServerCertificateValidationCallback').Type) {
        $certCallback = @"
        using System;
        using System.Net;
        using System.Net.Security;
        using System.Security.Cryptography.X509Certificates;
        public class ServerCertificateValidationCallback {
            public static void Ignore() {
                if(ServicePointManager.ServerCertificateValidationCallback == null) {
                    ServicePointManager.ServerCertificateValidationCallback += 
                        delegate (
                            Object obj, 
                            X509Certificate certificate, 
                            X509Chain chain, 
                            SslPolicyErrors errors
                        ) {
                            return true;
                        };
                }
            }
        }
"@
        Add-Type $certCallback
    }
    [ServerCertificateValidationCallback]::Ignore()
    
    $response = Invoke-WebRequest -Uri "$supabaseUrl/health" `
        -Method GET `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "   Status: " -NoNewline -ForegroundColor Gray
    Write-Host $response.StatusCode -ForegroundColor Green
    Write-Host "`n   Supabase dziala poprawnie!" -ForegroundColor Green
    exit 0
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 401) {
        Write-Host "   Status: " -NoNewline -ForegroundColor Gray
        Write-Host "401 (Unauthorized)" -ForegroundColor Yellow
        Write-Host "`n   Supabase dziala poprawnie!" -ForegroundColor Green
        Write-Host "   (401 jest OK - endpoint /health wymaga auth)" -ForegroundColor Gray
        exit 0
    }
    elseif ($statusCode -eq 400) {
        Write-Host "   Status: " -NoNewline -ForegroundColor Gray
        Write-Host "400 (Bad Request)" -ForegroundColor Red
        Write-Host "`n   Blad: Prawdopodobnie HTTP na porcie HTTPS" -ForegroundColor Red
        Write-Host "   Rozwiazanie: Zmien http:// na https:// w .env" -ForegroundColor Yellow
        exit 1
    }
    else {
        Write-Host "   Blad: " -NoNewline -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        
        Write-Host "`n   Mozliwe przyczyny:" -ForegroundColor Yellow
        Write-Host "   1. Supabase nie jest uruchomiony na $supabaseUrl" -ForegroundColor Gray
        Write-Host "   2. Port jest zablokowany przez firewall" -ForegroundColor Gray
        Write-Host "   3. Nieprawidlowy adres URL w .env" -ForegroundColor Gray
        
        Write-Host "`n   Sprobuj alternatywnych portow:" -ForegroundColor Yellow
        Write-Host "   - https://192.168.0.11:8443 (Kong Gateway)" -ForegroundColor Gray
        Write-Host "   - http://192.168.0.11:54323 (Studio)" -ForegroundColor Gray
        Write-Host "   - http://192.168.0.11:54321 (REST API)" -ForegroundColor Gray
        exit 1
    }
}

Write-Host "`n" -NoNewline

