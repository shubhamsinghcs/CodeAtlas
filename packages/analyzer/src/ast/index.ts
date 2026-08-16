import { AstAnalysisResult } from './types';
import { JavaScriptAdapter } from './adapters/javascript';
import { TypeScriptAdapter } from './adapters/typescript';
import { PythonAdapter } from './adapters/python';
import * as fs from 'fs';

export * from './types';

export class AstEngine {
  private jsAdapter: JavaScriptAdapter;
  private tsAdapter: TypeScriptAdapter;
  private tsxAdapter: TypeScriptAdapter;
  private pyAdapter: PythonAdapter;

  constructor() {
    this.jsAdapter = new JavaScriptAdapter();
    this.tsAdapter = new TypeScriptAdapter(false);
    this.tsxAdapter = new TypeScriptAdapter(true);
    this.pyAdapter = new PythonAdapter();
  }

  public analyzeFile(absolutePath: string, language: string): AstAnalysisResult {
    let content: string;
    try {
      content = fs.readFileSync(absolutePath, 'utf8');
    } catch {
      return {
        filePath: absolutePath,
        language,
        symbols: [],
        imports: [],
        hasSyntaxErrors: true,
      };
    }

    switch (language) {
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'cjs':
        return this.jsAdapter.analyze(content, absolutePath, language);
      case 'ts':
        return this.tsAdapter.analyze(content, absolutePath, language);
      case 'tsx':
        return this.tsxAdapter.analyze(content, absolutePath, language);
      case 'py':
        return this.pyAdapter.analyze(content, absolutePath, language);
      default:
        // Unsupported language
        return {
          filePath: absolutePath,
          language,
          symbols: [],
          imports: [],
          hasSyntaxErrors: false,
        };
    }
  }
}
