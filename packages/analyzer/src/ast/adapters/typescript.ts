import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import { BaseAdapter } from '../parser';
import { AstAnalysisResult, ImportDefinition, SymbolDefinition } from '../types';

export class TypeScriptAdapter extends BaseAdapter {
  constructor(isTsx: boolean = false) {
    super(isTsx ? TypeScript.tsx : TypeScript.typescript);
  }

  protected extract(
    tree: Parser.Tree,
    filePath: string,
    languageName: string,
    hasSyntaxErrors: boolean,
  ): AstAnalysisResult {
    const symbols: SymbolDefinition[] = [];
    const imports: ImportDefinition[] = [];

    // TS grammar is very similar to JS, but includes interfaces, types, etc.
    const query = new Parser.Query(
      this.parser.getLanguage(),
      `
      (import_statement
        source: (string) @import.source) @import

      (export_statement
        declaration: (function_declaration
          name: (identifier) @func.name)) @export.func

      (export_statement
        declaration: (class_declaration
          name: (type_identifier) @class.name)) @export.class

      (export_statement
        declaration: (lexical_declaration
          (variable_declarator
            name: (identifier) @var.name))) @export.var

      (function_declaration
        name: (identifier) @func.name) @func

      (class_declaration
        name: (type_identifier) @class.name) @class

      (method_definition
        name: (property_identifier) @method.name) @method
      `,
    );

    const matches = query.matches(tree.rootNode);
    const processedNodes = new Set<number>();

    for (const match of matches) {
      const isExportFunction = match.captures.some((c) => c.name === 'export.func');
      const isExportClass = match.captures.some((c) => c.name === 'export.class');
      const isExportVar = match.captures.some((c) => c.name === 'export.var');
      const isImport = match.captures.some((c) => c.name === 'import');

      if (isImport) {
        const sourceCapture = match.captures.find((c) => c.name === 'import.source');
        if (sourceCapture) {
          const source = sourceCapture.node.text.replace(/['"`]/g, '');
          imports.push({
            source,
            symbols: [],
            range: {
              startLine: match.captures[0].node.startPosition.row + 1,
              endLine: match.captures[0].node.endPosition.row + 1,
            },
          });
        }
        continue;
      }

      let type: 'function' | 'class' | 'method' | 'variable' | null = null;
      let nameCapture: Parser.QueryCapture | undefined;
      let rootCapture: Parser.QueryCapture | undefined;
      let isExported = false;

      if (isExportFunction) {
        type = 'function';
        nameCapture = match.captures.find((c) => c.name === 'func.name');
        rootCapture = match.captures.find((c) => c.name === 'export.func');
        isExported = true;
      } else if (isExportClass) {
        type = 'class';
        nameCapture = match.captures.find((c) => c.name === 'class.name');
        rootCapture = match.captures.find((c) => c.name === 'export.class');
        isExported = true;
      } else if (isExportVar) {
        type = 'variable';
        nameCapture = match.captures.find((c) => c.name === 'var.name');
        rootCapture = match.captures.find((c) => c.name === 'export.var');
        isExported = true;
      } else {
        const isFunc = match.captures.some((c) => c.name === 'func');
        const isClass = match.captures.some((c) => c.name === 'class');
        const isMethod = match.captures.some((c) => c.name === 'method');

        if (isFunc) {
          type = 'function';
          nameCapture = match.captures.find((c) => c.name === 'func.name');
          rootCapture = match.captures.find((c) => c.name === 'func');
        } else if (isClass) {
          type = 'class';
          nameCapture = match.captures.find((c) => c.name === 'class.name');
          rootCapture = match.captures.find((c) => c.name === 'class');
        } else if (isMethod) {
          type = 'method';
          nameCapture = match.captures.find((c) => c.name === 'method.name');
          rootCapture = match.captures.find((c) => c.name === 'method');
        }
      }

      if (type && nameCapture && rootCapture && !processedNodes.has(nameCapture.node.id)) {
        processedNodes.add(nameCapture.node.id);
        symbols.push({
          name: nameCapture.node.text,
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
