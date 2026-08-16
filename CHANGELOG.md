# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
