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
});
