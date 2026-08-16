# CodeAtlas

[![CI](https://github.com/codeatlas/codeatlas/actions/workflows/ci.yml/badge.svg)](https://github.com/codeatlas/codeatlas/actions)
[![npm version](https://img.shields.io/npm/v/@codeatlas/cli.svg)](https://www.npmjs.com/package/@codeatlas/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> "Give your AI coding agent a map before it edits your code."

AI coding agents are powerful, but they often hallucinate imports, break fragile architectures, or modify code without understanding the structural blast radius.

**CodeAtlas** analyzes your local repository first and exposes architecture, dependencies, risk, and change impact directly to you and your AI tools.

![CodeAtlas Dashboard](docs/images/dashboard-overview.png)
*(See `docs/demo` for a complete walkthrough)*

## Quick Start

Run CodeAtlas in any project directory. It requires zero configuration.

```bash
npx @codeatlas/cli analyze .
npx @codeatlas/cli serve
```

Open `http://localhost:3000` to explore your repository's architecture, risk profile, and dependency graph.

## Features

- **AST-Based Static Extraction**: Parses TypeScript, JavaScript, and Python directly via Tree-sitter ASTs. Zero code execution.
- **Hierarchical Architecture Exploration**: Auto-discovers modules and workspaces, allowing drill-down from Repository ➔ Module ➔ File ➔ Symbol.
- **Dependency Graph Engine**: Traces deep imports to find dependency cycles and Fan-in/Fan-out metrics.
- **Risk Evaluation Engine**: Deterministically calculates fragility and testing needs for every file.
- **Impact Blast Radius**: Computes transitive dependencies to calculate the structural risk of modifying any file.
- **Model Context Protocol (MCP)**: Native integration with Claude Desktop or Cursor.
- **Local-First & Private**: Your source code never leaves your machine unless you explicitly configure an external AI provider.

### Architectural Risk Heuristic

CodeAtlas calculates an **Architectural Risk Heuristic** for every file. This score (0-100) is deterministically computed based on specific contributing factors. 

**Note**: This is an architectural heuristic, not a security guarantee, vulnerability score, or correctness proof.

**Risk Factors and Normalization**:
- **High fan-in**: File has many dependents (max +10 pts).
- **High fan-out**: File imports many modules (max +15 pts).
- **Dependency depth**: File is deeply nested in the graph (max +15 pts).
- **Large file**: Exceeds size thresholds (max +20 pts).
- **Missing tests**: No related test files detected nearby (max +20 pts).
- **Circular dependency**: File is part of a dependency cycle (max +20 pts).

The raw points are summed, and the final score is strictly capped at a maximum of `100`.

- **Low Risk**: 0-39
- **Medium Risk**: 40-69
- **High Risk**: 70-100

## Installation

```bash
# Install globally
npm install -g @codeatlas/cli

# Or run via npx
npx @codeatlas/cli --help
```

## Supported Languages

Currently supported for deep AST analysis:
- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)
- Python (`.py`)

## CLI Commands

- `codeatlas analyze [path]`: Parse the AST and construct the SQLite cache.
- `codeatlas serve`: Spin up the interactive React dashboard.
- `codeatlas impact <file>`: Assess the blast radius of changing a specific file.
- `codeatlas report`: Generate a comprehensive markdown architectural document.
- `codeatlas mcp`: Run the Model Context Protocol stdio server.
- `codeatlas doctor`: Verify environment readiness for CodeAtlas.

## Ignoring Files

CodeAtlas automatically respects `.codeatlasignore` files placed at the root of your repository. It uses standard `.gitignore` glob semantics.

By default, the following directories are automatically ignored to ensure fast analysis:
- `.git`
- `node_modules`
- `dist`
- `build`
- `coverage`
- `.next`
- `__pycache__`
- `.venv`

**Example `.codeatlasignore`:**
```gitignore
# Ignore all generated type definitions
*.generated.ts

# Ignore a specific vendor folder
vendor/
```

## AI Providers

CodeAtlas can enhance its structural data with LLM-generated architectural summaries and implementation plans.

To enable AI features, set the following environment variables:

```bash
export AI_PROVIDER=openai
export AI_API_KEY=sk-...
export AI_MODEL=gpt-4o
```

Supports any OpenAI-compatible endpoint (including Ollama for 100% local operation).

## MCP Integration

CodeAtlas implements the Model Context Protocol (MCP) to provide context directly to AI assistants.

**Claude Desktop Configuration:**

## GitHub Actions Integration

CodeAtlas can automatically analyze Pull Requests and report the change impact as a PR comment. It runs entirely locally inside the GitHub runner. No source code is sent to an external SaaS, and no secrets are required (other than the standard `GITHUB_TOKEN`).

Create `.github/workflows/codeatlas.yml`:

```yaml
name: CodeAtlas PR Impact Analysis
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  codeatlas-analysis:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write # Required to post comments on the PR
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for git diff

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run CodeAtlas Analyze
        run: npx @codeatlas/cli@latest analyze .

      - name: Run CodeAtlas PR Impact
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx @codeatlas/cli@latest pr
```

## Configuration:

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codeatlas": {
      "command": "npx",
      "args": ["-y", "@codeatlas/cli", "mcp"]
    }
  }
}
```

## Troubleshooting

CodeAtlas provides detailed error messages to help you quickly resolve issues. 
If an error occurs, you can run any command with the `--verbose` flag to view the full stack trace.

**Common Errors:**
- **Git is not installed or not in PATH**: CodeAtlas requires Git to collect history and clone repositories. Install Git from https://git-scm.com/downloads.
- **No supported source files found**: Ensure your repository contains TypeScript, JavaScript, or Python files and they aren't ignored by `.codeatlasignore`.
- **Database corruption detected**: Delete the `codeatlas.db` file in your directory and run `codeatlas analyze` again.
- **Network failure during clone or API request**: Check your internet connection or verify your GitHub SSH keys and API keys.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on setting up the monorepo, adding new language parsers, and our pull request process.

## Privacy & Security

CodeAtlas treats your repository as untrusted input. We do not execute your code, and we do not upload your code anywhere by default. See [SECURITY.md](SECURITY.md) for details.

## License

MIT License. See [LICENSE](LICENSE) for details.
