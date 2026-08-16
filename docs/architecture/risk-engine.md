# Risk Engine

The **CodeAtlas Risk Engine** calculates a deterministic 0–100 architectural risk score for source files. This score serves as a powerful heuristic for AI agents and human developers to prioritize refactoring and identify highly complex or brittle areas of the codebase.

> [!WARNING]
> A "High Risk" score does **not** constitute a formal security vulnerability, nor does it prove correctness bugs. It strictly measures the **architectural risk of making a change**, signaling that modifying the file has a high probability of causing downstream regressions due to its structural characteristics.

## Scoring Formula

The base score for any file is `0`. Points are cumulatively added based on the presence of various structural anti-patterns, up to a hard cap of `100`.

### Metrics & Default Weights

| Metric                    | Threshold          | Added Penalty | Rationale                                                                                                            |
| ------------------------- | ------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| **File Size**             | > 300 lines        | +20           | Large files typically violate the Single Responsibility Principle and are harder to safely reason about.             |
| **Missing Tests**         | No associated test | +20           | Code without unit tests is inherently dangerous to refactor.                                                         |
| **Circular Dependencies** | Yes                | +20           | Cycles tightly couple modules together, making isolated changes nearly impossible.                                   |
| **Fan-Out**               | > 7 dependencies   | +15           | A file importing many modules is fragile because any change in its dependencies might break it.                      |
| **Dependency Depth**      | > 5 levels         | +15           | Files sitting at the bottom of a deep dependency chain are notoriously hard to test or mock correctly.               |
| **Fan-In**                | > 10 dependents    | +10           | A file used by many other modules is a core utility. Changing it runs the risk of breaking widespread functionality. |

## Risk Levels

The total calculated score is mapped to a human-readable string:

- **0–39**: `Low Risk`
- **40–69**: `Medium Risk`
- **70–100**: `High Risk`

## Determinism and Explainability

CodeAtlas's risk evaluation is completely deterministic, unlike LLM-based scoring systems. The engine strictly returns identical scores for identical metrics, guaranteeing that CI/CD pipelines can reliably enforce risk budgets.

Furthermore, the engine always returns a precise `reasons` array containing strings directly correlated to the added points (e.g., `['high fan-in (15 dependents)', 'no related test']`). This explainability allows AI agents to justify their refactoring plans when communicating with the user.
