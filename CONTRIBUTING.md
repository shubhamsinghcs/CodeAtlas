# Contributing to CodeAtlas

First off, thank you for considering contributing to CodeAtlas! CodeAtlas aims to be the standard mapping tool for AI coding agents.

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0

## Setup

1. Fork the repository and clone it locally.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the monorepo packages:
   ```bash
   pnpm build
   ```

## Repository Structure

CodeAtlas is a pnpm monorepo.

- `apps/dashboard`: The React/Vite dashboard visualizer.
- `packages/analyzer`: The core AST parsing and dependency graph extraction logic.
- `packages/cli`: The terminal CLI (`codeatlas`).
- `packages/database`: SQLite database schema and persistence layer.
- `packages/risk-engine`: Algorithms for calculating structural metrics and fragility.
- `packages/ai`: Integration with LLMs for architectural summaries.
- `packages/mcp`: The Model Context Protocol server.
- `packages/shared`: Shared Zod schemas, types, and logging.

## Development Commands

Run these from the repository root:

- `pnpm dev`: Start the dashboard and CLI in watch mode.
- `pnpm test`: Run the Vitest test suite.
- `pnpm typecheck`: Validate TypeScript strictness across all packages.
- `pnpm lint`: Run ESLint.
- `pnpm build`: Generate production artifacts.

## Testing & Quality Expectations

All pull requests must pass the CI pipeline (`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`).

- **Write tests**: If you fix a bug, write a test to prevent regressions. If you add a feature, write tests to prove it works.
- **Type safety**: Avoid `any`. Use strict TypeScript interfaces.

## Adding Analyzer Support (New Languages)

To add support for a new language:
1. Add the Tree-sitter package to `packages/analyzer/package.json` (e.g., `tree-sitter-go`).
2. Create an adapter in `packages/analyzer/src/ast/`.
3. Add the grammar initialization to `packages/analyzer/src/ast/index.ts`.

## Commit Guidance

We prefer conventional commits (e.g., `feat: added python parser`, `fix: resolving path traversal`). Keep commits focused and logically separated.
