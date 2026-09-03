[CmdletBinding()]
param(
    [string]$DestinationRoot = $(if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'skills' } else { 'C:\Users\jennb\.codex\skills' })
)

$ErrorActionPreference = 'Stop'
$source = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\skills\orchestrated-roadmap-builder'))
$destinationRootPath = [System.IO.Path]::GetFullPath($DestinationRoot)
$destination = Join-Path $destinationRootPath 'orchestrated-roadmap-builder'

foreach ($required in @('SKILL.md', 'references\execution-contract.md', 'references\vscode-cli.md', 'scripts\Invoke-OrchestratedWorker.ps1', 'assets\worker-result-v2.schema.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $required) -PathType Leaf)) {
        throw "source_missing:$required"
    }
}

$installStateRoot = Join-Path (Split-Path -Parent $destinationRootPath) 'skill-install-state\orchestrated-roadmap-builder'
$stage = Join-Path $installStateRoot "stage-$PID"
$backup = Join-Path $installStateRoot "backup-$(Get-Date -Format 'yyyyMMddHHmmss')"
if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $destinationRootPath -Force | Out-Null
New-Item -ItemType Directory -Path $stage -Force | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $stage -Recurse -Force

$files = Get-ChildItem -LiteralPath $stage -Recurse -File | Sort-Object FullName
$hashes = [ordered]@{}
foreach ($file in $files) {
    $relative = $file.FullName.Substring($stage.TrimEnd('\').Length + 1)
    $hashes[$relative] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifest = [ordered]@{
    schemaVersion = 1
    skill = 'orchestrated-roadmap-builder'
    installedAt = (Get-Date).ToUniversalTime().ToString('o')
    source = $source
    sourceCommit = $(try { (git -C ([System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))) rev-parse HEAD 2>$null).Trim() } catch { 'unavailable' })
    files = $hashes
}
[System.IO.File]::WriteAllText((Join-Path $stage 'INSTALL-MANIFEST.json'), (($manifest | ConvertTo-Json -Depth 8) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))

if (Test-Path -LiteralPath $destination) { Move-Item -LiteralPath $destination -Destination $backup }
Move-Item -LiteralPath $stage -Destination $destination

$installedManifest = Get-Content -Raw -LiteralPath (Join-Path $destination 'INSTALL-MANIFEST.json') | ConvertFrom-Json
foreach ($property in $installedManifest.files.PSObject.Properties) {
    $actual = (Get-FileHash -LiteralPath (Join-Path $destination $property.Name) -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $property.Value) { throw "install_hash_mismatch:$($property.Name)" }
}

[ordered]@{
    ok = $true
    destination = $destination
    backup = $(if (Test-Path -LiteralPath $backup) { $backup } else { $null })
    fileCount = @($installedManifest.files.PSObject.Properties).Count
    sourceCommit = $installedManifest.sourceCommit
} | ConvertTo-Json
