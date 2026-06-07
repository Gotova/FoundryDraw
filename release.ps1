<#
.SYNOPSIS
  Baut ein ZIP-Release fuer FoundryDraw, erhoht die Versionsnummer,
  updatet README.md und pusht alles als GitHub Release.

.USAGE
  .\release.ps1          # Patch-Version erhoehen (z.B. 1.0.2 -> 1.0.3)
  .\release.ps1 -Minor   # Minor-Version erhoehen (z.B. 1.0.2 -> 1.1.0)
  .\release.ps1 -Major   # Major-Version erhoehen (z.B. 1.0.2 -> 2.0.0)
  .\release.ps1 -DryRun  # Nur anzeigen, was passieren wuerde

WICHTIG: Schreibt alle JSON/MD-Dateien als UTF-8 OHNE BOM,
         da Foundry VTT kein BOM in module.json akzeptiert.
#>

param(
  [switch]$Minor,
  [switch]$Major,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# UTF-8 ohne BOM -- in PowerShell 5.1 gibt es kein "utf8NoBOM",
# daher nutzen wir System.Text.UTF8Encoding direkt.
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-Utf8NoBom {
  param([string]$Path, [string]$Content)
  [System.IO.File]::WriteAllText(
    [System.IO.Path]::GetFullPath($Path),
    $Content,
    $utf8NoBom
  )
}

# ── 1. Version bump ──────────────────────────────────────────────────────────
$manifestRaw = [System.IO.File]::ReadAllText(
  [System.IO.Path]::GetFullPath("module.json"),
  $utf8NoBom
)
$manifest = $manifestRaw | ConvertFrom-Json
$oldVer   = $manifest.version
$ver      = [version]$oldVer

if ($Major) {
  $newVer = "$($ver.Major + 1).0.0"
} elseif ($Minor) {
  $newVer = "$($ver.Major).$($ver.Minor + 1).0"
} else {
  $newVer = "$($ver.Major).$($ver.Minor).$($ver.Build + 1)"
}

Write-Host "Version: $oldVer -> $newVer" -ForegroundColor Cyan
if ($DryRun) { Write-Host "[DryRun] Keine Aenderungen vorgenommen." -ForegroundColor Yellow; exit 0 }

# ── 2. module.json updaten (UTF-8 ohne BOM!) ─────────────────────────────────
$newManifest = $manifestRaw -replace '"version": "[^"]*"', "`"version`": `"$newVer`""
Write-Utf8NoBom "module.json" $newManifest
Write-Host "Updated module.json" -ForegroundColor Green

# ── 3. README.md Badge updaten ───────────────────────────────────────────────
if (Test-Path "README.md") {
  $readme = [System.IO.File]::ReadAllText(
    [System.IO.Path]::GetFullPath("README.md"), $utf8NoBom)
  $readme = $readme -replace '(?<=version-)\d+\.\d+\.\d+(?=-)', $newVer
  Write-Utf8NoBom "README.md" $readme
  Write-Host "Updated README.md (version badge)" -ForegroundColor Green
}

# ── 4. CHANGELOG.md: neuen Eintrag oben einfuegen ───────────────────────────
$today    = (Get-Date).ToString("yyyy-MM-dd")
$newEntry = "## $newVer - $today`r`n- (Bitte Aenderungen hier eintragen)`r`n`r`n"

if (Test-Path "CHANGELOG.md") {
  $cl = [System.IO.File]::ReadAllText(
    [System.IO.Path]::GetFullPath("CHANGELOG.md"), $utf8NoBom)
  $cl = $cl -replace '(# Changelog\r?\n)', "`$1`r`n$newEntry"
  Write-Utf8NoBom "CHANGELOG.md" $cl
  Write-Host "Updated CHANGELOG.md (added placeholder for v$newVer)" -ForegroundColor Green
}

# ── 5. ZIP bauen ─────────────────────────────────────────────────────────────
$zipName = "foundrydraw.zip"
if (Test-Path $zipName) { Remove-Item $zipName -Force }

$include = @("module.json","CHANGELOG.md","README.md","scripts","styles","lang")
$files   = @()
foreach ($item in $include) {
  if (Test-Path $item) { $files += (Get-Item $item).FullName }
}

Compress-Archive -Path $files -DestinationPath $zipName -CompressionLevel Optimal
Write-Host "Built $zipName" -ForegroundColor Green

# ── 6. Git commit + tag + push ───────────────────────────────────────────────
git add module.json README.md CHANGELOG.md foundrydraw.zip
git commit -m "Release v$newVer"
git tag "v$newVer"
git push origin main
git push origin "v$newVer"
Write-Host "Pushed to GitHub" -ForegroundColor Green

# ── 7. GitHub Release erstellen ──────────────────────────────────────────────
$notes = "## v$newVer`n`nSiehe [CHANGELOG.md](https://github.com/Gotova/FoundryDraw/blob/main/CHANGELOG.md) fuer alle Aenderungen."
gh release create "v$newVer" foundrydraw.zip module.json `
  --title "v$newVer" `
  --notes $notes

Write-Host ""
Write-Host "Release v$newVer veroeffentlicht!" -ForegroundColor Magenta
Write-Host "https://github.com/Gotova/FoundryDraw/releases/tag/v$newVer"
Write-Host ""
Write-Host "Vergiss nicht: CHANGELOG.md mit echten Aenderungen befuellen und erneut pushen." -ForegroundColor Yellow
