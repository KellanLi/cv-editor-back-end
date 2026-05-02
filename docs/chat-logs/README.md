# chat-logs

该目录用于记录 AI 对话调试日志（JSONL），主要用于排查：

- tool 参数 JSON 格式问题
- 流式输出中断
- 模型输出与工具调用链路

每次 `streamChat` 请求会生成一个独立文件，文件名示例：

`2026-04-28T08-11-22-123Z-conv-12-thread-xxxx.jsonl`

每行都是一个 JSON 对象，包含 `ts`（时间戳）与 `kind`（事件类型），常见类型：

- `request`：用户输入与请求上下文
- `system_prompt`：本轮 system prompt
- `assistant_final`：最终模型输出全文
- `tool_calls`：本轮工具调用事件集合
- `terminated` / `exception`：中断或异常信息
- `done`：正常完成标记
