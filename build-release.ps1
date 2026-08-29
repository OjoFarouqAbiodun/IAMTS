# build-release.ps1 — Build the portable IAMTS release package.
#
# Produces a standalone, self-contained folder under `release/IAMTS/` that
# bundles the application source and a portable Node.js runtime, so it runs
# on any Windows x64 machine WITHOUT installing Node.js.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File build-release.ps1

$ErrorActionPreference = "Stop"

$Root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Cache  = Join-Path $env:TEMP "iamts-node-cache"
$NodeVer = "v22.14.0"
$NodeUrl = "https://nodejs.org/dist/$NodeVer/node-$NodeVer-win-x64.zip"
$NodeDir = Join-Path $Cache "node-$NodeVer-win-x64"

$OutDir = Join-Path $Root "release\IAMTS"

function Log($msg) { Write-Host $msg }

# --- 1. Ensure portable Node runtime ---
Log ""
Log "== Step 1/4: Prepare portable Node.js runtime ($NodeVer) =="
New-Item -ItemType Directory -Force -Path $Cache | Out-Null

if (-not (Test-Path "$NodeDir\node.exe")) {
    Log "Downloading $NodeVer ..."
    $zip = Join-Path $Cache "node.zip"
    Invoke-WebRequest -Uri $NodeUrl -OutFile $zip -UseBasicParsing
    Log "Extracting ..."
    Expand-Archive -Path $zip -DestinationPath $Cache -Force
} else {
    Log "[OK] Node runtime already cached."
}
if (-not (Test-Path "$NodeDir\node.exe")) {
    throw "Node runtime not found after download/extract: $NodeDir"
}

# --- 2. Prepare output directory ---
Log ""
Log "== Step 2/4: Prepare release folder =="
if (Test-Path $OutDir) { Remove-Item -Recurse -Force $OutDir }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# --- 3. Copy application source + node_modules ---
Log ""
Log "== Step 3/4: Copy application files =="
$CopyDirs = @("server", "client", "database", "docs")
foreach ($d in $CopyDirs) {
    if (Test-Path (Join-Path $Root $d)) {
        Copy-Item -Recurse -Force (Join-Path $Root $d) (Join-Path $OutDir $d)
        Log "  copied: $d"
    }
}
Copy-Item -Recurse -Force (Join-Path $Root "node_modules") (Join-Path $OutDir "node_modules")
Copy-Item -Force (Join-Path $Root "package.json") (Join-Path $OutDir "package.json")
Copy-Item -Force (Join-Path $Root "package-lock.json") (Join-Path $OutDir "package-lock.json")
if (Test-Path (Join-Path $Root ".env.example")) {
    Copy-Item -Force (Join-Path $Root ".env.example") (Join-Path $OutDir ".env.example")
}
Log "  copied: node_modules, package.json, .env.example"

# --- 4. Install bundled Node runtime + launchers ---
Log ""
Log "== Step 4/4: Install Node runtime + launchers =="
New-Item -ItemType Directory -Force -Path (Join-Path $OutDir "node") | Out-Null
Copy-Item -Recurse -Force (Join-Path $NodeDir "*") (Join-Path $OutDir "node")
Copy-Item -Force (Join-Path $Root "packaging\launcher\IAMTS.bat")  (Join-Path $OutDir "IAMTS.bat")
Copy-Item -Force (Join-Path $Root "packaging\launcher\install.bat") (Join-Path $OutDir "install.bat")
Copy-Item -Force (Join-Path $Root "packaging\launcher\RELEASE-README.md") (Join-Path $OutDir "README.md")

Log ""
Log "============================================================"
Log "  Release package created at:"
Log "    $OutDir"
Log ""
Log "  Run 'install.bat' once, then 'IAMTS.bat' to start."
Log "============================================================"
