import type { SkillDefinition } from './skill-runtime';
import { loadResumeEditStateSkill } from './load-resume-edit-state.skill';
import { applySectionContentSkill } from './apply-section-content.skill';
import { createSectionSkill } from './create-section.skill';
import { searchWebContextSkill } from './search-web-context.skill';
import { resumeDiagnosisSkill } from './resume-diagnosis.skill';

/**
 * Skill Index（方案 B）：每项对应一个 LangChain tool，id 即 tool name。
 * 新增能力：在此数组注册并实现 `SkillDefinition` 即可。
 */
export const ALL_AGENT_SKILLS: SkillDefinition[] = [
  loadResumeEditStateSkill,
  applySectionContentSkill,
  createSectionSkill,
  searchWebContextSkill,
  resumeDiagnosisSkill,
];
