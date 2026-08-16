import { DatabaseClient, schema } from '@codeatlas/database';
import { eq, isNotNull, and } from 'drizzle-orm';
import { GraphEngine } from '../graph/analyzer';
import { RiskEngine, FileMetrics } from '@codeatlas/risk-engine';
import { ImpactAnalysisResult, ImpactRelationship } from './types';
import { inferArchitecture } from '../graph/architecture';
import * as path from 'path';

export class ImpactAnalyzer {
  private dbClient: DatabaseClient;
  private riskEngine: RiskEngine;

  constructor(dbClient: DatabaseClient, riskEngine = new RiskEngine()) {
    this.dbClient = dbClient;
    this.riskEngine = riskEngine;
  }

  public analyze(
    runId: string,
    targetFilePath: string,
    maxDepth: number = 10,
  ): ImpactAnalysisResult {
    const { db } = this.dbClient;

    // 1. Find Target File
    const targetFile = db
      .select()
      .from(schema.files)
      .where(and(eq(schema.files.runId, runId), eq(schema.files.path, targetFilePath)))
      .get();

    if (!targetFile) {
      throw new Error(`File not found: ${targetFilePath}`);
    }

    // 2. Load Graph for this Run
    const allFiles = db.select().from(schema.files).where(eq(schema.files.runId, runId)).all();
    const fileMap = new Map(allFiles.map((f) => [f.id, f]));

    const allImportsRes = db
      .select()
      .from(schema.imports)
      .leftJoin(schema.files, eq(schema.imports.fileId, schema.files.id))
      .where(and(eq(schema.files.runId, runId), isNotNull(schema.imports.resolvedFileId)))
      .all();

    const graph = new GraphEngine();
    allFiles.forEach((f) => graph.addNode(f.id));

    allImportsRes.forEach((row) => {
      const imp = row.imports;
      if (imp && imp.resolvedFileId) {
        graph.addEdge(imp.fileId, imp.resolvedFileId);
      }
    });

    // 3. Direct Dependencies
    const directDependencies: ImpactRelationship[] = [];
    const directDependents: ImpactRelationship[] = [];

    const depsIds = graph.getDirectDependencies(targetFile.id);
    for (const depId of depsIds) {
      const file = fileMap.get(depId);
      if (file) {
        directDependencies.push({
          fileId: file.id,
          filePath: file.path,
          explanation: `imported by ${path.basename(targetFilePath)}`,
        });
      }
    }

    const depentsIds = graph.getDirectDependents(targetFile.id);
    for (const depentId of depentsIds) {
      const file = fileMap.get(depentId);
      if (file) {
        directDependents.push({
          fileId: file.id,
          filePath: file.path,
          explanation: `imports ${path.basename(targetFilePath)}`,
        });
      }
    }

    const indirectDependents: ImpactRelationship[] = [];
    const visited = new Set<string>();
    visited.add(targetFile.id);

    // Queue contains [fileId, currentDepth, explanationChain]
    const queue: Array<[string, number, string]> = [];

    for (const depentId of depentsIds) {
      visited.add(depentId);
      const file = fileMap.get(depentId);
      if (file) {
        queue.push([depentId, 1, path.basename(file.path)]);
      }
    }

    while (queue.length > 0) {
      const [currentId, depth, chain] = queue.shift()!;

      if (depth >= maxDepth) continue;

      const nextDependents = graph.getDirectDependents(currentId);
      for (const nextId of nextDependents) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          const nextFile = fileMap.get(nextId);
          if (nextFile) {
            const nextChain = `${path.basename(nextFile.path)} -> ${chain}`;
            indirectDependents.push({
              fileId: nextFile.id,
              filePath: nextFile.path,
              explanation: `transitively imports via: ${nextChain}`,
            });
            queue.push([nextId, depth + 1, nextChain]);
          }
        }
      }
    }

    // 5. Categorize files (Tests, API Routes)
    const isTestFile = (p: string) => /\.(test|spec)\.[jt]sx?$/.test(p) || /__tests__/.test(p);
    const isRouteFile = (p: string) => /\/api\//.test(p) || /\/routes\//.test(p) || /\/controllers\//.test(p) || /\.route\.[jt]s$/.test(p) || /\.controller\.[jt]s$/.test(p);

    const allDependents = [...directDependents, ...indirectDependents];
    
    const relatedTests = allDependents.filter((d) => isTestFile(d.filePath));
    const relatedTestDeps = directDependencies.filter((d) => isTestFile(d.filePath));
    relatedTests.push(...relatedTestDeps);

    const apiRoutes = allDependents.filter((d) => isRouteFile(d.filePath) && !isTestFile(d.filePath));

    // 6. Architecture Module
    const filePaths = allFiles.map((f) => f.path);
    const modules = inferArchitecture(filePaths);
    let architecturalModule = 'Root/Other';
    for (const mod of modules) {
      if (mod.files.includes(targetFile.path)) {
        architecturalModule = mod.name;
        break;
      }
    }

    // 7. Calculate Risk
    const circularCycles = graph.getCircularDependencies();
    const hasCircularDependency = circularCycles.some((cycle) => cycle.includes(targetFile.id));

    const metrics: FileMetrics = {
      fanIn: depentsIds.length,
      fanOut: depsIds.length,
      depth: graph.getDepth(targetFile.id),
      lines: targetFile.lines,
      hasTests: relatedTests.length > 0,
      hasCircularDependency,
    };

    const risk = this.riskEngine.evaluate(metrics);

    // 8. Inspection Order & Potentially Affected Files
    // Exclude tests and API routes from general "indirect dependents" if we want to display them cleanly,
    // or just leave them in. The UI will just use the arrays.
    
    // De-duplicate for potentially affected files
    const affectedMap = new Map<string, ImpactRelationship>();
    [...directDependents, ...apiRoutes, ...indirectDependents].forEach(r => {
      if (!isTestFile(r.filePath) && !affectedMap.has(r.fileId)) {
        affectedMap.set(r.fileId, r);
      }
    });
    
    const potentiallyAffectedFiles = Array.from(affectedMap.values());

    const inspectionMap = new Map<string, ImpactRelationship>();
    
    // Order: Target (skipped from list, implied), Direct, API Routes, Indirect, Tests
    [...directDependents, ...apiRoutes, ...indirectDependents, ...relatedTests].forEach(r => {
      if (!inspectionMap.has(r.fileId)) {
        inspectionMap.set(r.fileId, r);
      }
    });
    
    const recommendedInspectionOrder = Array.from(inspectionMap.values());

    return {
      targetFileId: targetFile.id,
      targetFilePath: targetFile.path,
      directDependencies,
      directDependents,
      indirectDependents,
      relatedTests,
      apiRoutes,
      architecturalModule,
      potentiallyAffectedFiles,
      recommendedInspectionOrder,
      risk,
    };
  }
}
