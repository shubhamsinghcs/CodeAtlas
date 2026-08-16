import { DatabaseClient, schema } from '@codeatlas/database';
import { eq } from 'drizzle-orm';
import { ImpactAnalyzer } from '../impact/analyzer';

export interface DetectedPattern {
  filePath: string;
  reason: string;
  relatedTests: string[];
  architecturalModule: string;
}

export class PatternDetector {
  private dbClient: DatabaseClient;
  private impactAnalyzer: ImpactAnalyzer;

  constructor(dbClient: DatabaseClient, impactAnalyzer?: ImpactAnalyzer) {
    this.dbClient = dbClient;
    this.impactAnalyzer = impactAnalyzer || new ImpactAnalyzer(dbClient);
  }

  public detectPatterns(runId: string, featureRequest: string, maxResults = 3): DetectedPattern[] {
    const { db } = this.dbClient;
    const allFiles = db.select().from(schema.files).where(eq(schema.files.runId, runId)).all();
    const allSymbols = db.select().from(schema.symbols).all(); 
    
    const symbolsByFile = new Map<string, string[]>();
    for (const sym of allSymbols) {
      if (!symbolsByFile.has(sym.fileId)) symbolsByFile.set(sym.fileId, []);
      symbolsByFile.get(sym.fileId)!.push(sym.name.toLowerCase());
    }

    const keywords = featureRequest.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    const scoredFiles = allFiles.map(file => {
      let score = 0;
      const pathLower = file.path.toLowerCase();
      const syms = symbolsByFile.get(file.id) || [];
      
      let matchedKeywords: string[] = [];

      for (const k of keywords) {
        if (pathLower.includes(k)) {
          score += 2;
          matchedKeywords.push(k);
        } else if (syms.some(s => s.includes(k))) {
          score += 1;
          matchedKeywords.push(k);
        }
      }
      return { file, score, matchedKeywords: Array.from(new Set(matchedKeywords)) };
    });

    const isTestFile = (p: string) => /\.(test|spec)\.[jt]sx?$/.test(p) || /__tests__/.test(p);
    
    const wantsTest = keywords.includes('test') || keywords.includes('tests');
    
    const candidates = scoredFiles
      .filter(x => x.score > 0 && (wantsTest || !isTestFile(x.file.path)))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // tie breaker: shorter paths often mean more fundamental/root patterns
        return a.file.path.length - b.file.path.length;
      });

    const results: DetectedPattern[] = [];
    
    for (const cand of candidates.slice(0, maxResults)) {
      try {
        const impact = this.impactAnalyzer.analyze(runId, cand.file.path, 3);
        results.push({
          filePath: cand.file.path,
          reason: `Potential existing pattern matching keywords: ${cand.matchedKeywords.join(', ')}`,
          relatedTests: impact.relatedTests.map(t => t.filePath),
          architecturalModule: impact.architecturalModule || 'Unknown'
        });
      } catch (e) {
        results.push({
          filePath: cand.file.path,
          reason: `Potential existing pattern matching keywords: ${cand.matchedKeywords.join(', ')}`,
          relatedTests: [],
          architecturalModule: 'Unknown'
        });
      }
    }

    return results;
  }
}
