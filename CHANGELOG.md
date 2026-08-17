# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Engineering Upgrade

### Added
- **`codeatlas doctor`**: Environment readiness checker for Node.js, Git, and all CodeAtlas components.
- **`.codeatlasignore`**: Per-repository ignore file with gitignore-compatible glob semantics and default path exclusions.
- **`.codeatlas/config.json`**: Optional project-level configuration for ignore patterns, analysis options, AI provider, and risk thresholds. Precedence: CLI → env → project config → defaults.
- **Explainable Risk Scoring**: Every risk score now includes named contributing factors and per-factor points instead of a raw number.
- **Hierarchical Architecture Views**: Auto-discovered modules and workspaces exposed as a drill-down tree on the dashboard.
- **Advanced Impact Analysis**: Transitive dependency resolution with `GraphEngine` caching to prevent redundant computation.
- **MCP Change Planning**: `codeatlas_plan_change` tool now includes existing patterns, related tests, and architectural context.
- **Existing Pattern Detection**: `PatternDetector` identifies usage patterns in the codebase to guide new feature placement.
- **Git History Intelligence**: `GitHistoryCollector` collects commit count, author count, churn rate, and last-modified date per file.
- **Architectural Hotspot Detection**: `HotspotDetector` combines structural metrics and git churn into a ranked hotspot list.
- **Benchmark Suite**: `scripts/benchmark/` generates reproducible fixture repositories for performance profiling.
- **Golden Fixtures**: `tests/golden.test.ts` deterministically verifies analysis output against 10 curated fixture repositories.
- **GitHub Actions Integration**: `codeatlas pr` command and `.github/workflows/codeatlas.yml` for automated PR impact analysis.
- **Dashboard `/api/risks` endpoint**: Full live risk calculation using `HotspotDetector` instead of placeholder data.
- **Developer Experience**: Structured `WHAT / WHY / HOW TO FIX IT` error messages across all CLI failure modes.

### Fixed
- Windows parallel test runner `EBUSY` race condition when multiple workers access the temp clone cache directory.
- TypeScript strict errors in `parser.ts`, `mcp.test.ts`, `analyze.ts`, and `pr.ts`.
- Dashboard `DependencyGraph` performance: referentially stable ReactFlow props prevent unnecessary layout re-renders.
- MCP and CLI index test isolation: `@codeatlas/database` mocked to prevent real SQLite access during parallel test runs.
- Spurious `null` file committed due to PowerShell `2>null` redirect; removed from repository.
- README CI badge URL pointed to wrong repository; corrected to `shubhamsinghcs/CodeAtlas`.
- README CLI commands section documented non-existent `--db` flag; corrected to actual available options.

## [0.1.0] - Initial Open-Source Release

### Added
- **Core CLI**: `codeatlas analyze`, `serve`, `impact`, `report`, and `mcp` commands.
- **AST Analyzer**: Deep static analysis for TypeScript, JavaScript, and Python using Tree-sitter.
- **Dependency Graph**: End-to-end tracing of internal package imports, identifying circular dependencies.
- **Risk Engine**: Calculates Fan-in, Fan-out, dependency depth, and overall structural fragility per file.
- **Impact Blast Radius**: Computes transitive dependencies to calculate the structural risk of changing a file.
- **Dashboard**: React-based interactive visualizer with filtering, search, and dynamic layout.
- **AI Integration**: OpenAI and Ollama support for generating deterministic architectural summaries.
- **MCP Server**: Native integration for Claude Desktop and Cursor.
- **Reports**: Markdown generation for architectural overviews.
