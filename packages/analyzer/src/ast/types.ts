export type SymbolType = 'function' | 'class' | 'method' | 'variable';

export interface CodeRange {
  startLine: number;
  endLine: number;
}

export interface SymbolDefinition {
  name: string;
  type: SymbolType;
  range: CodeRange;
  isExported: boolean;
}

export interface ImportDefinition {
  source: string;
  symbols: string[]; // Specific symbols imported (or * for namespace)
  range: CodeRange;
}

export interface AstAnalysisResult {
  filePath: string;
  language: string;
  symbols: SymbolDefinition[];
  imports: ImportDefinition[];
  hasSyntaxErrors: boolean;
}
