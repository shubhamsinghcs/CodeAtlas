export interface ModuleInfo {
  name: string;
  files: string[];
}

export interface ModuleGraph {
  modules: ModuleInfo[];
  edges: { source: string; target: string }[];
}

export function inferArchitecture(filePaths: string[]): ModuleInfo[] {
  // Deterministic Module Grouping Heuristic

  // 1. Check for Monorepo boundaries (apps/*, packages/*, workspaces/*)
  const monorepoPrefixes = ['apps/', 'packages/', 'workspaces/'];
  const hasMonorepo = filePaths.some(p => monorepoPrefixes.some(prefix => p.startsWith(prefix)));

  if (hasMonorepo) {
    const modulesMap = new Map<string, string[]>();
    filePaths.forEach(path => {
      let matched = false;
      for (const prefix of monorepoPrefixes) {
        if (path.startsWith(prefix)) {
          const parts = path.split('/');
          if (parts.length > 2) {
            const moduleName = `${parts[0]}/${parts[1]}`;
            if (!modulesMap.has(moduleName)) modulesMap.set(moduleName, []);
            modulesMap.get(moduleName)!.push(path);
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        const rootGroup = 'Root/Other';
        if (!modulesMap.has(rootGroup)) modulesMap.set(rootGroup, []);
        modulesMap.get(rootGroup)!.push(path);
      }
    });

    return Array.from(modulesMap.entries()).map(([name, files]) => ({ name, files }));
  }

  // 2. Fallback to typical src/ lib/ root boundaries
  const modulesMap = new Map<string, string[]>();
  
  filePaths.forEach(path => {
    const parts = path.split('/');
    if (parts.length > 1) {
      if (['src', 'lib', 'core', 'app'].includes(parts[0]) && parts.length > 2) {
        // Group by src/moduleName
        const moduleName = `${parts[0]}/${parts[1]}`;
        if (!modulesMap.has(moduleName)) modulesMap.set(moduleName, []);
        modulesMap.get(moduleName)!.push(path);
      } else {
        // Group by top level dir
        const moduleName = parts[0];
        if (!modulesMap.has(moduleName)) modulesMap.set(moduleName, []);
        modulesMap.get(moduleName)!.push(path);
      }
    } else {
      // Root level file
      const rootGroup = 'Root Files';
      if (!modulesMap.has(rootGroup)) modulesMap.set(rootGroup, []);
      modulesMap.get(rootGroup)!.push(path);
    }
  });

  return Array.from(modulesMap.entries()).map(([name, files]) => ({ name, files }));
}

export function buildModuleGraph(modules: ModuleInfo[], allImports: { fileId: string; resolvedFileId: string }[], filesMap: Map<string, string>): ModuleGraph {
  // mapping of path -> moduleName
  const pathModuleMap = new Map<string, string>();
  for (const mod of modules) {
    for (const file of mod.files) {
      pathModuleMap.set(file, mod.name);
    }
  }

  const edgesSet = new Set<string>();
  const moduleEdges: { source: string; target: string }[] = [];

  for (const imp of allImports) {
    const sourcePath = filesMap.get(imp.fileId);
    const targetPath = filesMap.get(imp.resolvedFileId);

    if (sourcePath && targetPath) {
      const sourceModule = pathModuleMap.get(sourcePath);
      const targetModule = pathModuleMap.get(targetPath);

      if (sourceModule && targetModule && sourceModule !== targetModule) {
        const key = `${sourceModule}::${targetModule}`;
        if (!edgesSet.has(key)) {
          edgesSet.add(key);
          moduleEdges.push({ source: sourceModule, target: targetModule });
        }
      }
    }
  }

  return { modules, edges: moduleEdges };
}
