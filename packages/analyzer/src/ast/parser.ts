import Parser from 'tree-sitter';
import { AstAnalysisResult } from './types';

export abstract class BaseAdapter {
  protected parser: Parser;

  constructor(language: unknown) {
    this.parser = new Parser();
    this.parser.setLanguage(language);
  }

  private parseJs(sourceCode: string): unknown {
    try {
      const tree = this.parser.parse(sourceCode);
      const hasSyntaxErrors =
        typeof tree.rootNode.hasError === 'function'
          ? (tree.rootNode as { hasError: () => boolean }).hasError()
          : (tree.rootNode as { hasError: boolean }).hasError;
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
