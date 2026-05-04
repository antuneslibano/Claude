# Setup do Agente Computer Use
# Execute este script após instalar o Python

Write-Host "=== Setup do Agente Computer Use ===" -ForegroundColor Cyan

# Verificar Python
try {
    $version = python --version 2>&1
    Write-Host "Python encontrado: $version" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Python nao encontrado. Instale com:" -ForegroundColor Red
    Write-Host "  winget install --id Python.Python.3.12 -e --source winget" -ForegroundColor Yellow
    exit 1
}

# Instalar dependências
Write-Host "`nInstalando dependencias..." -ForegroundColor Cyan
pip install -r "$PSScriptRoot\requirements.txt"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao instalar dependencias." -ForegroundColor Red
    exit 1
}

# Configurar chave da API
Write-Host "`nConfigurando chave da API..." -ForegroundColor Cyan
$apiKey = Read-Host "Cole sua chave ANTHROPIC_API_KEY (sk-ant-...)"

if ($apiKey -notmatch "^sk-ant-") {
    Write-Host "Chave invalida. Deve comecar com 'sk-ant-'" -ForegroundColor Red
    exit 1
}

# Salvar no perfil PowerShell (permanente)
$profileDir = Split-Path $PROFILE -Parent
if (-not (Test-Path $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force | Out-Null }
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }

$envLine = "`$env:ANTHROPIC_API_KEY = '$apiKey'"
$content = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue

if ($content -notmatch "ANTHROPIC_API_KEY") {
    Add-Content $PROFILE "`n# Chave da API Anthropic`n$envLine"
    Write-Host "Chave salva no perfil PowerShell." -ForegroundColor Green
} else {
    Write-Host "Chave ja configurada no perfil." -ForegroundColor Yellow
}

# Ativar para sessao atual
$env:ANTHROPIC_API_KEY = $apiKey

Write-Host "`n=== Setup concluido! ===" -ForegroundColor Green
Write-Host "Para usar o agente, execute:" -ForegroundColor Cyan
Write-Host "  cd computer_use" -ForegroundColor White
Write-Host "  python agent.py `"abra o Unity e crie um novo projeto chamado MeuJogo`"" -ForegroundColor White
