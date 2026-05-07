#!/usr/bin/env pwsh
# PowerShell 7 向け Docker permission probe runner。
#
# 使い方:
#   pwsh -File .\tests\docker\run.ps1
#   または
#   .\tests\docker\run.ps1
#
# run.sh と同じことを PowerShell から行う。Docker Desktop の Linux container
# モードを前提とする (Windows container では動かない)。

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$probePath = (Resolve-Path (Join-Path $PSScriptRoot 'probe.sh')).Path
$repoRoot  = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$image     = 'codex-review:probe'

Write-Host "== build $image ==" -ForegroundColor Cyan
docker build --quiet -t $image $repoRoot | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host '  build failed' -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host '  built'

Write-Host ''
Write-Host '== run probe ==' -ForegroundColor Cyan

# `--mount` の値はカンマ区切りなので Windows パス (C:\...) もそのまま入れられる。
# `-v` を使うと `:` が host:container 区切りと衝突するため使わない。
$mountSpec = "type=bind,source=$probePath,target=/probe.sh,readonly"

# PowerShell 7 のネイティブコマンド引数渡しは引用符の扱いが Legacy / Standard で
# 揺れるため、配列で splat して曖昧さを排除する。
$cliArgs = @(
    'run', '--rm',
    '--entrypoint', 'sh',
    '--mount', $mountSpec,
    $image, '/probe.sh'
)

Write-Host ("  docker " + ($cliArgs -join ' '))
& docker @cliArgs
$exitCode = $LASTEXITCODE

Write-Host ''
if ($exitCode -eq 0) {
    Write-Host '== done ==' -ForegroundColor Green
} else {
    Write-Host "== probe failed (exit $exitCode) ==" -ForegroundColor Red
    exit $exitCode
}
