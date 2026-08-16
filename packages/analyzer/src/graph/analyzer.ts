export interface GraphEdge {
  sourceFileId: string;
  targetFileId: string;
}

export class GraphEngine {
  private adjacencyList = new Map<string, Set<string>>(); // target -> sources (dependencies)
  private reverseAdjacencyList = new Map<string, Set<string>>(); // source -> targets (dependents)

  public addNode(fileId: string) {
    if (!this.adjacencyList.has(fileId)) {
      this.adjacencyList.set(fileId, new Set());
      this.reverseAdjacencyList.set(fileId, new Set());
    }
  }

  public addEdge(sourceFileId: string, targetFileId: string) {
    this.addNode(sourceFileId);
    this.addNode(targetFileId);
    this.adjacencyList.get(sourceFileId)!.add(targetFileId);
    this.reverseAdjacencyList.get(targetFileId)!.add(sourceFileId);
  }

  public getDirectDependencies(fileId: string): string[] {
    return Array.from(this.adjacencyList.get(fileId) || []);
  }

  public getDirectDependents(fileId: string): string[] {
    return Array.from(this.reverseAdjacencyList.get(fileId) || []);
  }

  public getFanOut(fileId: string): number {
    return this.getDirectDependencies(fileId).length;
  }

  public getFanIn(fileId: string): number {
    return this.getDirectDependents(fileId).length;
  }

  public getDepth(fileId: string): number {
    // Longest path from any root to this fileId in the reverse adjacency list (dependents)
    // Actually, depth is usually longest path from this node to leaf nodes (no dependencies).
    const visited = new Set<string>();
    const memo = new Map<string, number>();

    const dfs = (node: string): number => {
      if (memo.has(node)) return memo.get(node)!;
      if (visited.has(node)) return 0; // cycle
      visited.add(node);

      let maxDepth = 0;
      for (const dep of this.getDirectDependencies(node)) {
        maxDepth = Math.max(maxDepth, 1 + dfs(dep));
      }

      visited.delete(node);
      memo.set(node, maxDepth);
      return maxDepth;
    };

    return dfs(fileId);
  }

  /**
   * Detects and returns all complete circular dependencies using Tarjan's algorithm or DFS.
   * Returns an array of cycles, where each cycle is an array of fileIds (e.g. [A, B, C, A]).
   */
  public getCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      for (const neighbor of this.getDirectDependencies(node)) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          // Cycle detected
          const cycleStartIndex = path.indexOf(neighbor);
          const cycle = path.slice(cycleStartIndex);
          cycle.push(neighbor); // Complete the cycle: A -> B -> C -> A

          // Deduplicate cycles (e.g., A-B-C-A is same as B-C-A-B).
          // We can normalize by rotating the lexicographically smallest element to the front.
          this.addNormalizedCycle(cycles, cycle);
        }
      }

      recStack.delete(node);
      path.pop();
    };

    for (const node of this.adjacencyList.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  private addNormalizedCycle(cycles: string[][], newCycle: string[]) {
    // newCycle is e.g. [A, B, C, A]
    const core = newCycle.slice(0, -1);
    // find min index
    let minIdx = 0;
    for (let i = 1; i < core.length; i++) {
      if (core[i] < core[minIdx]) minIdx = i;
    }
    const normalizedCore = [...core.slice(minIdx), ...core.slice(0, minIdx)];
    const normalizedCycle = [...normalizedCore, normalizedCore[0]];

    const cycleStr = normalizedCycle.join('|');
    const exists = cycles.some((c) => c.join('|') === cycleStr);
    if (!exists) {
      cycles.push(normalizedCycle);
    }
  }
}
