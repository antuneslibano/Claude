# Setup do Agente Computer Use
# Execute este script apos instalar o Python

Write-Host "=== Setup do Agente Computer Use ===" -ForegroundColor Cyan

# Encontrar executavel real do Python (ignora alias da Microsoft Store)
$pythonCmd = $null
foreach ($candidate in @("py", "python3", "python")) {
    $found = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($found) {
        # Testar se e o alias da Store (retorna codigo de saida 9009) ou Python real
        $testOutput = & $candidate --version 2>&1
        if ($testOutput -match "Python \d+\.\d+") {
            $pythonCmd = $candidate
            Write-Host "Python encontrado ($candidate): $testOutput" -ForegroundColor Green
            break
        }
    }
}

if (-not $pythonCmd) {
    Write-Host "`nPython nao encontrado. Instalando via winget..." -ForegroundColor Yellow
    winget install --id Python.Python.3.12 -e --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nFalha no winget. Baixe manualmente em: https://www.python.org/downloads/" -ForegroundColor Red
        Write-Host "Marque 'Add Python to PATH' durante a instalacao." -ForegroundColor Yellow
        Write-Host "Apos instalar, abra um novo terminal e rode este script novamente." -ForegroundColor Yellow
        exit 1
    }
    # Atualizar PATH para a sessao atual
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $pythonCmd = "python"
    Write-Host "Python instalado com sucesso!" -ForegroundColor Green
}

# Garantir pip atualizado
Write-Host "`nAtualizando pip..." -ForegroundColor Cyan
& $pythonCmd -m pip install --upgrade pip --quiet

# Instalar dependencias
Write-Host "Instalando dependencias..." -ForegroundColor Cyan
& $pythonCmd -m pip install -r "$PSScriptRoot\requirements.txt"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO ao instalar dependencias." -ForegroundColor Red
    exit 1
}

Write-Host "Dependencias instaladas!" -ForegroundColor Green

# Configurar chave da API
Write-Host "`nConfigurando chave da API Anthropic..." -ForegroundColor Cyan
Write-Host "Obtenha sua chave em: console.anthropic.com -> API Keys" -ForegroundColor Gray
$apiKey = Read-Host "Cole sua chave (sk-ant-...)"

if ($apiKey -notmatch "^sk-ant-") {
    Write-Host "Chave invalida. Deve comecar com 'sk-ant-'" -ForegroundColor Red
    exit 1
}

# Salvar no perfil PowerShell (permanente)
$profileDir = Split-Path $PROFILE -Parent
if (-not (Test-Path $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force | Out-Null }
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }

$content = Get-Content $PROFILE -Raw -ErrorAction SilentlyContinue
$envLine = "`$env:ANTHROPIC_API_KEY = '$apiKey'"

if ($content -match "ANTHROPIC_API_KEY") {
    # Atualizar chave existente
    $newContent = $content -replace '\$env:ANTHROPIC_API_KEY = ''[^'']*''', $envLine
    Set-Content $PROFILE $newContent -Encoding utf8
    Write-Host "Chave atualizada no perfil PowerShell." -ForegroundColor Green
} else {
    Add-Content $PROFILE "`n# Chave da API Anthropic`n$envLine"
    Write-Host "Chave salva no perfil PowerShell." -ForegroundColor Green
}

# Ativar para sessao atual
$env:ANTHROPIC_API_KEY = $apiKey

Write-Host "`n=== Setup concluido! ===" -ForegroundColor Green
Write-Host "`nPara usar o agente:" -ForegroundColor Cyan
Write-Host "  cd C:\Users\antun\Downloads\Claude\computer_use" -ForegroundColor White
Write-Host "  $pythonCmd agent.py `"abra o Unity e crie um projeto 2D chamado MeuJogo`"" -ForegroundColor White
