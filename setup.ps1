$ErrorActionPreference = "Stop"

$packages = @(
    "packages/cli",
    "packages/analyzer",
    "packages/database",
    "packages/risk-engine",
    "packages/ai",
    "packages/mcp",
    "packages/shared",
    "apps/dashboard"
)

foreach ($pkg in $packages) {
    $name = $pkg -replace 'packages/', '@codeatlas/' -replace 'apps/', '@codeatlas/'
    $pkgJsonPath = "$pkg/package.json"
    $pkgJsonContent = @"
{
  "name": "$name",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src/"
  }
}
"@
    Set-Content -Path $pkgJsonPath -Value $pkgJsonContent

    $tsConfigPath = "$pkg/tsconfig.json"
    $tsConfigContent = @"
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
"@
    Set-Content -Path $tsConfigPath -Value $tsConfigContent
    
    New-Item -ItemType Directory -Force -Path "$pkg/src" | Out-Null
    Set-Content -Path "$pkg/src/index.ts" -Value "export {}"
}

$markdownFiles = @(
    "CONTRIBUTING.md",
    "SECURITY.md",
    "CHANGELOG.md",
    "CODE_OF_CONDUCT.md",
    "README.md",
    "docs/architecture/README.md",
    "docs/demo/README.md",
    "docs/development/README.md",
    ".github/pull_request_template.md"
)

foreach ($file in $markdownFiles) {
    $title = Split-Path -Leaf $file -Base
    Set-Content -Path $file -Value "# $title"
}

Set-Content -Path "LICENSE" -Value "MIT License"
Set-Content -Path ".env.example" -Value "OPENAI_API_KEY="
Set-Content -Path ".dockerignore" -Value "node_modules`ndist"
Set-Content -Path "Dockerfile" -Value "FROM node:22-alpine`nWORKDIR /app"
Set-Content -Path ".gitignore" -Value "node_modules`ndist`n.env"

New-Item -ItemType File -Force -Path ".github/workflows/ci.yml" | Out-Null
Set-Content -Path ".github/workflows/ci.yml" -Value @"
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
"@

