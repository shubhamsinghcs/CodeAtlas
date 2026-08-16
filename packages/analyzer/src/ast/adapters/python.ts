import Parser from 'tree-sitter';
import Python from 'tree-sitter-python';
import { BaseAdapter } from '../parser';
import { AstAnalysisResult, ImportDefinition, SymbolDefinition } from '../types';

export class PythonAdapter extends BaseAdapter {
  constructor() {
    super(Python);
  }

  protected extract(
    tree: Parser.Tree,
    filePath: string,
    languageName: string,
    hasSyntaxErrors: boolean,
  ): AstAnalysisResult {
    const symbols: SymbolDefinition[] = [];
    const imports: ImportDefinition[] = [];

    const query = new Parser.Query(
      Python,
      `
      (import_statement
        name: (dotted_name) @import.source) @import

      (import_from_statement
        module_name: (dotted_name) @import.source) @import_from

      (function_definition
        name: (identifier) @func.name) @func

      (class_definition
        name: (identifier) @class.name) @class

      (class_definition
        body: (block
          (function_definition
            name: (identifier) @method.name) @method))
      `,
    );

    const matches = query.matches(tree.rootNode);
    const processedNodes = new Set<number>();

    for (const match of matches) {
      const isImport = match.captures.some((c) => c.name === 'import');
      const isImportFrom = match.captures.some((c) => c.name === 'import_from');

      if (isImport || isImportFrom) {
        const sourceCapture = match.captures.find((c) => c.name === 'import.source');
        if (sourceCapture) {
          imports.push({
            source: sourceCapture.node.text,
            symbols: [],
            range: {
              startLine: match.captures[0].node.startPosition.row + 1,
              endLine: match.captures[0].node.endPosition.row + 1,
            },
          });
        }
        continue;
      }

      let type: 'function' | 'class' | 'method' | null = null;
      let nameCapture: Parser.QueryCapture | undefined;
      let rootCapture: Parser.QueryCapture | undefined;

      const isMethod = match.captures.some((c) => c.name === 'method');
      const isClass = match.captures.some((c) => c.name === 'class');
      const isFunc = match.captures.some((c) => c.name === 'func');

      if (isMethod) {
        type = 'method';
        nameCapture = match.captures.find((c) => c.name === 'method.name');
        rootCapture = match.captures.find((c) => c.name === 'method');
      } else if (isClass) {
        type = 'class';
        nameCapture = match.captures.find((c) => c.name === 'class.name');
        rootCapture = match.captures.find((c) => c.name === 'class');
      } else if (isFunc) {
        type = 'function';
        nameCapture = match.captures.find((c) => c.name === 'func.name');
        rootCapture = match.captures.find((c) => c.name === 'func');
      }

      if (type && nameCapture && rootCapture && !processedNodes.has(nameCapture.node.id)) {
        processedNodes.add(nameCapture.node.id);

        // In python, everything top level could be considered exported.
        // We'll mark functions and classes as exported if they don't start with underscore
        const name = nameCapture.node.text;
        const isExported = !name.startsWith('_');

        symbols.push({
          name,
          type,
          isExported,
          range: {
            startLine: rootCapture.node.startPosition.row + 1,
            endLine: rootCapture.node.endPosition.row + 1,
          },
        });
      }
    }

    return {
      filePath,
      language: languageName,
      symbols,
      imports,
      hasSyntaxErrors,
    };
  }
}
