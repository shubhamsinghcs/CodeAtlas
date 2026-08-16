import Parser from 'tree-sitter';
import { AstAnalysisResult } from './types';

export abstract class BaseAdapter {
  protected parser: Parser;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(language: any) {
    this.parser = new Parser();
    this.parser.setLanguage(language as any);
  }

  private parseJs(sourceCode: string): unknown {
    try {
      const tree = this.parser.parse(sourceCode);
      const hasSyntaxErrors =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof tree.rootNode.hasError === 'function'
          ? (tree.rootNode as any).hasError()
          : tree.rootNode.hasError;
      return { tree, hasSyntaxErrors };
    } catch {
      return { tree: null, hasSyntaxErrors: true };
    }
  }

  public analyze(content: string, filePath: string, languageName: string): AstAnalysisResult {
    try {
      const { tree, hasSyntaxErrors } = this.parseJs(content) as { tree: Parser.Tree, hasSyntaxErrors: boolean };
      return this.extract(tree, filePath, languageName, hasSyntaxErrors);
    } catch (err) {
      console.error('ANALYSIS ERROR:', err);
      // Complete parsing failure or extraction error
      return {
        filePath,
        language: languageName,
        symbols: [],
        imports: [],
        hasSyntaxErrors: true,
      };
    }
  }

  protected abstract extract(
    tree: Parser.Tree,
    filePath: string,
    languageName: string,
    hasSyntaxErrors: boolean,
  ): AstAnalysisResult;
}
