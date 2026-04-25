# AI部分开发背景

## api介绍

使用的API平台为阿里云百炼。

阿里云百炼是一站式大模型开发与应用平台，集成了千问及主流第三方模型。它为开发者提供了兼容OpenAI的API及全链路模型服务；同时，也提供可视化应用构建能力，让业务人员能快速创建智能体、知识库问答等AI应用。

调用示例：

```javascript
import OpenAI from 'openai';

// 注意: 不同地域的base_url不通用（下方示例使用北京地域的base_url）
// - 华北2（北京）: https://dashscope.aliyuncs.com/compatible-mode/v1
// - 新加坡: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
const openai = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: 'qwen3.6-plus',
    messages: [{ role: 'user', content: '你是谁？' }],
  });
  console.log(completion.choices[0].message.content);
}

main();
```

## 本项目一共要支持三个AI功能

1. AI基础问答：就是用户可以引用简历内容作为上下文与LLM进行对话
2. AI对话编辑：在AI问答的基础上，LLM可以通过工具调用自动修改简历内容
3. AI简历诊断：通过JD对简历进行评分，并针对性给出修改建议。

### AI基础问答

先实现这个。

基本步骤：设计接口输入输出 --> 设计数据库 --> 实现接口

1. 要可以自行读取简历上下文
2. 可以通过接口告知用户选取的简历上下文
3. 要可以管理用户的对话记录
4. 可以搜索并读取网页内容
5. 要有存放全局上下文的能力，如用户可在这里存放JD
6. 返回方式上，为流式返回，同时会展示思考过程

### AI对话编辑

在实现了AI基础问答的基础上再实现这个。

1. AI基础问答有的能力它也有。同时可以与AI基础问答共享用户对话记录。
2. 它要有能力对简历模块进行操作

### AI简历诊断

1. LLM根据JD生成评价维度
2. 从不同维度上打分
3. 生成简历总体评价，并给出各个模块的修改建议
