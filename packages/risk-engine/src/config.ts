export interface RiskWeightConfig {
  fanInThreshold: number;
  fanInWeight: number; // max points to add

  fanOutThreshold: number;
  fanOutWeight: number; // max points to add

  depthThreshold: number;
  depthWeight: number; // max points to add

  fileSizeThreshold: number;
  fileSizeWeight: number; // max points to add

  missingTestWeight: number; // max points to add
  circularDependencyWeight: number; // max points to add
}

export const DEFAULT_RISK_CONFIG: RiskWeightConfig = {
  fanInThreshold: 10,
  fanInWeight: 10,

  fanOutThreshold: 7,
  fanOutWeight: 15,

  depthThreshold: 5,
  depthWeight: 15,

  fileSizeThreshold: 300, // lines
  fileSizeWeight: 20,

  missingTestWeight: 20,
  circularDependencyWeight: 20,
};

export type RiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk';

export interface FileMetrics {
  fanIn: number;
  fanOut: number;
  depth: number;
  lines: number;
  hasTests: boolean;
  hasCircularDependency: boolean;
}

export interface RiskFactor {
  name: string;
  description: string;
  contribution: number;
}

export interface RiskEvaluation {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}
