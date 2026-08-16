# CodeAtlas Architecture

CodeAtlas is a full-stack, local-first monorepo built using `pnpm` workspaces, TypeScript, and SQLite.

## Workspace Packages

1. **`@codeatlas/database`**
   - Central persistence layer using `better-sqlite3` and `drizzle-orm`.
   - Stores files, symbols, import edges, analysis runs, and aggressive LLM caching (`ai_cache`).

2. **`@codeatlas/analyzer`**
   - The core static analysis engine.
   - Uses `ts-morph` and the TypeScript Compiler API to walk ASTs, discovering symbols, exports, and dependencies.
   - Includes the **Impact Analyzer** and deterministic **Graph Engine** for finding paths and cycles.

3. **`@codeatlas/risk-engine`**
   - Pure, deterministic scoring algorithm.
   - Weights Fan-In, Fan-Out, Depth, and Circular Dependencies to assess the fragility and test-requirement of specific files.

4. **`@codeatlas/ai`**
   - A highly strictly typed wrapper for LLM calls.
   - Uses `zod` and `zod-to-json-schema` to enforce structural responses.
   - Designed to run offline locally using Ollama (`AI_BASE_URL`) or cloud models.

5. **`@codeatlas/mcp`**
   - The official Model Context Protocol server.
   - Serves analytical tools (`search_symbols`, `get_impact`) to external agents via `stdio` or HTTP.

6. **`@codeatlas/cli`**
   - `commander` based CLI orchestrating all subsystems.
   - Hosts the `hono` HTTP server serving the dashboard API.

## Frontend App

- **`@codeatlas/dashboard`**
   - Vite + React + React Flow.
   - Displays real-time data from the `hono` backend.
   - Uses bespoke CSS styling, explicitly shunning generic template designs.
