# Repository Discovery

CodeAtlas implements a universal repository discovery layer in the `@codeatlas/analyzer` package that seamlessly handles both local codebases and remote GitHub repositories. This provides the foundational ingestion point for all downstream AST parsing and relationship generation.

## Input Resolution

The discovery layer automatically detects and categorizes the input:

- **Local Directories (`local_dir`)**: Scans a standard directory recursively. If it's located within a Git repository tree, the `commitHash` of the overarching Git root is recorded.
- **Local Git Repositories (`local_git`)**: Safely analyzes the local working tree while resolving its current `HEAD` commit.
- **GitHub URLs (`github_url`)**: Identifies public `https://github.com/...` or `git@github.com:...` URLs. The layer securely clones the repository into a deterministic local temporary cache (e.g., `os.tmpdir()/codeatlas-cache/[hash]`), extracting both the original URL and the resolved commit hash. This guarantees the user's original repositories are never directly modified.

## File Discovery & Filtering

The filesystem walker (`walker.ts`) recursively iterates through the repository while respecting strict ignore rules.

### Excluded Paths

By default, the following paths are entirely ignored to prevent irrelevant code ingestion and save computational resources:

- `.git`
- `node_modules`
- `dist`
- `build`
- `coverage`
- `.next`
- `__pycache__`
- `.venv`
- System/generated binaries

_Note: Additional configurable ignore paths can be supplied via `DiscoveryOptions`._

### Supported Languages

Only files matching the explicitly supported extensions are discovered:

- TypeScript: `.ts`, `.tsx`
- JavaScript: `.js`, `.jsx`, `.mjs`, `.cjs`
- Python: `.py`

### Extracted File Metadata

For every valid source file discovered, the following statistics are extracted:

- Relative path from the repository root
- Absolute system path
- File size (in bytes)
- Line count
- Target Language
- Test file status (identifying `__tests__`, `.test.ts`, `.spec.ts` conventions)
