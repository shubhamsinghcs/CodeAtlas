import { z } from 'zod';
import { RiskEvaluation } from '@codeatlas/risk-engine';

export const ImpactRelationshipSchema = z.object({
  fileId: z.string(),
  filePath: z.string(),
  explanation: z.string(),
});
export type ImpactRelationship = z.infer<typeof ImpactRelationshipSchema>;

export const ImpactAnalysisResultSchema = z.object({
  targetFileId: z.string(),
  targetFilePath: z.string(),

  directDependencies: z.array(ImpactRelationshipSchema),
  directDependents: z.array(ImpactRelationshipSchema),
  indirectDependents: z.array(ImpactRelationshipSchema),
  apiRoutes: z.array(ImpactRelationshipSchema),
  relatedTests: z.array(ImpactRelationshipSchema),
  
  architecturalModule: z.string().optional(),
  potentiallyAffectedFiles: z.array(ImpactRelationshipSchema),
  recommendedInspectionOrder: z.array(ImpactRelationshipSchema),

  // Custom schema bypass because it's from another package
  risk: z.custom<RiskEvaluation>(),
});

export type ImpactAnalysisResult = z.infer<typeof ImpactAnalysisResultSchema>;
