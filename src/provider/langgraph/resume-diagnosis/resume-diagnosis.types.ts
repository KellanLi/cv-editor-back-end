export type JdSource =
  | 'resume_field'
  | 'global_context'
  | 'generated_web'
  | 'inferred'
  | 'missing';

export type ContentDiagnosisOperation = 'delete' | 'expand' | 'simplify';

export type OverallAddTarget = 'resume' | 'section';

/** 与 LLM 约定 + HTTP 响应一致的结构化诊断结果 */
export type ResumeDiagnosisReport = {
  jdText: string;
  jdSource: JdSource;
  writingApproach: string;
  evaluationDimensions: { name: string; description: string }[];
  dimensionScores: { name: string; score: number; comment: string }[];
  overallScore: number;
  overallComment: string;
  contentSuggestions: {
    sectionId: number;
    contentOrder: number;
    operation: ContentDiagnosisOperation;
    reason: string;
    suggestion: string;
  }[];
  overallAddSuggestions: {
    target: OverallAddTarget;
    sectionId: number | null;
    reason: string;
    suggestion: string;
  }[];
};
