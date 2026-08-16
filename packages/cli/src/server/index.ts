import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getAiConfig } from '@codeatlas/ai';
import { DatabaseClient, schema } from '@codeatlas/database';
import { ImpactAnalyzer, inferArchitecture, buildModuleGraph } from '@codeatlas/analyzer';
import { RiskEngine } from '@codeatlas/risk-engine';
import { eq, like, desc, isNotNull } from 'drizzle-orm';
import pc from 'picocolors';

export function startApiServer(port: number) {
  const app = new Hono();

  // Use a default database location, or allow configuration
  const dbClient = new DatabaseClient('codeatlas.db');
  const riskEngine = new RiskEngine();
  const impactAnalyzer = new ImpactAnalyzer(dbClient, riskEngine);

  app.onError((err, c) => {
    console.error(pc.red(`[API Error] ${err.message}`));
    return c.json({ error: err.message }, 500);
  });

  app.get('/api/repository', async (c) => {
    const repo = dbClient.db.select().from(schema.repositories).get();
    if (!repo) return c.json({ error: 'No repository found. Run "codeatlas analyze" first.' }, 404);

    const commit = dbClient.db
      .select()
      .from(schema.commits)
      .where(eq(schema.commits.repositoryId, repo.id))
      .get();
      
    const aiConfig = getAiConfig();
    const aiActive = !!(aiConfig.provider || aiConfig.baseUrl);

    return c.json({ repository: repo, commit, aiActive });
  });

  app.get('/api/files', async (c) => {
    const files = dbClient.db.select().from(schema.files).all();
    return c.json({ files });
  });

  app.get('/api/files/:path{.*}', async (c) => {
    const path = c.req.param('path');
    const file = dbClient.db.select().from(schema.files).where(eq(schema.files.path, path)).get();
    if (!file) return c.json({ error: 'File not found' }, 404);

    const symbols = dbClient.db
      .select()
      .from(schema.symbols)
      .where(eq(schema.symbols.fileId, file.id))
      .all();
    return c.json({ file, symbols });
  });

  app.get('/api/search', async (c) => {
    const q = c.req.query('q');
    if (!q) return c.json({ error: 'Missing query parameter "q"' }, 400);

    const files = dbClient.db
      .select()
      .from(schema.files)
      .where(like(schema.files.path, `%${q}%`))
      .limit(20)
      .all();

    const symbols = dbClient.db
      .select()
      .from(schema.symbols)
      .where(like(schema.symbols.name, `%${q}%`))
      .limit(20)
      .all();

    return c.json({ files, symbols });
  });

  app.get('/api/graph', async (c) => {
    const files = dbClient.db.select().from(schema.files).all();
    const imports = dbClient.db
      .select()
      .from(schema.imports)
      .where(isNotNull(schema.imports.resolvedFileId))
      .all();

    const nodes = files.map((f) => ({ id: f.id, label: f.path }));
    const edges = imports.map((i) => ({ source: i.fileId, target: i.resolvedFileId! }));

    return c.json({ nodes, edges });
  });

  app.get('/api/impact/:path{.*}', async (c) => {
    const path = c.req.param('path');

    const latestRun = dbClient.db
      .select()
      .from(schema.analysisRuns)
      .orderBy(desc(schema.analysisRuns.startedAt))
      .get();
    if (!latestRun) return c.json({ error: 'No analysis runs found' }, 404);

    try {
      const impact = impactAnalyzer.analyze(latestRun.id, path);
      return c.json(impact);
    } catch (e: unknown) {
      if (e instanceof Error) {
        return c.json({ error: e.message }, 404);
      }
      return c.json({ error: 'Unknown error' }, 500);
    }
  });

  app.get('/api/architecture', async (c) => {
    const files = dbClient.db.select().from(schema.files).all();
    const imports = dbClient.db
      .select()
      .from(schema.imports)
      .where(isNotNull(schema.imports.resolvedFileId))
      .all();

    const filePaths = files.map(f => f.path);
    const modules = inferArchitecture(filePaths);

    const filesMap = new Map<string, string>();
    files.forEach(f => filesMap.set(f.id, f.path));

    const moduleGraph = buildModuleGraph(modules, imports as { fileId: string; resolvedFileId: string }[], filesMap);
    
    return c.json(moduleGraph);
  });

  app.get('/api/risks', async (c) => {
    // Basic implementation: for a true /api/risks, we should calculate risk for all files.
    // For now, let's just return a generic wrapper. Real dashboard logic will call Impact analyzer or risk engine in bulk.
    // To do bulk risk computation quickly:
    return c.json({
      message: 'Risk list endpoint. In a full implementation, this aggregates risks.',
    });
  });

  console.log(pc.green(`\n🚀 CodeAtlas API Server starting...`));
  console.log(pc.cyan(`=> Local: http://localhost:${port}/api/`));

  serve({
    fetch: app.fetch,
    port,
  });
}
