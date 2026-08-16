# AST Analysis Engine

CodeAtlas incorporates a powerful, language-agnostic Abstract Syntax Tree (AST) analysis engine. This engine parses source files to extract key structural entities—such as functions, classes, methods, variables, and imports—thereby establishing the architectural context required for AI coding agents.

## Core Principles

1. **Language-Agnostic Output**: Regardless of the underlying source language (TypeScript, JavaScript, or Python), the engine yields a normalized `AstAnalysisResult`. This guarantees that downstream CodeAtlas components do not need to concern themselves with language-specific intricacies.
2. **Resilience**: The engine leverages [Tree-sitter](https://tree-sitter.github.io/tree-sitter/), a robust incremental parser. A malformed file containing syntax errors will gracefully return a partially constructed tree or set a `hasSyntaxErrors` flag without halting the repository-wide analysis.
3. **Targeted Extraction**: Rather than parsing the entire syntax tree into an exhaustive object model, we use precise Tree-sitter query languages to extract only high-value architectural symbols.

## Universal AST Model

Every analyzed file returns the following structure:

```typescript
export interface SymbolDefinition {
  name: string;
  type: 'function' | 'class' | 'method' | 'variable';
  range: { startLine: number; endLine: number };
  isExported: boolean;
}

export interface ImportDefinition {
  source: string;
  symbols: string[];
  range: { startLine: number; endLine: number };
}

export interface AstAnalysisResult {
  filePath: string;
  language: string;
  symbols: SymbolDefinition[];
  imports: ImportDefinition[];
  hasSyntaxErrors: boolean;
}
```

## Language Adapters

The engine employs specialized adapters for each supported language, utilizing Tree-sitter's pattern-matching query API:

### JavaScript & TypeScript

- Queries capture `class_declaration`, `function_declaration`, `method_definition`, and `import_statement`.
- By identifying nodes nested within an `export_statement`, the adapter accurately flags which symbols are exposed to the broader module graph.
- _Note:_ In TypeScript, the grammar diverges slightly by designating `type_identifier` for class names, which the query dynamically accommodates.

### Python

- Python relies heavily on indentation blocks. Methods are identified by querying for `function_definition` nodes situated inside the `block` of a `class_definition`.
- Imports track both `import x` (`import_statement`) and `from y import z` (`import_from_statement`).
- In Python, all top-level symbols are accessible; however, those prefixed with an underscore (`_`) are conventionally treated as private and are not marked as exported.

## Error Handling

Tree-sitter guarantees that parsing never throws unhandled exceptions due to invalid code. Should a fatal parsing failure occur internally, the `AstEngine` safely encapsulates the execution in a `try/catch` block, immediately returning an empty symbol registry paired with the `hasSyntaxErrors: true` flag. This allows CodeAtlas to analyze massive legacy or heavily corrupted codebases without catastrophic failure.
