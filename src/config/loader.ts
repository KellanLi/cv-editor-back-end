export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  /** 与 `main.ts` 中 `setGlobalPrefix` 一致，用于拼接对外可访问的文件 URL。 */
  api: {
    globalPrefix: process.env.GLOBAL_PREFIX || 'api/v1',
  },
  /** 本地图片根目录，相对进程工作目录；ECS 上可设为绝对路径如 `/data/uploads`。 */
  storage: {
    root: process.env.STORAGE_ROOT || 'uploads',
  },
  url: process.env.DATABASE_URL,
  db: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  /**
   * AgentCore：通过 **OpenAI 兼容 Chat Completions** 调模型（LangChain `ChatOpenAI`）。
   * 阿里云百炼 / DashScope：Base URL 一般为 `https://dashscope.aliyuncs.com/compatible-mode/v1`（北京），
   * 新加坡等为 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`，模型名如 `qwen3.5-plus`。
   * 说明见：https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope
   */
  ai: {
    openaiApiKey:
      process.env.DASHSCOPE_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      '',
    openaiBaseUrl:
      process.env.OPENAI_BASE_URL?.trim() ||
      process.env.DASHSCOPE_COMPAT_BASE_URL?.trim() ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
    openaiModel: process.env.OPENAI_MODEL?.trim() || 'qwen3.5-plus',
    tavilyApiKey: process.env.TAVILY_API_KEY?.trim() || '',
    resumeDiagnosisTaskTtlHours: parseInt(
      process.env.AI_RESUME_DIAGNOSIS_TASK_TTL_HOURS || '24',
      10,
    ),
    resumeDiagnosisTaskWorkerIntervalMs: parseInt(
      process.env.AI_RESUME_DIAGNOSIS_TASK_WORKER_INTERVAL_MS || '3000',
      10,
    ),
  },
  /** 长上下文异步压缩（见 `docs/task-context/long-context.md`） */
  longContext: {
    budgetChars: parseInt(process.env.AI_CONTEXT_BUDGET_CHARS || '72000', 10),
    preserveRecentMessages: parseInt(
      process.env.AI_CONTEXT_PRESERVE_RECENT_MSGS || '16',
      10,
    ),
    maxRecentForAgent: parseInt(
      process.env.AI_CONTEXT_MAX_RECENT_MSGS || '48',
      10,
    ),
    workerIntervalMs: parseInt(
      process.env.AI_CONTEXT_WORKER_INTERVAL_MS || '10000',
      10,
    ),
  },
});
