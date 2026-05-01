# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## GitHub Repository

This workspace is synced to: https://github.com/antuneslibano/Claude

**Auto-sync is active.** A `Stop` hook in `.claude/settings.local.json` automatically commits and pushes all changes to GitHub at the end of every Claude Code session. No manual git commands are needed.

To manually sync at any time:
```powershell
git add .
git commit -m "Manual update"
git push
```

## Uso de Contexto

O limite de uso de 5 em 5 horas (quota por sessão) é controlado pelos servidores da Anthropic e **não é acessível programaticamente**. Para acompanhar o consumo, o usuário deve verificar diretamente no Claude Code (barra de status) ou em claude.ai nas configurações de uso.

## Setup (for new machines)

1. Install GitHub CLI: `winget install --id GitHub.cli`
2. Authenticate: `gh auth login`
3. The remote is already configured — just clone and open in Claude Code.
