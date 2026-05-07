import { ApiProperty } from '@nestjs/swagger';

export class EvaluationDimensionItemDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;
}

export class DimensionScoreItemDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ description: '0～100' })
  score: number;

  @ApiProperty()
  comment: string;
}

export class ContentSuggestionItemDto {
  @ApiProperty()
  sectionId: number;

  @ApiProperty()
  contentOrder: number;

  @ApiProperty({ enum: ['delete', 'expand', 'simplify'] })
  operation: 'delete' | 'expand' | 'simplify';

  @ApiProperty()
  reason: string;

  @ApiProperty()
  suggestion: string;
}

export class OverallAddSuggestionItemDto {
  @ApiProperty({ enum: ['resume', 'section'] })
  target: 'resume' | 'section';

  @ApiProperty({ required: false, nullable: true })
  sectionId: number | null;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  suggestion: string;
}

export class ResumeDiagnosisReportDto {
  @ApiProperty()
  jdText: string;

  @ApiProperty({
    enum: [
      'resume_field',
      'global_context',
      'generated_web',
      'inferred',
      'missing',
    ],
  })
  jdSource: string;

  @ApiProperty()
  writingApproach: string;

  @ApiProperty({ type: [EvaluationDimensionItemDto] })
  evaluationDimensions: EvaluationDimensionItemDto[];

  @ApiProperty({ type: [DimensionScoreItemDto] })
  dimensionScores: DimensionScoreItemDto[];

  @ApiProperty()
  overallScore: number;

  @ApiProperty()
  overallComment: string;

  @ApiProperty({ type: [ContentSuggestionItemDto] })
  contentSuggestions: ContentSuggestionItemDto[];

  @ApiProperty({ type: [OverallAddSuggestionItemDto] })
  overallAddSuggestions: OverallAddSuggestionItemDto[];
}

export class DiagnoseResumeDataDto {
  @ApiProperty({ type: ResumeDiagnosisReportDto })
  report: ResumeDiagnosisReportDto;
}
