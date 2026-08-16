import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { AstEngine } from './index';

describe('AstEngine', () => {
  let engine: AstEngine;
  const fixturesDir = path.join(__dirname, '../../__fixtures__/ast');

  beforeEach(() => {
    engine = new AstEngine();
  });

  describe('TypeScript Adapter', () => {
    it('extracts symbols and imports correctly from valid TS', () => {
      const file = path.join(fixturesDir, 'valid.ts');
      const result = engine.analyzeFile(file, 'ts');

      expect(result.hasSyntaxErrors).toBe(false);
      expect(result.language).toBe('ts');

      expect(result.imports.length).toBe(1);
      expect(result.imports[0].source).toBe('some-module');

      const symbols = result.symbols;
      expect(symbols).toHaveLength(5);

      const exportedVar = symbols.find((s) => s.name === 'exportedVar');
      expect(exportedVar?.type).toBe('variable');
      expect(exportedVar?.isExported).toBe(true);

      const myClass = symbols.find((s) => s.name === 'MyClass');
      expect(myClass?.type).toBe('class');
      expect(myClass?.isExported).toBe(true);

      const myMethod = symbols.find((s) => s.name === 'myMethod');
      expect(myMethod?.type).toBe('method');

      const myExportedFunc = symbols.find((s) => s.name === 'myExportedFunc');
      expect(myExportedFunc?.type).toBe('function');
      expect(myExportedFunc?.isExported).toBe(true);
    });

    it('gracefully handles malformed TS', () => {
      const file = path.join(fixturesDir, 'malformed.ts');
      const result = engine.analyzeFile(file, 'ts');

      expect(result.hasSyntaxErrors).toBe(true);
    });
  });

  describe('JavaScript Adapter', () => {
    it('extracts symbols and imports correctly from valid JS', () => {
      const file = path.join(fixturesDir, 'valid.js');
      const result = engine.analyzeFile(file, 'js');

      expect(result.hasSyntaxErrors).toBe(false);
      expect(result.language).toBe('js');

      expect(result.imports.length).toBe(1);
      expect(result.imports[0].source).toBe('some-module');

      const symbols = result.symbols;
      expect(symbols).toHaveLength(5);
    });

    it('gracefully handles malformed JS', () => {
      const file = path.join(fixturesDir, 'malformed.js');
      const result = engine.analyzeFile(file, 'js');

      expect(result.hasSyntaxErrors).toBe(true);
    });
  });

  describe('Python Adapter', () => {
    it('extracts symbols and imports correctly from valid Python', () => {
      const file = path.join(fixturesDir, 'valid.py');
      const result = engine.analyzeFile(file, 'py');

      expect(result.hasSyntaxErrors).toBe(false);
      expect(result.language).toBe('py');

      expect(result.imports.length).toBe(2);
      expect(result.imports.map((i) => i.source)).toContain('os');
      expect(result.imports.map((i) => i.source)).toContain('sys');

      const symbols = result.symbols;
      expect(symbols).toHaveLength(4);

      const myClass = symbols.find((s) => s.name === 'MyPythonClass');
      expect(myClass?.type).toBe('class');
      expect(myClass?.isExported).toBe(true);

      const myMethod = symbols.find((s) => s.name === 'my_python_method');
      expect(myMethod?.type).toBe('method');
      expect(myMethod?.isExported).toBe(true);

      const myFunc = symbols.find((s) => s.name === 'my_python_func');
      expect(myFunc?.type).toBe('function');
      expect(myFunc?.isExported).toBe(true);
    });

    it('gracefully handles malformed Python', () => {
      const file = path.join(fixturesDir, 'malformed.py');
      const result = engine.analyzeFile(file, 'py');

      expect(result.hasSyntaxErrors).toBe(true);
    });
  });
});
