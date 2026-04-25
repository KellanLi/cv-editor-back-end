# `nodes/`

`createReactAgent` 已内建 `agent` ↔ `tools` 环，本目录**预留给**后续显式 `StateGraph` 编排（例如多节点裁剪上下文、HITL、子图）。

- 与「简历只通过工具拉取」一致：不要在此处再次整体注入简历正文，可在此做 **trim / 摘要** 等节点化扩展。
