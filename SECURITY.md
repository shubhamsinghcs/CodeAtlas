# Security Policy

CodeAtlas is designed with a **local-first** security architecture. We treat the repository source code being analyzed as **untrusted input**.

## Local-First Architecture

- CodeAtlas parses code statically using ASTs (Tree-sitter). It **never executes** the code it analyzes.
- The default behavior is entirely offline. Your source code and architectural metadata never leave your machine unless you explicitly configure an external AI provider.
- All extracted data is stored in a local SQLite database (`.codeatlas/codeatlas.db`) within the repository being analyzed.

## External AI Provider Behavior

If you configure an external AI Provider (e.g., setting `AI_PROVIDER=openai` and providing an `AI_API_KEY`), CodeAtlas will send the structural metadata (symbols, imports, file names) to the provider.
- Source code contents are generally not uploaded, though file-level context requests via the MCP server may transmit the contents of specifically requested files.
- You can completely disable external transmission by either unsetting the environment variables or by pointing CodeAtlas to a local Ollama instance (`AI_PROVIDER=ollama`).

## Reporting a Vulnerability

If you discover a security vulnerability in CodeAtlas, please do not disclose it publicly.

Instead, please send an email to `security@codeatlas.dev` or create a GitHub Security Advisory. We will respond within 48 hours to acknowledge the report.

### Scope

The following are in scope for security reports:
- Remote Code Execution (RCE) via malicious repository contents.
- Path traversal escapes during repository analysis.
- Shell injection vulnerabilities during Git history traversal.
- Unintentional data exfiltration.
