[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('codex', 'claude')]
    [string]$Provider,

    [Parameter(Mandatory = $true)]
    [string]$PacketPath,

    [string]$WorkspacePath,
    [string]$Model,

    [ValidateSet('low', 'medium', 'high', 'xhigh', 'max', 'ultra')]
    [string]$Effort = 'xhigh',

    [ValidateSet('read-only', 'workspace-write', 'danger-full-access')]
    [string]$CodexSandbox = 'workspace-write',

    [ValidateSet('acceptEdits', 'auto', 'default', 'dontAsk', 'plan')]
    [string]$ClaudePermissionMode = 'acceptEdits',

    [string]$OutputRoot,
    [switch]$Execute
)

$ErrorActionPreference = 'Stop'

function Resolve-ExistingFile([string]$PathValue, [string]$Label) {
    if (-not (Test-Path -LiteralPath $PathValue -PathType Leaf)) { throw "${Label}:not_found:$PathValue" }
    return (Resolve-Path -LiteralPath $PathValue).Path
}

function Resolve-ExistingDirectory([string]$PathValue, [string]$Label) {
    if (-not (Test-Path -LiteralPath $PathValue -PathType Container)) { throw "${Label}:not_found:$PathValue" }
    return (Resolve-Path -LiteralPath $PathValue).Path.TrimEnd('\')
}

function Same-Path([string]$Left, [string]$Right) {
    return [string]::Equals(
        [System.IO.Path]::GetFullPath($Left).TrimEnd('\'),
        [System.IO.Path]::GetFullPath($Right).TrimEnd('\'),
        [System.StringComparison]::OrdinalIgnoreCase
    )
}

$packetFile = Resolve-ExistingFile $PacketPath 'packet'
$packet = Get-Content -Raw -LiteralPath $packetFile | ConvertFrom-Json

foreach ($field in @('schemaVersion', 'taskId', 'campaignId', 'roadmapId', 'sourceRevision', 'briefPath', 'constraints', 'target', 'packetHash')) {
    if ($null -eq $packet.$field) { throw "packet_missing:$field" }
}
if ($packet.schemaVersion -ne 2) { throw 'packet_schema:must_be_2' }
if ($packet.constraints.forkContext -ne $false) { throw 'packet_constraint:fork_context_must_be_false' }
if ($packet.constraints.childWorkersAllowed -ne $false) { throw 'packet_constraint:child_workers_must_be_false' }

$briefFile = Resolve-ExistingFile $packet.briefPath 'brief'
$packetWorkspace = Resolve-ExistingDirectory $packet.target.root 'packet_target_root'
if ($WorkspacePath) {
    $requestedWorkspace = Resolve-ExistingDirectory $WorkspacePath 'workspace'
    if (-not (Same-Path $requestedWorkspace $packetWorkspace)) {
        throw "workspace_mismatch:packet=$packetWorkspace requested=$requestedWorkspace"
    }
}
$workspace = $packetWorkspace

$gitRoot = (& git -C $workspace rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $gitRoot) { throw "workspace_not_git:$workspace" }
$gitRoot = $gitRoot.Trim().Replace('/', '\')
if (-not (Same-Path $gitRoot $workspace)) { throw "workspace_not_git_root:packet=$workspace git=$gitRoot" }
$head = (& git -C $workspace rev-parse HEAD).Trim()
$dirtyPaths = @(& git -C $workspace status --short)

$resultSchema = Resolve-ExistingFile (Join-Path $PSScriptRoot '..\assets\worker-result-v2.schema.json') 'result_schema'
$providerCommand = Get-Command $Provider -ErrorAction SilentlyContinue
if (-not $providerCommand) { throw "provider_cli_not_found:$Provider" }

if (-not $Model) {
    $Model = if ($Provider -eq 'codex') { 'gpt-5.6-terra' } else { 'claude-opus-4-8' }
}
if ($Provider -eq 'codex') {
    if ($Model -notin @('gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna')) { throw "codex_model_unsupported:$Model" }
} else {
    # Mirrors CLAUDE_MODELS in lib/providers/claude-cli.mjs. Specialist tiers stay at xhigh so their
    # observations remain comparable with the existing Opus 4.8 ledger entries.
    $claudeEfforts = @{
        'claude-opus-4-8'           = @('xhigh')
        'claude-opus-5'             = @('xhigh')
        'claude-sonnet-5'           = @('high', 'xhigh')
        'claude-haiku-4-5-20251001' = @('high', 'xhigh')
    }
    if (-not $claudeEfforts.ContainsKey($Model)) { throw "claude_model_unsupported:$Model" }
    if ($Effort -notin $claudeEfforts[$Model]) { throw "claude_effort_unsupported_for_model:${Model}:$Effort" }
}

if (-not $OutputRoot) {
    $safeTaskId = [regex]::Replace([string]$packet.taskId, '[^A-Za-z0-9._-]', '-')
    $OutputRoot = Join-Path (Split-Path -Parent $packetFile) ("worker-runs\{0}-{1}" -f $safeTaskId, (Get-Date -Format 'yyyyMMdd-HHmmss'))
}
$outputDirectory = [System.IO.Path]::GetFullPath($OutputRoot)

$prompt = @"
Execute the complete compiled Sola roadmap work packet at:
$packetFile

Read its brief at:
$briefFile

The packet is the frozen assignment. Complete every phase in this roadmap-sized packet, remain inside ownedOutputs, do not modify prohibitedPaths, reuse evidence exactly as its policy permits, and do not invent validation work or external gates. Continue through ordinary phases, tests, and commits without stopping for coordinator check-ins. Preserve existing user work. Commit bounded completed changes as the packet requires.

Return only one JSON object matching the supplied worker-result schema. Use packet identity verbatim. A worker result enters coordinator review and cannot verify, promote, accept, or canonize itself.
"@

if ($Provider -eq 'codex') {
    $arguments = @(
        'exec', '-', '-C', $workspace,
        '--model', $Model,
        '--config', ('model_reasoning_effort="{0}"' -f $Effort),
        '--sandbox', $CodexSandbox,
        '--ephemeral', '--json',
        '--output-schema', $resultSchema,
        '--output-last-message', (Join-Path $outputDirectory 'last-message.json')
    )
    $displayArguments = $arguments
    $transcriptName = 'transcript.jsonl'
} else {
    $schemaText = Get-Content -Raw -LiteralPath $resultSchema
    $arguments = @(
        '-p', '--model', $Model,
        '--effort', $Effort,
        '--permission-mode', $ClaudePermissionMode,
        '--no-session-persistence',
        '--output-format', 'json',
        '--json-schema', $schemaText
    )
    $displayArguments = @(
        '-p', '--model', $Model,
        '--effort', $Effort,
        '--permission-mode', $ClaudePermissionMode,
        '--no-session-persistence',
        '--output-format', 'json',
        '--json-schema', "@$resultSchema"
    )
    $transcriptName = 'transcript.json'
}

$launch = [ordered]@{
    schemaVersion = 1
    ready = $true
    execute = [bool]$Execute
    provider = $Provider
    executable = $providerCommand.Source
    model = $Model
    effort = $Effort
    packetPath = $packetFile
    packetHash = $packet.packetHash
    campaignId = $packet.campaignId
    roadmapId = $packet.roadmapId
    taskId = $packet.taskId
    workspace = $workspace
    workspaceHead = $head
    dirtyPaths = $dirtyPaths
    outputDirectory = $outputDirectory
    resultSchemaPath = $resultSchema
    arguments = $displayArguments
    boundaries = @('no-history', 'no-child-workers', 'worker-cannot-verify', 'worker-cannot-promote')
}

if (-not $Execute) {
    $launch | ConvertTo-Json -Depth 8
    exit 0
}

New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $outputDirectory 'prompt.md'), $prompt, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $outputDirectory 'launch.json'), (($launch | ConvertTo-Json -Depth 8) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))

$previousLocation = Get-Location
$previousErrorAction = $ErrorActionPreference
try {
    Set-Location -LiteralPath $workspace
    # Windows PowerShell 5.1 wraps each native stderr line in an ErrorRecord when the stream is
    # redirected; under 'Stop' the first such line terminates the script before the provider
    # finishes. Provider failure is decided by the exit code below, not by stderr chatter.
    $ErrorActionPreference = 'Continue'
    # Tee-Object has no -Encoding in 5.1 and writes UTF-16; keep the transcript UTF-8 like the other run files.
    $transcriptFile = Join-Path $outputDirectory $transcriptName
    $transcriptEncoding = [System.Text.UTF8Encoding]::new($false)
    $prompt | & $providerCommand.Source @arguments 2>&1 | ForEach-Object {
        $line = [string]$_
        [System.IO.File]::AppendAllText($transcriptFile, $line + [Environment]::NewLine, $transcriptEncoding)
        $line
    }
    $providerExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorAction
    Set-Location $previousLocation
}

if ($providerExitCode -ne 0) { throw "provider_failed:${Provider}:exit_${providerExitCode}:see_$outputDirectory" }

if ($Provider -eq 'claude') {
    $transcriptPath = Join-Path $outputDirectory $transcriptName
    $claudeEnvelope = Get-Content -Raw -LiteralPath $transcriptPath | ConvertFrom-Json
    $structuredResult = $claudeEnvelope.structured_output
    if ($null -eq $structuredResult -and $claudeEnvelope.result) {
        try { $structuredResult = $claudeEnvelope.result | ConvertFrom-Json } catch { }
    }
    if ($null -eq $structuredResult) { throw "claude_structured_result_missing:see_$transcriptPath" }
    [System.IO.File]::WriteAllText(
        (Join-Path $outputDirectory 'last-message.json'),
        (($structuredResult | ConvertTo-Json -Depth 12) + [Environment]::NewLine),
        [System.Text.UTF8Encoding]::new($false)
    )
}

[ordered]@{
    ok = $true
    provider = $Provider
    taskId = $packet.taskId
    packetHash = $packet.packetHash
    outputDirectory = $outputDirectory
    transcript = (Join-Path $outputDirectory $transcriptName)
    lastMessage = (Join-Path $outputDirectory 'last-message.json')
} | ConvertTo-Json -Depth 4
