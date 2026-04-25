/**
 * LangGraph 流式入参（由 AiService 在鉴权后传入，含简历隔离字段）
 */
export type LanggraphStreamInput = {
  threadId: string;
  userText: string;
  systemPrompt: string;
  /** 当前对话绑定的简历（工具内 ACL、加载范围） */
  resumeId: number;
  userId: number;
  /**
   * 前端勾选的 Section；作为「建议范围」注入工具，LLM 仍可在工具参数里改 sectionIds
   */
  suggestedSectionIds?: number[];
  enableWebSearch: boolean;
};
