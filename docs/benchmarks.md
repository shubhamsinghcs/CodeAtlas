# CodeAtlas Performance Benchmarks

These benchmarks run on synthetic repositories to honestly measure CodeAtlas performance and guard against accidental regressions.

| Fixture | Files | Repo Size | Symbols | Deps | DB Size | Time (ms) |
|---|---|---|---|---|---|---|
| Small JS | 100 | 26 KB | 200 | 485 | 252 KB | **1328** |
| Medium TS | 1000 | 281 KB | 2000 | 4985 | 1456 KB | **14017** |
| Medium TS Monorepo | 999 | 276 KB | 1998 | 4950 | 1464 KB | **11009** |
| Medium Python | 1000 | 136 KB | 1000 | 4985 | 1256 KB | **6074** |
| Large TS Monorepo | 4998 | 1421 KB | 9996 | 24945 | 6988 KB | **52050** |

*Note: Time measured is total end-to-end wall-clock time for the `analyze` command, including database I/O. Memory is bounded by node's garbage collector. Results were generated automatically.*
