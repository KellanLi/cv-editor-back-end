import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '@/provider/jwt/jwt.guard';
import { JwtPayload } from '@/common/decorators/jwt-payload.decorator';
import { IJwtPayload } from '@/types/auth.types';
import { ApiResponseWrapper } from '@/common/decorators/api-response-wrapper.decorator';
import { AiService } from './ai.service';
import {
  ListAiConversationDataDto,
  ListAiConversationDto,
} from './dto/list-conversation.dto';
import { CreateAiConversationDto } from './dto/create-conversation.dto';
import { AiConversationDto } from '@/common/dto/business/ai-conversation.dto';
import { GetAiConversationDto } from './dto/get-conversation.dto';
import { UpdateAiConversationDto } from './dto/update-conversation.dto';
import { DeleteAiConversationDto } from './dto/delete-conversation.dto';
import { ListAiMessageDataDto, ListAiMessageDto } from './dto/list-message.dto';
import {
  ListAiGlobalContextDataDto,
  ListAiGlobalContextDto,
} from './dto/list-global-context.dto';
import { UpsertAiGlobalContextDto } from './dto/upsert-global-context.dto';
import { AiGlobalContextDto } from '@/common/dto/business/ai-global-context.dto';
import { DeleteAiGlobalContextDto } from './dto/delete-global-context.dto';
import { SendAiChatDto } from './dto/send-chat.dto';
import { SendAiChatDataDto } from './dto/send-chat-response.dto';
import type { Response } from 'express';

@ApiTags('AI 模块')
@Controller('ai')
@UseGuards(JwtGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('conversation/list')
  @ApiOperation({ summary: '某份简历下的 AI 对话线程列表' })
  @ApiBody({ type: ListAiConversationDto })
  @ApiResponseWrapper(ListAiConversationDataDto)
  listConversations(
    @Body() body: ListAiConversationDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.listConversations(body, jwt);
  }

  @Post('conversation/create')
  @ApiOperation({
    summary: '创建 AI 对话线程（生成 threadId，供 LangGraph 对齐）',
  })
  @ApiBody({ type: CreateAiConversationDto })
  @ApiResponseWrapper(AiConversationDto)
  createConversation(
    @Body() body: CreateAiConversationDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.createConversation(body, jwt);
  }

  @Post('conversation/get')
  @ApiOperation({ summary: '对话详情（含消息与工具调用）' })
  @ApiBody({ type: GetAiConversationDto })
  @ApiResponseWrapper(AiConversationDto)
  getConversation(
    @Body() body: GetAiConversationDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.getConversation(body, jwt);
  }

  @Post('conversation/update')
  @ApiOperation({ summary: '更新对话元数据（标题、状态）' })
  @ApiBody({ type: UpdateAiConversationDto })
  @ApiResponseWrapper(AiConversationDto)
  updateConversation(
    @Body() body: UpdateAiConversationDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.updateConversation(body, jwt);
  }

  @Post('conversation/delete')
  @ApiOperation({ summary: '删除对话线程（级联消息与工具记录）' })
  @ApiBody({ type: DeleteAiConversationDto })
  @ApiResponseWrapper(AiConversationDto)
  deleteConversation(
    @Body() body: DeleteAiConversationDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.deleteConversation(body, jwt);
  }

  @Post('message/list')
  @ApiOperation({ summary: '分页拉取某线程下的消息' })
  @ApiBody({ type: ListAiMessageDto })
  @ApiResponseWrapper(ListAiMessageDataDto)
  listMessages(@Body() body: ListAiMessageDto, @JwtPayload() jwt: IJwtPayload) {
    return this.aiService.listMessages(body, jwt);
  }

  @Post('global-context/list')
  @ApiOperation({ summary: '简历级全局上下文列表（如 JD，多对话共享）' })
  @ApiBody({ type: ListAiGlobalContextDto })
  @ApiResponseWrapper(ListAiGlobalContextDataDto)
  listGlobalContexts(
    @Body() body: ListAiGlobalContextDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.listGlobalContexts(body, jwt);
  }

  @Post('global-context/upsert')
  @ApiOperation({ summary: '创建或更新简历级全局上下文' })
  @ApiBody({ type: UpsertAiGlobalContextDto })
  @ApiResponseWrapper(AiGlobalContextDto)
  upsertGlobalContext(
    @Body() body: UpsertAiGlobalContextDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.upsertGlobalContext(body, jwt);
  }

  @Post('global-context/delete')
  @ApiOperation({ summary: '按 resumeId + key 删除全局上下文' })
  @ApiBody({ type: DeleteAiGlobalContextDto })
  @ApiResponseWrapper(AiGlobalContextDto)
  deleteGlobalContext(
    @Body() body: DeleteAiGlobalContextDto,
    @JwtPayload() jwt: IJwtPayload,
  ) {
    return this.aiService.deleteGlobalContext(body, jwt);
  }

  @Post('chat/send')
  @ApiOperation({
    summary:
      '基础问答（同步）：落库用户消息并返回占位助手回复；后续可换流式或 LangGraph',
  })
  @ApiBody({ type: SendAiChatDto })
  @ApiResponseWrapper(SendAiChatDataDto)
  sendChat(@Body() body: SendAiChatDto, @JwtPayload() jwt: IJwtPayload) {
    return this.aiService.sendChat(body, jwt);
  }

  @Post('chat/stream')
  @ApiOperation({
    summary:
      '基础问答（SSE 流式）：`conversationId` 可选，不传时首条在服务端建会话、LLM 起标题；LangGraph 流为 message / reasoning / tool 等',
  })
  @ApiBody({ type: SendAiChatDto })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description:
      'SSE：`event: meta` 在首条落库后尽早发出，data 含 `phase: "meta"`、`conversationId`，`payload` 含 `threadId`、`userMessageId`、新会话时可能含 `title`；正文的 `message` / `error` / `done` 等同前',
  })
  async streamChat(
    @Body() body: SendAiChatDto,
    @JwtPayload() jwt: IJwtPayload,
    @Res() res: Response,
  ) {
    await this.aiService.streamChat(body, jwt, res);
  }
}
