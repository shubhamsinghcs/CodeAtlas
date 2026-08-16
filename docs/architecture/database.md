# Database Architecture

CodeAtlas uses a powerful, local-first SQLite persistence layer to store and rapidly query the architectural context extracted from code repositories. This database enables AI agents to search across large codebases instantly without having to re-parse the files or rely on slow AST traversal at inference time.

## Technology Stack

- **Driver**: `better-sqlite3`, providing extremely fast synchronous execution for local CLI/Node environments.
- **ORM**: `drizzle-orm`, ensuring end-to-end type safety between the schema definitions and the execution queries.

## Schema Normalization

The schema is highly normalized to enforce data integrity through `CASCADE` deletion rules and strict foreign key relationships.

### Core Entities

1. **repositories**: Represents a source code location (local directory, git checkout, or remote GitHub URL).
2. **commits**: A snapshot in time of a repository.
3. **analysis_runs**: Tracks the execution state and lifecycle of an analysis attempt for a specific commit.

### Code Semantics

4. **files**: Represents individual source files discovered during an `analysis_run`.
5. **symbols**: AST-extracted structural elements (`functions`, `classes`, `methods`, `variables`) bound to a file. Exported symbols are flagged to distinguish module interfaces from internal implementations.
6. **imports**: Extracted dependency imports (`import { x } from 'y'`) linking files to external modules or internal dependencies.

### Extensibility Models (Future/Draft)

7. **tests**: Associates `symbols` or `files` with test suites.
8. **api_routes**: Discovered HTTP endpoints within the codebase.
9. **dependencies**: Project-level dependencies (`package.json` / `requirements.txt`).
10. **risks**: Security or architectural risks identified during analysis.
11. **ai_cache**: A high-performance Key-Value store for LLM responses and embeddings to prevent redundant API calls.

## Indexing Strategy

Indexes are applied extensively across hot-path columns:

- Searching for a symbol by `name`.
- Retrieving all elements by `file_id` or `run_id`.
- Graph queries, such as "Find all symbols belonging to a file that imports 'express'".

## Database Client

The `DatabaseClient` class orchestrates connections.

- It defaults to `:memory:` for testing or ephemeral runs, ensuring tests are hermetic and run instantly.
- It dynamically resolves and executes Drizzle migrations upon instantiation, eliminating the need for a separate `db:push` step for the end user.
- It uses SQLite WAL (Write-Ahead Logging) mode and foreign keys constraints enforced at the database level.
