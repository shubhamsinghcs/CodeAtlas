import { DatabaseClient, schema } from '@codeatlas/database';
import { eq, isNotNull, and } from 'drizzle-orm';
import { GraphEngine } from '../graph/analyzer';
import { Hotspot, HotspotExplanation } from './types';

export class HotspotDetector {
  private dbClient: DatabaseClient;

  constructor(dbClient: DatabaseClient) {
    this.dbClient = dbClient;
  }

  public detect(runId: string): Hotspot[] {
    const { db } = this.dbClient;
    const hotspots: Hotspot[] = [];

    // 1. Fetch all files and imports for this run
    const allFiles = db.select().from(schema.files).where(eq(schema.files.runId, runId)).all();
    if (allFiles.length === 0) return [];

    const allImportsRes = db
      .select()
      .from(schema.imports)
      .leftJoin(schema.files, eq(schema.imports.fileId, schema.files.id))
      .where(and(eq(schema.files.runId, runId), isNotNull(schema.imports.resolvedFileId)))
      .all();

    // 2. Build graph to calculate metrics
    const graph = new GraphEngine();
    allFiles.forEach((f) => graph.addNode(f.id));

    allImportsRes.forEach((row) => {
      const imp = row.imports;
      if (imp && imp.resolvedFileId) {
        graph.addEdge(imp.fileId, imp.resolvedFileId);
      }
    });

    const isTestFile = (p: string) => /\.(test|spec)\.[jt]sx?$/.test(p) || /__tests__/.test(p);
    
    // Evaluate tests
    const testFilesSet = new Set<string>();
    allFiles.forEach((f) => {
      if (isTestFile(f.path)) {
        testFilesSet.add(f.id);
      }
    });

    // 3. Evaluate each file
    for (const file of allFiles) {
      if (isTestFile(file.path)) continue; // We usually don't flag tests as architectural hotspots

      let score = 0;
      const explanations: HotspotExplanation[] = [];

      const fanIn = graph.getFanIn(file.id);
      const fanOut = graph.getFanOut(file.id);
      
      // Centrality approximation: fanIn * fanOut
      const centrality = fanIn * fanOut;
      
      const lines = file.lines || 0;
      const churn = file.churn;

      // Has tests? (direct dependents that are test files)
      const directDependents = graph.getDirectDependents(file.id);
      const hasTests = directDependents.some((depId) => testFilesSet.has(depId));

      // Weights & Thresholds
      if (fanIn >= 10) {
        score += 20;
        explanations.push({ factor: 'High fan-in', description: `${fanIn} files depend on it.` });
      } else if (fanIn >= 5) {
        score += 10;
        explanations.push({ factor: 'Moderate fan-in', description: `${fanIn} files depend on it.` });
      }

      if (fanOut >= 15) {
        score += 20;
        explanations.push({ factor: 'High fan-out', description: `It imports ${fanOut} modules.` });
      } else if (fanOut >= 8) {
        score += 10;
        explanations.push({ factor: 'Moderate fan-out', description: `It imports ${fanOut} modules.` });
      }

      if (centrality >= 100) {
        score += 15;
        explanations.push({ factor: 'High centrality', description: `Acts as a major structural hub.` });
      }

      if (lines >= 500) {
        score += 20;
        explanations.push({ factor: 'Large size', description: `File has ${lines} lines.` });
      } else if (lines >= 300) {
        score += 10;
        explanations.push({ factor: 'Moderate size', description: `File has ${lines} lines.` });
      }

      if (!hasTests) {
        score += 15;
        explanations.push({ factor: 'Missing tests', description: `No direct test suites detected.` });
      }

      if (churn === 'HIGH') {
        score += 15;
        explanations.push({ factor: 'High recent churn', description: `Modified frequently in recent history.` });
      } else if (churn === 'MEDIUM') {
        score += 5;
        explanations.push({ factor: 'Moderate churn', description: `Modified a few times recently.` });
      }

      // Cap at 100
      score = Math.min(100, score);

      if (score >= 40) {
        hotspots.push({
          fileId: file.id,
          filePath: file.path,
          score,
          severity: score >= 75 ? '🔥' : '⚠',
          explanations
        });
      }
    }

    // Sort by score descending
    hotspots.sort((a, b) => b.score - a.score);

    return hotspots;
  }
}
