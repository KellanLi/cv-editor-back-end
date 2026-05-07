import { PrismaService } from '@/provider/prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { LanggraphService } from '@/provider/langgraph/langgraph.service';
import { IJwtPayload } from '@/types/auth.types';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  ListAiConversationDto,
  ListAiConversationDataDto,
} from './dto/list-conversation.dto';
import { CreateAiConversationDto } from './dto/create-conversation.dto';
import { DeleteAiConversationDto } from './dto/delete-conversation.dto';
import { GetAiConversationDto } from './dto/get-conversation.dto';
import { UpdateAiConversationDto } from './dto/update-conversation.dto';
import { ListAiMessageDto, ListAiMessageDataDto } from './dto/list-message.dto';
import { UpsertAiGlobalContextDto } from './dto/upsert-global-context.dto';
import {
  ListAiGlobalContextDto,
  ListAiGlobalContextDataDto,
} from './dto/list-global-context.dto';
import { DeleteAiGlobalContextDto } from './dto/delete-global-context.dto';
import { SendAiChatDto } from './dto/send-chat.dto';
import { SendAiChatDataDto } from './dto/send-chat-response.dto';
import {
  AiConversationPurpose,
  AiMessageRole,
} from '@/generated/enums';
import { mapDbMessagesToRoles } from '@/provider/langgraph/agent-core';
import { Prisma } from '@/generated/client';
import type { Response } from 'express';
import { buildBasicQaSystemPrompt } from '@/provider/langgraph/prompts/basic-qa.system.prompt';
import { ConversationContextLoaderService } from './long-context/conversation-context-loader.service';
import { ContextCompactionQueueService } from './long-context/context-compaction-queue.service';

/**
 * 请求体未走全局 `ValidationPipe` 时，布尔与字符串可能混用；仅将明确的 true、字符串 "true" / "1" 等视为开启联网。
 */
function isWebSearchRequestEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' || s === 'on';
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return false;
}

function isLikelyResumeEditIntent(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return /修改|编辑|更新|新增|添加|创建|删除|重排|排序|调整|改一下|改成|修正|润色/u.test(
    normalized,
  );
}

function hasResumeWriteToolCall(toolEvents: unknown[]): boolean {
  if (!toolEvents.length) {
    return false;
  }
  const payloadText = JSON.stringify(toolEvents).toLowerCase();
  return (
    payloadText.includes('apply_section_content') ||
    payloadText.includes('create_section')
  );
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly langgraph: LanggraphService,
    private readonly conversationContextLoader: ConversationContextLoaderService,
    private readonly contextCompactionQueue: ContextCompactionQueueService,
  ) {}

  private writeSse(res: Response, event: string, data: unknown) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private async createChatLogFile(params: {
    conversationId: number;
    threadId: string;
  }): Promise<string | null> {
    try {
      const dir = join(process.cwd(), 'docs', 'chat-logs');
      await mkdir(dir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const threadSafe = params.threadId.replace(/[^a-zA-Z0-9_-]/g, '_');
      return join(
        dir,
        `${ts}-conv-${params.conversationId}-thread-${threadSafe}.jsonl`,
      );
    } catch (error) {
      this.logger.warn(
        `createChatLogFile failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async appendChatLog(
    logFilePath: string | null,
    entry: Record<string, unknown>,
  ): Promise<void> {
    if (!logFilePath) {
      return;
    }
    try {
      await appendFile(
        logFilePath,
        `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`,
        'utf8',
      );
    } catch (error) {
      this.logger.warn(
        `appendChatLog failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 未带 conversationId 的「新会话首条」时：用 LLM 起标题并写库；失败时用首条内容截断兜底（仍写库），供列表与 meta 展示。
   */
  private async resolveAndPersistNewConversationTitle(
    params: SendAiChatDto,
    newConversationId: number,
  ): Promise<string | null> {
    if (params.conversationId != null) {
      return null;
    }
    let title = await this.langgraph.generateConversationTitle(
      params.userMessage,
    );
    if (!title) {
      const t = params.userMessage.trim();
      if (t) {
        title = t.length > 40 ? `${t.slice(0, 40)}…` : t;
      }
    }
    if (title) {
      await this.prisma.aiConversation.update({
        where: { id: newConversationId },
        data: { title },
      });
    }
    return title;
  }

  private async assertResumeOwned(resumeId: number, jwt: IJwtPayload) {
    const r = await this.prisma.resume.findFirst({
      where: { id: resumeId, userId: jwt.id },
      select: { id: true },
    });
    if (!r) {
      throw new NotFoundException('简历不存在');
    }
  }

  private async assertConversationForUser(
    conversationId: number,
    jwt: IJwtPayload,
  ) {
    const c = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, resume: { userId: jwt.id } },
    });
    if (!c) {
      throw new NotFoundException('对话不存在');
    }
    return c;
  }

  async listConversations(
    params: ListAiConversationDto,
    jwt: IJwtPayload,
  ): Promise<ListAiConversationDataDto> {
    const { filter, pagination } = params;
    const { page, pageSize } = pagination;
    await this.assertResumeOwned(filter.resumeId, jwt);

    const where: Prisma.AiConversationWhereInput = {
      resumeId: filter.resumeId,
      resume: { userId: jwt.id },
      ...(filter.status !== undefined ? { status: filter.status } : {}),
      ...(filter.purpose !== undefined ? { purpose: filter.purpose } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.aiConversation.findMany({
        where,
        orderBy: [{ lastMsgAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiConversation.count({ where }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total },
    };
  }

  async createConversation(params: CreateAiConversationDto, jwt: IJwtPayload) {
    await this.assertResumeOwned(params.resumeId, jwt);
    const purpose = params.purpose ?? AiConversationPurpose.BASIC_QA;
    return this.prisma.aiConversation.create({
      data: {
        resumeId: params.resumeId,
        purpose,
        threadId: randomUUID(),
        title: params.title ?? null,
      },
    });
  }

  async getConversation(params: GetAiConversationDto, jwt: IJwtPayload) {
    const c = await this.prisma.aiConversation.findFirst({
      where: { id: params.id, resume: { userId: jwt.id } },
      include: {
        messages: {
          orderBy: { seq: 'asc' },
          include: { toolCalls: true },
        },
      },
    });
    if (!c) {
      throw new NotFoundException('对话不存在');
    }
    return c;
  }

  async updateConversation(params: UpdateAiConversationDto, jwt: IJwtPayload) {
    await this.assertConversationForUser(params.id, jwt);
    return this.prisma.aiConversation.update({
      where: { id: params.id },
      data: {
        ...(params.title !== undefined ? { title: params.title } : {}),
        ...(params.status !== undefined ? { status: params.status } : {}),
      },
    });
  }

  async deleteConversation(params: DeleteAiConversationDto, jwt: IJwtPayload) {
    await this.assertConversationForUser(params.id, jwt);
    return this.prisma.aiConversation.delete({
      where: { id: params.id },
    });
  }

  async listMessages(
    params: ListAiMessageDto,
    jwt: IJwtPayload,
  ): Promise<ListAiMessageDataDto> {
    const { filter, pagination } = params;
    const { page, pageSize } = pagination;
    await this.assertConversationForUser(filter.conversationId, jwt);

    const where = { conversationId: filter.conversationId };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.aiMessage.findMany({
        where,
        orderBy: { seq: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { toolCalls: true },
      }),
      this.prisma.aiMessage.count({ where }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total },
    };
  }

  async listGlobalContexts(
    params: ListAiGlobalContextDto,
    jwt: IJwtPayload,
  ): Promise<ListAiGlobalContextDataDto> {
    const { filter, pagination } = params;
    const { page, pageSize } = pagination;
    await this.assertResumeOwned(filter.resumeId, jwt);

    const where = { resumeId: filter.resumeId };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.aiGlobalContext.findMany({
        where,
        orderBy: { key: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiGlobalContext.count({ where }),
    ]);

    return {
      list,
      pagination: { page, pageSize, total },
    };
  }

  async upsertGlobalContext(
    params: UpsertAiGlobalContextDto,
    jwt: IJwtPayload,
  ) {
    await this.assertResumeOwned(params.resumeId, jwt);
    return this.prisma.aiGlobalContext.upsert({
      where: {
        resumeId_key: { resumeId: params.resumeId, key: params.key },
      },
      create: {
        resumeId: params.resumeId,
        key: params.key,
        value: params.value,
      },
      update: { value: params.value },
    });
  }

  async deleteGlobalContext(
    params: DeleteAiGlobalContextDto,
    jwt: IJwtPayload,
  ) {
    await this.assertResumeOwned(params.resumeId, jwt);
    const existing = await this.prisma.aiGlobalContext.findUnique({
      where: {
        resumeId_key: { resumeId: params.resumeId, key: params.key },
      },
    });
    if (!existing) {
      throw new NotFoundException('全局上下文不存在');
    }
    return this.prisma.aiGlobalContext.delete({
      where: { id: existing.id },
    });
  }

  /**
   * 同步基础问答：落库用户消息 + 占位助手回复；后续在此接入 LangGraph / 百炼流式。
   */
  async sendChat(
    params: SendAiChatDto,
    jwt: IJwtPayload,
  ): Promise<SendAiChatDataDto> {
    const { resumeId, userMessage, selectedSectionIds, enableWebSearch } =
      params;
    await this.assertResumeOwned(resumeId, jwt);
    const webOn = isWebSearchRequestEnabled(enableWebSearch);

    const userTurnMeta: Prisma.InputJsonValue = {
      kind: 'user_turn',
      selectedSectionIds: selectedSectionIds ?? [],
      enableWebSearch: webOn,
    };

    const out = await this.prisma.$transaction(async (tx) => {
      let conversation = params.conversationId
        ? await tx.aiConversation.findFirst({
            where: {
              id: params.conversationId,
              resumeId,
              resume: { userId: jwt.id },
            },
          })
        : null;

      if (params.conversationId && !conversation) {
        throw new NotFoundException('对话不存在');
      }

      if (!conversation) {
        const purpose = params.purpose ?? AiConversationPurpose.BASIC_QA;
        conversation = await tx.aiConversation.create({
          data: {
            resumeId,
            purpose,
            threadId: randomUUID(),
            title: null,
          },
        });
      } else if (
        params.purpose !== undefined &&
        params.purpose !== conversation.purpose
      ) {
        conversation = await tx.aiConversation.update({
          where: { id: conversation.id },
          data: { purpose: params.purpose },
        });
      }

      const last = await tx.aiMessage.findFirst({
        where: { conversationId: conversation.id },
        orderBy: { seq: 'desc' },
        select: { seq: true },
      });
      const baseSeq = (last?.seq ?? -1) + 1;

      const userMsg = await tx.aiMessage.create({
        data: {
          conversationId: conversation.id,
          seq: baseSeq,
          role: AiMessageRole.user,
          text: userMessage,
          contentJson: userTurnMeta,
        },
        include: { toolCalls: true },
      });

      const placeholder =
        '【占位】模型与 LangGraph 编排尚未接入。用户消息已保存，可继续在此线程上接入百炼与工具链。';

      const assistantMsg = await tx.aiMessage.create({
        data: {
          conversationId: conversation.id,
          seq: baseSeq + 1,
          role: AiMessageRole.assistant,
          text: placeholder,
          providerMeta: { placeholder: true } as Prisma.InputJsonValue,
        },
        include: { toolCalls: true },
      });

      await tx.aiConversation.update({
        where: { id: conversation.id },
        data: { lastMsgAt: new Date() },
      });

      return {
        conversationId: conversation.id,
        threadId: conversation.threadId,
        selectedSectionIds: selectedSectionIds ?? [],
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      };
    });

    await this.resolveAndPersistNewConversationTitle(
      params,
      out.conversationId,
    );
    return out;
  }

  /**
   * SSE：LangGraph `streamMode: ["messages","tools"]` → message / reasoning / tool 事件；
   * 用户消息先落库，流结束后写入助手整段文本。
   */
  async streamChat(params: SendAiChatDto, jwt: IJwtPayload, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let conversationId = 0;
    let threadId = '';
    const webSearchOn = isWebSearchRequestEnabled(params.enableWebSearch);
    let logFilePath: string | null = null;
    const toolEvents: unknown[] = [];
    let streamFailureReason = '';
    let clientDisconnected = false;
    let assistantText = '';
    let streamOk = true;

    res.on('close', () => {
      clientDisconnected = true;
    });

    try {
      await this.assertResumeOwned(params.resumeId, jwt);

      const { conversation, userMsg } = await this.prisma.$transaction(
        async (tx) => {
          let conversation = params.conversationId
            ? await tx.aiConversation.findFirst({
                where: {
                  id: params.conversationId,
                  resumeId: params.resumeId,
                  resume: { userId: jwt.id },
                },
              })
            : null;

          if (params.conversationId && !conversation) {
            throw new NotFoundException('对话不存在');
          }

          if (!conversation) {
            const purpose = params.purpose ?? AiConversationPurpose.BASIC_QA;
            conversation = await tx.aiConversation.create({
              data: {
                resumeId: params.resumeId,
                purpose,
                threadId: randomUUID(),
                title: null,
              },
            });
          } else if (
            params.purpose !== undefined &&
            params.purpose !== conversation.purpose
          ) {
            conversation = await tx.aiConversation.update({
              where: { id: conversation.id },
              data: { purpose: params.purpose },
            });
          }

          const last = await tx.aiMessage.findFirst({
            where: { conversationId: conversation.id },
            orderBy: { seq: 'desc' },
            select: { seq: true },
          });
          const baseSeq = (last?.seq ?? -1) + 1;

          const userTurnMeta: Prisma.InputJsonValue = {
            kind: 'user_turn',
            selectedSectionIds: params.selectedSectionIds ?? [],
            enableWebSearch: webSearchOn,
            stream: true,
          };

          const userMsg = await tx.aiMessage.create({
            data: {
              conversationId: conversation.id,
              seq: baseSeq,
              role: AiMessageRole.user,
              text: params.userMessage,
              contentJson: userTurnMeta,
            },
            include: { toolCalls: true },
          });

          await tx.aiConversation.update({
            where: { id: conversation.id },
            data: { lastMsgAt: new Date() },
          });

          return { conversation, userMsg };
        },
      );

      conversationId = conversation.id;
      threadId = conversation.threadId;
      logFilePath = await this.createChatLogFile({ conversationId, threadId });
      await this.appendChatLog(logFilePath, {
        kind: 'request',
        conversationId,
        threadId,
        resumeId: params.resumeId,
        userId: jwt.id,
        purpose: conversation.purpose,
        enableWebSearch: webSearchOn,
        selectedSectionIds: params.selectedSectionIds ?? [],
        userMessage: params.userMessage,
      });

      const metaTitle = await this.resolveAndPersistNewConversationTitle(
        params,
        conversationId,
      );

      this.writeSse(res, 'meta', {
        phase: 'meta',
        conversationId,
        payload: {
          threadId,
          userMessageId: userMsg.id,
          ...(metaTitle != null && metaTitle.length > 0
            ? { title: metaTitle }
            : {}),
        },
      });

      const sessionWindow =
        await this.conversationContextLoader.loadForTurn(conversationId);

      const systemPrompt = await buildBasicQaSystemPrompt(
        this.prisma,
        params.resumeId,
        jwt,
        {
          conversationId,
          selectedSectionIds: params.selectedSectionIds,
          enableWebSearch: webSearchOn,
          purpose: conversation.purpose,
          preloadedSessionSummary: {
            rollingSummary: sessionWindow.rollingSummary,
            coversUpToSeq: sessionWindow.coversUpToSeq,
          },
        },
      );
      await this.appendChatLog(logFilePath, {
        kind: 'system_prompt',
        conversationId,
        text: systemPrompt,
      });

      const historyMessages = mapDbMessagesToRoles(sessionWindow.rows);

      void this.contextCompactionQueue
        .tryEnqueueCompactionJob(conversationId)
        .catch((err: unknown) => {
          this.logger.warn(
            `context compaction enqueue (non-fatal): ${err instanceof Error ? err.message : String(err)}`,
          );
        });

      for await (const ev of this.langgraph.streamBasicQa({
        threadId,
        conversationId,
        systemPrompt,
        resumeId: params.resumeId,
        userId: jwt.id,
        purpose: conversation.purpose,
        userMessage: params.userMessage,
        suggestedSectionIds: params.selectedSectionIds,
        enableWebSearch: webSearchOn,
        historyMessages,
      })) {
        if (clientDisconnected) {
          streamOk = false;
          streamFailureReason = 'client_disconnected';
          this.logger.warn(
            `streamChat aborted: client disconnected (conversationId=${String(conversationId)})`,
          );
          break;
        }
        if (ev.kind === 'error') {
          this.writeSse(res, 'error', {
            phase: 'error',
            deltaText: ev.message,
            conversationId,
          });
          streamOk = false;
          streamFailureReason = ev.message || 'langgraph_stream_error';
          break;
        }
        if (ev.kind === 'message') {
          assistantText += ev.deltaText;
          this.writeSse(res, 'message', {
            phase: 'message',
            deltaText: ev.deltaText,
            conversationId,
            payload: ev.payload,
          });
        } else if (ev.kind === 'reasoning') {
          this.writeSse(res, 'reasoning', {
            phase: 'reasoning',
            deltaText: ev.deltaText,
            conversationId,
            payload: ev.payload,
          });
        } else if (ev.kind === 'tool') {
          toolEvents.push(ev.payload);
          this.writeSse(res, 'tool', {
            phase: 'tool',
            conversationId,
            payload: ev.payload,
          });
        }
      }

      if (streamOk) {
        const wantsEdit = isLikelyResumeEditIntent(params.userMessage);
        const writeToolCalled = hasResumeWriteToolCall(toolEvents);
        let guardrailNote = '';
        if (
          wantsEdit &&
          conversation.purpose !== AiConversationPurpose.DIALOGUE_EDIT
        ) {
          guardrailNote = [
            '⚠️ 本轮会话模式为非编辑模式，后端未挂载写入工具。',
            '因此未对简历做任何修改；若要实际改简历，请将会话 purpose 切到 DIALOGUE_EDIT 后重试。',
          ].join('\n');
        } else if (
          wantsEdit &&
          conversation.purpose === AiConversationPurpose.DIALOGUE_EDIT &&
          !writeToolCalled
        ) {
          guardrailNote = [
            '⚠️ 本轮未检测到写入工具调用（`apply_section_content` / `create_section`）。',
            '因此并未真正修改简历；请重试并要求我先调用工具再反馈结果。',
          ].join('\n');
        }
        if (guardrailNote) {
          const noteDelta = `\n\n${guardrailNote}`;
          assistantText += noteDelta;
          this.writeSse(res, 'message', {
            phase: 'message',
            deltaText: noteDelta,
            conversationId,
            payload: { guardrail: true },
          });
        }

        const last = await this.prisma.aiMessage.findFirst({
          where: { conversationId },
          orderBy: { seq: 'desc' },
          select: { seq: true },
        });
        const assistantSeq = (last?.seq ?? -1) + 1;

        const assistantMsg = await this.prisma.aiMessage.create({
          data: {
            conversationId,
            seq: assistantSeq,
            role: AiMessageRole.assistant,
            text: assistantText || null,
            providerMeta: {
              source: 'langgraph',
              stream: true,
            } as Prisma.InputJsonValue,
          },
          include: { toolCalls: true },
        });

        await this.prisma.aiConversation.update({
          where: { id: conversationId },
          data: { lastMsgAt: new Date() },
        });

        this.writeSse(res, 'done', {
          phase: 'done',
          conversationId,
          payload: {
            threadId,
            assistantMessageId: assistantMsg.id,
          },
        });
        await this.appendChatLog(logFilePath, {
          kind: 'assistant_final',
          conversationId,
          assistantMessageId: assistantMsg.id,
          text: assistantText,
        });
        await this.appendChatLog(logFilePath, {
          kind: 'tool_calls',
          conversationId,
          count: toolEvents.length,
          payload: toolEvents,
        });
        await this.appendChatLog(logFilePath, {
          kind: 'done',
          conversationId,
          ok: true,
        });
      } else {
        await this.appendChatLog(logFilePath, {
          kind: 'terminated',
          conversationId,
          ok: false,
          reason: streamFailureReason || 'stream_not_completed',
          partialAssistantText: assistantText,
          toolCallCount: toolEvents.length,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'stream chat failed';
      streamFailureReason = message;
      this.writeSse(res, 'error', {
        phase: 'error',
        deltaText: message,
        ...(conversationId ? { conversationId } : {}),
      });
      await this.appendChatLog(logFilePath, {
        kind: 'exception',
        ok: false,
        reason: message,
        conversationId: conversationId || null,
        threadId: threadId || null,
        partialAssistantText: assistantText,
        toolCallCount: toolEvents.length,
      });
    } finally {
      res.end();
    }
  }
}
