import { DatabaseClient, schema } from '@codeatlas/database';
import { ImpactAnalyzer } from '@codeatlas/analyzer';
import { RiskEngine } from '@codeatlas/risk-engine';
import { 
  generateArchitectureSummary, 
  generateFeaturePlan,
  getAiConfig 
} from '@codeatlas/ai';
import { eq, like } from 'drizzle-orm';

// Instantiate dependencies
// Normally this might be injected, but for the MCP server we will use the local DB.
export const dbClient = new DatabaseClient('codeatlas.db');
export const riskEngine = new RiskEngine();
export const impactAnalyzer = new ImpactAnalyzer(dbClient, riskEngine);

export const tools = [
  {
    name: 'codeatlas_search_symbols',
    description: 'Search for symbols (functions, classes, interfaces) within the analyzed codebase.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The symbol name to search for (partial match supported)' }
      },
      required: ['query']
    }
  },
  {
    name: 'codeatlas_get_file_context',
    description: 'Get deep context for a specific file including imports, exports, symbols, tests, and risk score.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The absolute or relative file path (e.g. src/utils/helper.ts)' }
      },
      required: ['path']
    }
  },
  {
    name: 'codeatlas_get_impact',
    description: 'Analyze the impact of changing a specific file (blast radius, direct/transitive dependents).',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The file path to analyze' }
      },
      required: ['path']
    }
  },
  {
    name: 'codeatlas_get_architecture',
    description: 'Get a comprehensive architectural summary of the codebase, highlighting major modules and high-risk areas.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'codeatlas_plan_change',
    description: 'Generate a step-by-step implementation plan for a requested feature based on the actual repository architecture.',
    inputSchema: {
      type: 'object',
      properties: {
        featureRequest: { type: 'string', description: 'Detailed description of the feature to implement' }
      },
      required: ['featureRequest']
    }
  }
];

export async function handleSearchSymbols(query: string) {
  const results = await dbClient.db.select()
    .from(schema.symbols)
    .where(like(schema.symbols.name, `%${query}%`))
    .limit(20);

  return JSON.stringify(results, null, 2);
}

export async function handleGetFileContext(path: string) {
  const fileRecords = await dbClient.db.select()
    .from(schema.files)
    .where(eq(schema.files.path, path))
    .limit(1);

  if (fileRecords.length === 0) {
    throw new Error(`File not found: ${path}`);
  }

  const fileId = fileRecords[0].id;
  const symbols = await dbClient.db.select().from(schema.symbols).where(eq(schema.symbols.fileId, fileId));
  
  return JSON.stringify({
    file: fileRecords[0],
    symbols
  }, null, 2);
}

export async function handleGetImpact(path: string) {
  const latestRun = await dbClient.db.select().from(schema.analysisRuns).orderBy(schema.analysisRuns.startedAt).limit(1);
  if (latestRun.length === 0) {
    throw new Error('No repository analysis found. Run "codeatlas analyze" first.');
  }

  const result = await impactAnalyzer.analyze(latestRun[0].id, path);
  return JSON.stringify(result, null, 2);
}

export async function handleGetArchitecture() {
  const latestRun = await dbClient.db.select().from(schema.analysisRuns).orderBy(schema.analysisRuns.startedAt).limit(1);
  if (latestRun.length === 0) {
    throw new Error('No repository analysis found. Run "codeatlas analyze" first.');
  }

  const aiConfig = getAiConfig();
  
  // Collect a basic raw summary
  const allFiles = await dbClient.db.select().from(schema.files).limit(500);
  const rawContext = allFiles.map(f => f.path).join('\\n');

  if (aiConfig.provider || aiConfig.baseUrl) {
    const summary = await generateArchitectureSummary(dbClient, rawContext, latestRun[0].repositoryId, latestRun[0].commitId);
    if (summary) return JSON.stringify(summary, null, 2);
  }

  // Deterministic fallback
  return JSON.stringify({
    note: "AI provider not configured. Showing deterministic summary.",
    totalFilesTracked: allFiles.length,
    sampleFiles: allFiles.slice(0, 10).map(f => f.path)
  }, null, 2);
}

export async function handlePlanChange(featureRequest: string) {
  const latestRun = await dbClient.db.select().from(schema.analysisRuns).orderBy(schema.analysisRuns.startedAt).limit(1);
  if (latestRun.length === 0) {
    throw new Error('No repository analysis found. Run "codeatlas analyze" first.');
  }

  const aiConfig = getAiConfig();
  
  const allFiles = await dbClient.db.select().from(schema.files).limit(100);
  const rawContext = allFiles.map(f => f.path).join('\\n');

  if (aiConfig.provider || aiConfig.baseUrl) {
    let plan = await generateFeaturePlan(dbClient, featureRequest, rawContext, latestRun[0].repositoryId, latestRun[0].commitId);
    
    // Check if the AI failed to generate valid json, and return fallback if so
    if (!plan) {
      return JSON.stringify({ error: "Malformed AI output or validation failure." }, null, 2);
    }
    
    return JSON.stringify({
      _meta: { note: `Generated using ${aiConfig.provider || 'custom provider'}` },
      ...plan
    }, null, 2);
  }

  // Deterministic fallback search for patterns
  const keywords = featureRequest.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const existingPatterns = allFiles
    .filter(f => keywords.some(k => f.path.toLowerCase().includes(k)))
    .map(f => f.path)
    .slice(0, 5); // Limit to top 5 hits

  return JSON.stringify({
    _meta: { note: "AI provider not configured. Showing deterministic plan outline." },
    userGoal: featureRequest,
    repositoryAreas: ["Core"],
    filesToInspect: [],
    recommendedFiles: [],
    existingPatterns,
    testsToAdd: [],
    risks: ["Unknown without AI analysis"],
    implementationOrder: [
      "Identify target files using codeatlas_search_symbols",
      "Check impact of changes using codeatlas_get_impact",
      "Implement changes",
      "Update related tests"
    ]
  }, null, 2);
}
